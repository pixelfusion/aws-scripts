import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NestedStackProps, StackConfig } from './configuration';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { ARecord } from './route53';
/**
 * Generate a cloudfront distribution for serving content from an s3 bucket
 */
export declare class WebsiteDistribution extends cdk.NestedStack {
    readonly distribution: cf.IDistribution;
    constructor(scope: Construct, id: string, props: NestedStackProps<{
        domainNames?: string;
    }>, stack: StackConfig, certificate: acm.ICertificate, bucket: s3.IBucket);
}
/**
 * Attach a route53 alias to this distribution
 */
export declare class WebsiteDistributionAlias extends ARecord {
    constructor(scope: Construct, id: string, props: NestedStackProps<{
        subDomain?: string;
    }>, stack: StackConfig, zone: route53.IHostedZone, distribution: cf.IDistribution);
}
