import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { NestedStackProps, StackConfig } from './configuration';
/**
 * Generate a postgres instance with secret keys and bastion server
 */
export declare class PostgresInstance extends cdk.NestedStack {
    protected readonly rdsInstance: rds.DatabaseInstance;
    constructor(scope: Construct, id: string, props: NestedStackProps<{
        postgresFullVersion?: string;
        postgresMajorVersion?: string;
    }>, stack: StackConfig, vpc: ec2.IVpc);
}
/**
 * RDS instance with bastion
 */
export declare class PostgresInstanceWithBastion extends PostgresInstance {
    constructor(scope: Construct, id: string, props: NestedStackProps<{
        postgresFullVersion?: string;
        postgresMajorVersion?: string;
        bastionSubdomain?: string;
    }>, stack: StackConfig, vpc: ec2.IVpc, zone: route53.IHostedZone);
}
