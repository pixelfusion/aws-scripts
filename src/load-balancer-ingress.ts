import { isIP } from 'net'
import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { CLOUDFLARE_CIDRS } from './cloudflare-ips'

/**
 * Who may connect to the load balancer listeners (HTTP 80 and HTTPS 443).
 *
 * - `Open`: no IP restriction. This is the default and matches previous behaviour.
 * - `Cloudflare`: only Cloudflare's published IPv4 and IPv6 ranges.
 * - `Cidr`: only the ranges passed in `loadBalancerCidrs`.
 */
export const LOAD_BALANCER_INGRESS = {
  Open: 'open',
  Cloudflare: 'cloudflare',
  Cidr: 'cidr',
} as const

export type LoadBalancerIngress =
  (typeof LOAD_BALANCER_INGRESS)[keyof typeof LOAD_BALANCER_INGRESS]

/** Default inbound rules per security group. */
const RULES_PER_SECURITY_GROUP = 60

/** Application load balancers accept at most five security groups. */
const MAX_LOAD_BALANCER_SECURITY_GROUPS = 5

export function resolveLoadBalancerCidrs(
  ingress: LoadBalancerIngress,
  cidrs: string[] | undefined,
): string[] | undefined {
  if (ingress === LOAD_BALANCER_INGRESS.Open) {
    if (cidrs !== undefined) {
      throw new Error(
        `loadBalancerCidrs is only used when loadBalancerIngress is "${LOAD_BALANCER_INGRESS.Cidr}"`,
      )
    }
    return undefined
  }

  if (ingress === LOAD_BALANCER_INGRESS.Cloudflare) {
    if (cidrs !== undefined) {
      throw new Error(
        `loadBalancerCidrs cannot be combined with loadBalancerIngress "${LOAD_BALANCER_INGRESS.Cloudflare}"`,
      )
    }
    return CLOUDFLARE_CIDRS
  }

  if (!cidrs || cidrs.length === 0) {
    throw new Error(
      `loadBalancerCidrs must contain at least one CIDR when loadBalancerIngress is "${LOAD_BALANCER_INGRESS.Cidr}"`,
    )
  }

  const normalized = cidrs.map(normalizeCidr)
  return [...new Set(normalized)]
}

/**
 * Allow `cidrs` to reach the load balancer on `ports`, and nothing else.
 * The listeners must be created with `openListener: false` so the default
 * 0.0.0.0/0 rule is not added.
 *
 * Rules are split across extra security groups when one group cannot hold them.
 */
export function restrictLoadBalancerIngress(
  scope: Construct,
  loadBalancer: elb.ApplicationLoadBalancer,
  vpc: ec2.IVpc,
  cidrs: string[],
  ports: number[],
): void {
  const rules = cidrs.flatMap((cidr) =>
    ports.map((port) => ({
      cidr,
      peer: cidr.includes(':') ? ec2.Peer.ipv6(cidr) : ec2.Peer.ipv4(cidr),
      port: ec2.Port.tcp(port),
    })),
  )

  const groupsNeeded = Math.ceil(rules.length / RULES_PER_SECURITY_GROUP)
  if (groupsNeeded > MAX_LOAD_BALANCER_SECURITY_GROUPS) {
    throw new Error(
      `Load balancer ingress needs ${groupsNeeded} security groups for ${rules.length} rules, but an application load balancer accepts at most ${MAX_LOAD_BALANCER_SECURITY_GROUPS}`,
    )
  }

  const [primary] = loadBalancer.connections.securityGroups
  if (!primary) {
    throw new Error('Load balancer has no security group to restrict')
  }

  const groups: ec2.ISecurityGroup[] = [primary]
  for (let index = 1; index < groupsNeeded; index++) {
    const extra = new ec2.SecurityGroup(scope, `LoadBalancerIngress${index}`, {
      vpc,
      description: 'Additional load balancer listener ingress',
      allowAllOutbound: true,
    })
    loadBalancer.addSecurityGroup(extra)
    groups.push(extra)
  }

  rules.forEach((rule, index) => {
    const group = groups[Math.floor(index / RULES_PER_SECURITY_GROUP)]
    group.addIngressRule(
      rule.peer,
      rule.port,
      `Allow TCP ${rule.port} from ${rule.cidr}`,
    )
  })
}

function normalizeCidr(input: string): string {
  const cidr = input.trim()
  if (cidr.includes(':')) {
    const withPrefix = cidr.includes('/') ? cidr : `${cidr}/128`
    if (!isCidr(withPrefix, 6, 128)) {
      throw new Error(`Invalid IPv6 CIDR: ${input}`)
    }
    return withPrefix.toLowerCase()
  }

  const withPrefix = cidr.includes('/') ? cidr : `${cidr}/32`
  if (!isCidr(withPrefix, 4, 32)) {
    throw new Error(`Invalid IPv4 CIDR: ${input}`)
  }
  return withPrefix
}

function isCidr(cidr: string, version: 4 | 6, maxPrefix: number): boolean {
  const slash = cidr.lastIndexOf('/')
  if (slash <= 0) {
    return false
  }
  const address = cidr.slice(0, slash)
  const prefixText = cidr.slice(slash + 1)
  if (!/^\d{1,3}$/.test(prefixText)) {
    return false
  }
  const prefix = Number(prefixText)
  return isIP(address) === version && prefix <= maxPrefix
}
