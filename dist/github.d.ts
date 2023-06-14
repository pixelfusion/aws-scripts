import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
/**
 * Stack to generate a GitHub deployer, along with key and secret for loading into GitHub secrets
 */
export declare class GithubDeployStack extends cdk.NestedStack {
    readonly githubActionsUserAccessKey: iam.CfnAccessKey;
    constructor(scope: Construct, id: string, props: cdk.NestedStackProps);
}
