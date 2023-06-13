import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StackConfig } from './configuration';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import { ARecord, ARecordProps } from './route53';
interface WebsiteDistributionProps extends cdk.NestedStackProps {
    domainNames: string[];
    stack: StackConfig;
    certificate: acm.ICertificate;
    bucket: s3.IBucket;
}
/**
 * Generate a cloudfront distribution for serving content from an s3 bucket
 */
export declare class WebsiteDistribution extends cdk.NestedStack {
    readonly distribution: cf.IDistribution;
    constructor(scope: Construct, id: string, props: WebsiteDistributionProps);
}
interface WebsiteDistributionAliasProps extends Omit<ARecordProps, 'target'> {
    distribution: cf.IDistribution;
}
/**
 * Attach a route53 alias to this distribution
 */
export declare class WebsiteDistributionAlias extends ARecord {
    constructor(scope: Construct, id: string, props: WebsiteDistributionAliasProps);
}
export {};
