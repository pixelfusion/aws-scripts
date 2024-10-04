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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ipv6vpc = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const aws_cdk_lib_1 = require("aws-cdk-lib");
/**
 * Makes a Ipv6 VPC
 */
class Ipv6vpc extends ec2.Vpc {
    constructor(scope, id, props) {
        super(scope, id, props);
        cdk.Tags.of(this).add('Name', this.node.path);
        // Associate an IPv6 ::/56 CIDR block with our VPC
        const cfnVpcCidrBlock = new ec2.CfnVPCCidrBlock(this, `${id}Ipv6Cidr`, {
            vpcId: this.vpcId,
            amazonProvidedIpv6CidrBlock: true,
        });
        const vpcIpv6CidrBlock = aws_cdk_lib_1.Fn.select(0, this.vpcIpv6CidrBlocks);
        // Slice our ::/56 CIDR block into 256 chunks of ::/64 CIDRs
        const subnetIpv6CidrBlocks = aws_cdk_lib_1.Fn.cidr(vpcIpv6CidrBlock, 256, '64');
        [
            ...this.publicSubnets,
            ...this.privateSubnets,
            ...this.isolatedSubnets,
        ].forEach((subnet, i) => {
            subnet.node.addDependency(cfnVpcCidrBlock);
            const cfnSubnet = subnet.node.defaultChild;
            cfnSubnet.ipv6CidrBlock = aws_cdk_lib_1.Fn.select(i, subnetIpv6CidrBlocks);
            cfnSubnet.assignIpv6AddressOnCreation = true;
        });
        // Add default IPv6 routes function
        const addDefaultIpv6Routes = (subnets, gatewayId, routerType) => {
            subnets.forEach((subnet) => {
                ;
                subnet.addRoute('Default6Route', {
                    routerType: routerType,
                    routerId: gatewayId,
                    destinationIpv6CidrBlock: '::/0',
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
            const egressIgw = new ec2.CfnEgressOnlyInternetGateway(this, `${id}EgressOnlyIGW`, { vpcId: this.vpcId });
            this.egressOnlyInternetGatewayId = egressIgw.ref;
            addDefaultIpv6Routes(this.privateSubnets, egressIgw.ref, ec2.RouterType.EGRESS_ONLY_INTERNET_GATEWAY);
        }
    }
}
exports.Ipv6vpc = Ipv6vpc;
