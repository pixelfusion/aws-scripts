import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StackConfig } from './configuration';
import * as route53 from 'aws-cdk-lib/aws-route53';
export interface ARecordProps extends cdk.NestedStackProps {
    subDomainIncludingDot?: string;
    stack: StackConfig;
    zone: route53.IHostedZone;
    target: route53.RecordTarget;
}
/**
 * Create A-record to any resource
 */
export declare class ARecord extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: ARecordProps);
}
