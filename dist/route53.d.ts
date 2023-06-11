import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NestedStackProps, StackConfig } from './configuration';
import * as route53 from 'aws-cdk-lib/aws-route53';
/**
 * Create A-record to any resource
 */
export declare class ARecord extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: NestedStackProps<{
        subDomain?: string;
    }>, stack: StackConfig, zone: route53.IHostedZone, aliasTarget: route53.IAliasRecordTarget);
}
