import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
export interface SecurityGroupProps extends cdk.NestedStackProps {
    vpc: ec2.IVpc;
    incomingPorts?: number[];
}
/**
 * Default security group suitable for a basic ECS service
 */
export declare class SecurityGroup extends cdk.NestedStack {
    readonly securityGroup: ec2.ISecurityGroup;
    constructor(scope: Construct, id: string, props: SecurityGroupProps);
}
