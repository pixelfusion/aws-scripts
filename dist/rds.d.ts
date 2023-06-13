import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { StackConfig } from './configuration';
interface PostgresInstanceProps extends cdk.NestedStackProps {
    postgresFullVersion?: string;
    postgresMajorVersion?: string;
    stack: StackConfig;
    vpc: ec2.IVpc;
}
/**
 * Generate a postgres instance with secret keys and bastion server
 */
export declare class PostgresInstance extends cdk.NestedStack {
    protected readonly rdsInstance: rds.DatabaseInstance;
    constructor(scope: Construct, id: string, props: PostgresInstanceProps);
}
interface PostgresInstanceWithBastionProps extends PostgresInstanceProps {
    bastionSubdomainIncludingDot?: string;
    zone: route53.IHostedZone;
}
/**
 * RDS instance with bastion
 */
export declare class PostgresInstanceWithBastion extends PostgresInstance {
    constructor(scope: Construct, id: string, props: PostgresInstanceWithBastionProps);
}
export {};
