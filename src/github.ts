import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'

export interface GithubDeployStackProps extends cdk.NestedStackProps {
  secretName?: string
}

/**
 * Stack to generate a GitHub deployer, along with key and secret for loading into GitHub secrets
 */
export class GithubDeployStack extends cdk.NestedStack {
  public readonly githubActionsUserAccessKey: iam.CfnAccessKey

  constructor(scope: Construct, id: string, props: GithubDeployStackProps) {
    super(scope, id, props)
    const { secretName = 'bootstrap/github' } = props || {}

    // Create IAM user
    const githubDeployUser = new iam.User(this, 'GithubDeployUser', {
      path: '/',
    })

    // Attach policies to the user
    const adminPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['*'],
          resources: ['*'],
        }),
      ],
    })

    githubDeployUser.attachInlinePolicy(
      new iam.Policy(this, 'GithubActionsAdministrator', {
        policyName: 'GithubActionsAdministrator',
        document: adminPolicy,
      }),
    )

    // Create access key for the user
    this.githubActionsUserAccessKey = new iam.CfnAccessKey(
      this,
      'GithubActionsUserAccessKey',
      {
        userName: githubDeployUser.userName,
      },
    )

    // Store key in secret manager
    new secretsmanager.Secret(this, 'GithubActionsUserSecret', {
      secretName,
      secretStringValue: cdk.SecretValue.unsafePlainText(
        JSON.stringify({
          AWS_USER_NAME: this.githubActionsUserAccessKey.userName,
          AWS_ACCESS_KEY_ID: this.githubActionsUserAccessKey.ref,
          AWS_SECRET_ACCESS_KEY:
            this.githubActionsUserAccessKey.attrSecretAccessKey,
        }),
      ),
    })
  }
}
