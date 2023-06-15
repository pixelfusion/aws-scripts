"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildPipeline = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const codepipeline = __importStar(require("aws-cdk-lib/aws-codepipeline"));
const codepipelineActions = __importStar(require("aws-cdk-lib/aws-codepipeline-actions"));
const aws_codepipeline_actions_1 = require("aws-cdk-lib/aws-codepipeline-actions");
const codebuild = __importStar(require("aws-cdk-lib/aws-codebuild"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
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
class BuildPipeline extends cdk.NestedStack {
    constructor(scope, id, props) {
        // Create
        super(scope, id, props);
        const { stack, 
        // Git details
        githubRepositoryOwner, githubRepositoryName, githubBranchName, 
        // Secret keys
        webhookSecretName = stack.getSecretName('pipeline'), webhookSecretKey = 'secret', githubAccessTokenSecretName = stack.getSecretName('githubtoken'), githubAccessTokenSecretKey = 'secret', 
        // Args
        buildProjectImage = codebuild.LinuxBuildImage.STANDARD_7_0.imageId, environment = {}, } = props;
        // Actually create these parameters now once constructor has been called
        const environmentVariables = {};
        Object.keys(environment).forEach((environmentKey) => {
            // Build environment variables for project
            environmentVariables[environmentKey] = {
                value: environment[environmentKey],
            };
        });
        // Get secrets
        const githubAccessTokenSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GithubAccessTokenSecret', githubAccessTokenSecretName).secretValueFromJson(githubAccessTokenSecretKey);
        const webhookAccessTokenSecret = secretsmanager.Secret.fromSecretNameV2(this, 'WebhookAccessTokenSecret', webhookSecretName).secretValueFromJson(webhookSecretKey);
        this.codePipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: 'MyPipeline',
        });
        const outputArtifact = new codepipeline.Artifact('Source');
        // GitHubbuild action
        const githubSourceAction = new codepipelineActions.GitHubSourceAction({
            actionName: 'SourceAction',
            owner: githubRepositoryOwner,
            repo: githubRepositoryName,
            branch: githubBranchName,
            output: outputArtifact,
            oauthToken: githubAccessTokenSecret,
            trigger: aws_codepipeline_actions_1.GitHubTrigger.WEBHOOK,
        });
        this.codePipeline.addStage({
            stageName: 'Source',
            actions: [githubSourceAction],
        });
        // CodeBuild project
        this.buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
            projectName: 'MyBuildProject',
            environment: {
                buildImage: codebuild.LinuxBuildImage.fromCodeBuildImageId(buildProjectImage),
                environmentVariables,
            },
        });
        // Add external webhook
        this.externalWebhook = new codepipeline.CfnWebhook(this, 'MyCfnWebhook', {
            authentication: 'UNAUTHENTICATED',
            authenticationConfiguration: {},
            filters: [
                {
                    jsonPath: '$.secret',
                    matchEquals: webhookAccessTokenSecret.unsafeUnwrap(),
                },
            ],
            targetAction: 'SourceAction',
            targetPipeline: this.codePipeline.pipelineName,
            targetPipelineVersion: 1,
        });
        // Add some basic default permissions
        this.buildProject.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'codecommit:*',
                'codedeploy:*',
                'codebuild:*',
                'secretsmanager:GetSecretValue',
                'cloudfront:CreateInvalidation',
                'ssm:GetParameters',
            ],
            resources: ['*'],
        }));
        const codeBuildAction = new codepipelineActions.CodeBuildAction({
            actionName: 'CodeBuild',
            project: this.buildProject,
            input: outputArtifact,
        });
        this.codePipeline.addStage({
            stageName: 'Build',
            actions: [codeBuildAction],
        });
        // Export pipeline ARN for use in the parent stack
        new cdk.CfnOutput(this, 'PipelineArn', {
            value: this.codePipeline.pipelineArn,
        });
        new cdk.CfnOutput(this, 'WebhookUrl', {
            value: this.externalWebhook.attrUrl,
        });
    }
}
exports.BuildPipeline = BuildPipeline;
