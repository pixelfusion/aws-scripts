import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { IIpAddresses } from 'aws-cdk-lib/aws-ec2/lib/ip-addresses'
import { Fn } from 'aws-cdk-lib'

export interface VpcProps extends cdk.NestedStackProps {
  ipAddresses?: IIpAddresses
}

/**
 * Makes a Ipv6 VPC
 */
class Ipv6vpc extends ec2.Vpc {
  public egressOnlyInternetGatewayId!: string;

  constructor(scope: Construct, id: string, props?: VpcProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add("Name", this.node.path);

    // Associate an IPv6 ::/56 CIDR block with our VPC
    const cfnVpcCidrBlock = new ec2.CfnVPCCidrBlock(this, "Ipv6Cidr", {
      vpcId: this.vpcId,
      amazonProvidedIpv6CidrBlock: true,
    });

    const vpcIpv6CidrBlock = Fn.select(0, this.vpcIpv6CidrBlocks);

    // Slice our ::/56 CIDR block into 256 chunks of ::/64 CIDRs
    const subnetIpv6CidrBlocks = Fn.cidr(vpcIpv6CidrBlock, 256, "64");

    // Associate an IPv6 CIDR sub-block to each subnet
    [...this.publicSubnets, ...this.privateSubnets, ...this.isolatedSubnets].forEach((subnet, i) => {
      subnet.node.addDependency(cfnVpcCidrBlock);
      const cfnSubnet = subnet.node.defaultChild as ec2.CfnSubnet;
      cfnSubnet.ipv6CidrBlock = Fn.select(i, subnetIpv6CidrBlocks);
      cfnSubnet.assignIpv6AddressOnCreation = true;
    });

    // Add default IPv6 routes function
    const addDefaultIpv6Routes = (subnets: ec2.ISubnet[], gatewayId: string, routerType: ec2.RouterType) => {
      subnets.forEach((subnet) => {
        (subnet as ec2.Subnet).addRoute("Default6Route", {
          routerType: routerType,
          routerId: gatewayId,
          destinationIpv6CidrBlock: "::/0",
          enablesInternetConnectivity: true,
        });
      });
    };

    // For public subnets, ensure they have a route to the internet gateway
    if (this.internetGatewayId) {
      addDefaultIpv6Routes(this.publicSubnets, this.internetGatewayId, ec2.RouterType.GATEWAY);
    }

    // For private subnets, ensure there is an IPv6 egress gateway and they have a route to the egress gateway
    if (this.privateSubnets.length > 0) {
      const egressIgw = new ec2.CfnEgressOnlyInternetGateway(this, "EgressOnlyIGW", { vpcId: this.vpcId });
      this.egressOnlyInternetGatewayId = egressIgw.ref;

      addDefaultIpv6Routes(this.privateSubnets, egressIgw.ref, ec2.RouterType.EGRESS_ONLY_INTERNET_GATEWAY);
    }
  }
}
