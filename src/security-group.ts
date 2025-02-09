import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'

export interface SecurityGroupProps extends cdk.NestedStackProps {
  vpc: ec2.IVpc
  incomingPorts?: number[]
}

/**
 * Default security group suitable for a basic ECS service
 */
export class SecurityGroup extends cdk.NestedStack {
  public readonly securityGroup: ec2.ISecurityGroup

  constructor(scope: Construct, id: string, props: SecurityGroupProps) {
    super(scope, id, props)
    const { vpc, incomingPorts } = props

    this.securityGroup = new ec2.SecurityGroup(this, `${id}Group`, {
      vpc,
      description: 'Allows HTTP/HTTPS ingress and all egress traffic',
      allowAllOutbound: true,
    })

    const portsToOpen = incomingPorts || [80, 443]

    // Open all selected ports
    portsToOpen.forEach((port) => {
      this.securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(port),
        `Allow ${port} from anywhere (IPv4)`,
      )
      this.securityGroup.addIngressRule(
        ec2.Peer.anyIpv6(),
        ec2.Port.tcp(port),
        `Allow ${port} from anywhere (IPv6)`,
      )
    })
  }
}
