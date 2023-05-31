import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { StackConfig } from "./configuration";
/**
 * Creates an ECR repository for uploading docker images to
 */
export declare class EcrRepositoryStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps, stack: StackConfig, service: string);
}
