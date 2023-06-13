import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { StackConfig } from './configuration';
interface EcrRepositoryStackProps extends cdk.NestedStackProps {
    stack: StackConfig;
    service: string;
}
/**
 * Creates an ECR repository for uploading docker images to
 */
export declare class EcrRepositoryStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: EcrRepositoryStackProps);
}
export {};
