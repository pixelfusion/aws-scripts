import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { StackConfig } from './configuration';
interface CertificateProps extends cdk.NestedStackProps {
    subDomainIncludingDot?: string;
    stack: StackConfig;
    zone: route53.IHostedZone;
}
/**
 * Generates an ACMS certificate
 */
export declare class Certificate extends cdk.NestedStack {
    readonly certificate: acm.ICertificate;
    constructor(scope: Construct, id: string, props: CertificateProps);
}
export {};
