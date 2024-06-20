import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import {
  StackConfig,
  GithubDeployStack,
  EcrRepositoryStack,
} from '@pixelfusion/aws-scripts'

/**
 * Bootstrap CI / CD environment by creating a github user and ECR for admin
 */
export class BootstrapStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps,
    stack: StackConfig,
  ) {
    super(scope, id, props)

    // Create deployer
    const githubDeployStack = new GithubDeployStack(
      this,
      stack.getResourceID('GithubDeploy'),
      {},
    )

    // Register admin ECR
    new EcrRepositoryStack(this, stack.getResourceID('EcrRepository'), {
      stack,
      service: 'Admin',
    })

    // Define the outputs in the parent stack
    new cdk.CfnOutput(this, 'GithubUserAccessKeyID', {
      description: 'Value of AWS_ACCESS_KEY_ID for github secrets',
      value: githubDeployStack.githubActionsUserAccessKey.ref,
    })

    new cdk.CfnOutput(this, 'GithubUserSecretAccessKey', {
      description: 'Value of AWS_SECRET_ACCESS_KEY for github secrets',
      value: githubDeployStack.githubActionsUserAccessKey.attrSecretAccessKey,
    })
  }
}
