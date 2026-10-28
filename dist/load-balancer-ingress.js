"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOAD_BALANCER_INGRESS = void 0;
exports.resolveLoadBalancerCidrs = resolveLoadBalancerCidrs;
exports.restrictLoadBalancerIngress = restrictLoadBalancerIngress;
const net_1 = require("net");
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const cloudflare_ips_1 = require("./cloudflare-ips");
/**
 * Who may connect to the load balancer listeners (HTTP 80 and HTTPS 443).
 *
 * - `Open`: no IP restriction. This is the default and matches previous behaviour.
 * - `Cloudflare`: only Cloudflare's published IPv4 and IPv6 ranges.
 * - `Cidr`: only the ranges passed in `loadBalancerCidrs`.
 */
exports.LOAD_BALANCER_INGRESS = {
    Open: 'open',
    Cloudflare: 'cloudflare',
    Cidr: 'cidr',
};
/** Default inbound rules per security group. */
const RULES_PER_SECURITY_GROUP = 60;
/** Application load balancers accept at most five security groups. */
const MAX_LOAD_BALANCER_SECURITY_GROUPS = 5;
function resolveLoadBalancerCidrs(ingress, cidrs) {
    if (ingress === exports.LOAD_BALANCER_INGRESS.Open) {
        if (cidrs !== undefined) {
            throw new Error(`loadBalancerCidrs is only used when loadBalancerIngress is "${exports.LOAD_BALANCER_INGRESS.Cidr}"`);
        }
        return undefined;
    }
    if (ingress === exports.LOAD_BALANCER_INGRESS.Cloudflare) {
        if (cidrs !== undefined) {
            throw new Error(`loadBalancerCidrs cannot be combined with loadBalancerIngress "${exports.LOAD_BALANCER_INGRESS.Cloudflare}"`);
        }
        return cloudflare_ips_1.CLOUDFLARE_CIDRS;
    }
    if (!cidrs || cidrs.length === 0) {
        throw new Error(`loadBalancerCidrs must contain at least one CIDR when loadBalancerIngress is "${exports.LOAD_BALANCER_INGRESS.Cidr}"`);
    }
    const normalized = cidrs.map(normalizeCidr);
    return [...new Set(normalized)];
}
/**
 * Allow `cidrs` to reach the load balancer on `ports`, and nothing else.
 * The listeners must be created with `openListener: false` so the default
 * 0.0.0.0/0 rule is not added.
 *
 * Rules are split across extra security groups when one group cannot hold them.
 */
function restrictLoadBalancerIngress(scope, loadBalancer, vpc, cidrs, ports) {
    const rules = cidrs.flatMap((cidr) => ports.map((port) => ({
        cidr,
        peer: cidr.includes(':') ? ec2.Peer.ipv6(cidr) : ec2.Peer.ipv4(cidr),
        port: ec2.Port.tcp(port),
    })));
    const groupsNeeded = Math.ceil(rules.length / RULES_PER_SECURITY_GROUP);
    if (groupsNeeded > MAX_LOAD_BALANCER_SECURITY_GROUPS) {
        throw new Error(`Load balancer ingress needs ${groupsNeeded} security groups for ${rules.length} rules, but an application load balancer accepts at most ${MAX_LOAD_BALANCER_SECURITY_GROUPS}`);
    }
    const [primary] = loadBalancer.connections.securityGroups;
    if (!primary) {
        throw new Error('Load balancer has no security group to restrict');
    }
    const groups = [primary];
    for (let index = 1; index < groupsNeeded; index++) {
        const extra = new ec2.SecurityGroup(scope, `LoadBalancerIngress${index}`, {
            vpc,
            description: 'Additional load balancer listener ingress',
            allowAllOutbound: true,
        });
        loadBalancer.addSecurityGroup(extra);
        groups.push(extra);
    }
    rules.forEach((rule, index) => {
        const group = groups[Math.floor(index / RULES_PER_SECURITY_GROUP)];
        group.addIngressRule(rule.peer, rule.port, `Allow TCP ${rule.port} from ${rule.cidr}`);
    });
}
function normalizeCidr(input) {
    const cidr = input.trim();
    if (cidr.includes(':')) {
        const withPrefix = cidr.includes('/') ? cidr : `${cidr}/128`;
        if (!isCidr(withPrefix, 6, 128)) {
            throw new Error(`Invalid IPv6 CIDR: ${input}`);
        }
        return withPrefix.toLowerCase();
    }
    const withPrefix = cidr.includes('/') ? cidr : `${cidr}/32`;
    if (!isCidr(withPrefix, 4, 32)) {
        throw new Error(`Invalid IPv4 CIDR: ${input}`);
    }
    return withPrefix;
}
function isCidr(cidr, version, maxPrefix) {
    const slash = cidr.lastIndexOf('/');
    if (slash <= 0) {
        return false;
    }
    const address = cidr.slice(0, slash);
    const prefixText = cidr.slice(slash + 1);
    if (!/^\d{1,3}$/.test(prefixText)) {
        return false;
    }
    const prefix = Number(prefixText);
    return (0, net_1.isIP)(address) === version && prefix <= maxPrefix;
}
