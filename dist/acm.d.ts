import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { StackConfig } from "./configuration";
/**
 * Generates an ACMS certificate
 */
export declare class Certificate extends cdk.NestedStack {
    readonly certificate: acm.Certificate;
    constructor(scope: Construct, id: string, props: cdk.NestedStackProps, stack: StackConfig, zone: route53.IHostedZone);
}
