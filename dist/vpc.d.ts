import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { IIpAddresses } from 'aws-cdk-lib/aws-ec2/lib/ip-addresses';
export interface VpcProps extends cdk.NestedStackProps {
    ipAddresses?: IIpAddresses;
    natGateways?: number;
}
/**
 * Makes a standard VPC with two public and two private subnets
 */
export declare class Vpc extends cdk.NestedStack {
    vpc: ec2.Vpc;
    constructor(scope: Construct, id: string, props: VpcProps);
}
