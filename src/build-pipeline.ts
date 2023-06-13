import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline'
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions'
import { GitHubTrigger } from 'aws-cdk-lib/aws-codepipeline-actions'
import * as codebuild from 'aws-cdk-lib/aws-codebuild'
import { BuildEnvironmentVariable } from 'aws-cdk-lib/aws-codebuild'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as iam from 'aws-cdk-lib/aws-iam'
import { StackConfig } from './configuration'

export interface BuildPipelineProps extends cdk.NestedStackProps {
  githubRepositoryOwner: string
  githubRepositoryName: string
  githubBranchName: string
  buildProjectImage?: string
  // Webhook secrets (external)
  webhookSecretName?: string
  webhookSecretKey?: string
  // Github access (source access + webhook)
  githubAccessTokenSecretName?: string
  githubAccessTokenSecretKey?: string
  // Args
  stack: StackConfig
  environment: Record<string, string>
}

/**
 * Generates a codebuild project with a pipeline.
 *
 * This stack will create:
 *  - a codebuild project with a set of environment valiables
 *  - a build pipeline
 *  - add a webhook that is registered with github automatically
 *  - add a second webhook that can be manually registered (e.g. with contentful)
 *
 *  All values passed to the "environment" parameter will be converted into a list
 *  of cloudformation parameter pairs, each with a name and value property.
 */
export class BuildPipeline extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: BuildPipelineProps) {
    // Create
    super(scope, id, props)

    const {
      stack,
      // Git details
      githubRepositoryOwner,
      githubRepositoryName,
      githubBranchName,
      // Secret keys
      webhookSecretName = stack.getSecretName('Pipeline'),
      webhookSecretKey = 'secret',
      githubAccessTokenSecretName = stack.getSecretName('GithubToken'),
      githubAccessTokenSecretKey = 'secret',
      // Args
      buildProjectImage = codebuild.LinuxBuildImage.STANDARD_7_0.imageId,
      environment = {},
    } = props

    // Actually create these parameters now once constructor has been called
    const environmentVariables: Record<string, BuildEnvironmentVariable> = {}
    Object.keys(environment).forEach((environmentKey) => {
      // Build environment variables for project
      environmentVariables[environmentKey] = {
        value: environment[environmentKey],
      }
    })

    // Get secrets
    const githubAccessTokenSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'GithubAccessTokenSecret',
      githubAccessTokenSecretName,
    ).secretValueFromJson(githubAccessTokenSecretKey)

    const webhookAccessTokenSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'WebhookAccessTokenSecret',
      webhookSecretName,
    ).secretValueFromJson(webhookSecretKey)

    const codePipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'MyPipeline',
    })

    const outputArtifact = new codepipeline.Artifact('Source')

    // GitHubbuild action
    const githubSourceAction = new codepipelineActions.GitHubSourceAction({
      actionName: 'SourceAction',
      owner: githubRepositoryOwner,
      repo: githubRepositoryName,
      branch: githubBranchName,
      output: outputArtifact,
      oauthToken: githubAccessTokenSecret,
      trigger: GitHubTrigger.WEBHOOK,
    })

    codePipeline.addStage({
      stageName: 'Source',
      actions: [githubSourceAction],
    })

    // CodeBuild project
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: 'MyBuildProject',
      environment: {
        buildImage:
          codebuild.LinuxBuildImage.fromCodeBuildImageId(buildProjectImage),
        environmentVariables,
      },
    })

    // Add external webhook
    new codepipeline.CfnWebhook(this, 'MyCfnWebhook', {
      authentication: 'UNAUTHENTICATED',
      authenticationConfiguration: {},
      filters: [
        {
          jsonPath: '$.secret',
          matchEquals: webhookAccessTokenSecret.unsafeUnwrap(),
        },
      ],
      targetAction: 'SourceAction',
      targetPipeline: codePipeline.pipelineName,
      targetPipelineVersion: 1,
    })

    // Add some basic default permissions
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'codecommit:*',
          'codedeploy:*',
          'codebuild:*',
          'secretsmanager:GetSecretValue',
          'cloudfront:CreateInvalidation',
          'ssm:GetParameters',
        ],
        resources: ['*'],
      }),
    )

    const codeBuildAction = new codepipelineActions.CodeBuildAction({
      actionName: 'CodeBuild',
      project: buildProject,
      input: outputArtifact,
    })

    codePipeline.addStage({
      stageName: 'Build',
      actions: [codeBuildAction],
    })

    // Export pipeline ARN for use in the parent stack
    new cdk.CfnOutput(this, 'PipelineArn', {
      value: codePipeline.pipelineArn,
    })
  }
}
