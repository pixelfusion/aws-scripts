import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { NestedStackProps } from './configuration';
/**
 * Stack to generate a GitHub deployer, along with key and secret for loading into GitHub secrets
 */
export declare class GithubDeployStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: NestedStackProps);
}
