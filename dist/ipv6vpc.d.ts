import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
/**
 * Makes a Ipv6 VPC
 */
export declare class Ipv6vpc extends ec2.Vpc {
    egressOnlyInternetGatewayId: string;
    constructor(scope: Construct, id: string, props?: ec2.VpcProps);
}
