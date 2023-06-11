import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { NestedStackProps, StackConfig } from './configuration';
/**
 * Creates an ECR repository for uploading docker images to
 */
export declare class EcrRepositoryStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: NestedStackProps, stack: StackConfig, service: string);
}
