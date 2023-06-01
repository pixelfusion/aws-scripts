import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NestedStackProps } from './configuration';

/**
 * Stack to generate a GitHub deployer, along with key and secret for loading into GitHub secrets
 */
export class GithubDeployStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: NestedStackProps) {
    super(scope, id, props);

    // Create IAM user
    const githubDeployUser = new iam.User(this, 'GithubDeployUser', {
      path: '/',
    });

    // Attach policies to the user
    const adminPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [ '*' ],
          resources: [ '*' ],
        }),
      ],
    });

    githubDeployUser.attachInlinePolicy(new iam.Policy(this, 'GithubActionsAdministrator', {
      policyName: 'GithubActionsAdministrator',
      document: adminPolicy,
    }));

    // Create access key for the user
    const githubActionsUserAccessKey = new iam.CfnAccessKey(this, 'GithubActionsUserAccessKey', {
      userName: githubDeployUser.userName,
    });

    new cdk.CfnOutput(this, 'StackName', {
      description: 'Stack name.',
      value: this.stackName,
    });

    new cdk.CfnOutput(this, 'GithubUserAccessKeyID', {
      description: `Value of AWS_ACCESS_KEY_ID for github secrets`,
      value: githubActionsUserAccessKey.ref,
    });

    new cdk.CfnOutput(this, 'GithubUserSecretAccessKey', {
      description: `Value of AWS_SECRET_ACCESS_KEY for github secrets`,
      value: githubActionsUserAccessKey.attrSecretAccessKey,
    });
  }
}