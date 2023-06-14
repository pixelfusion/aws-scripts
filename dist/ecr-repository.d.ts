import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { StackConfig } from './configuration';
export interface EcrRepositoryStackProps extends cdk.NestedStackProps {
    stack: StackConfig;
    service: string;
    removalPolicy?: cdk.RemovalPolicy;
}
/**
 * Creates an ECR repository for uploading docker images to
 */
export declare class EcrRepositoryStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: EcrRepositoryStackProps);
}
