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
    constructor(scope, id, props, stack, environment) {
        const newProps = { ...props, parameters: { ...props.parameters } };
        const environmentKeys = Object.keys(environment);
        // Dynamically create a bunch of parameters for environments
        environmentKeys.forEach((environmentKey, index) => {
            const paramKeyName = `Environment${index + 1}Key`;
            const paramValueName = `Environment${index + 1}Value`;
            newProps.parameters[paramKeyName] = environmentKey;
            newProps.parameters[paramValueName] = environment[environmentKey];
        });
        // Create
        super(scope, id, newProps);
        // Actually create these parameters now once constructor has been called
        const environmentVariables = {};
        environmentKeys.forEach((environmentKey, index) => {
            const key = new cdk.CfnParameter(this, `Environment${index + 1}Key`, {
                type: 'String',
                description: 'Name of custom environment value for this build project',
            });
            const value = new cdk.CfnParameter(this, `Environment${index + 1}Value`, {
                type: 'String',
                description: 'Value of custom environment value for this build project',
            });
            // Build environment variables for project
            environmentVariables[key.valueAsString] = {
                value: value.valueAsString,
            };
        });
        // Other parameters here
        const githubRepositoryOwner = new cdk.CfnParameter(this, `githubRepositoryOwner`, {
            type: 'String',
            description: 'Owner name of github repository',
        });
        const githubRepositoryName = new cdk.CfnParameter(this, `githubRepositoryName`, {
            type: 'String',
            description: 'Name of github repository',
        });
        const githubBranchName = new cdk.CfnParameter(this, `githubBranchName`, {
            type: 'String',
            description: 'Branch name to release from',
        });
        const buildProjectImage = new cdk.CfnParameter(this, `buildProjectImage`, {
            type: 'String',
            description: 'Codebuild image version',
            default: codebuild.LinuxBuildImage.STANDARD_7_0.imageId,
        });
        const webhookSecretName = new cdk.CfnParameter(this, `webhookSecretName`, {
            type: 'String',
            description: 'Name of secret key storing webhook tokens',
            default: stack.getSecretName('Pipeline'),
        });
        const webhookSecretKey = new cdk.CfnParameter(this, `webhookSecretKey`, {
            type: 'String',
            description: 'Key to use for getting external webhook secret token',
            default: 'secret',
        });
        const githubAccessTokenSecretName = new cdk.CfnParameter(this, 'githubAccessTokenSecretName', {
            type: 'String',
            description: 'Name of secret for storing github token',
            default: stack.getSecretName('GithubToken'),
        });
        const githubAccessTokenSecretKey = new cdk.CfnParameter(this, `githubAccessTokenSecretKey`, {
            type: 'String',
            description: 'Key to use for getting external github access token',
            default: 'secret',
        });
        // Get secrets
        const githubAccessTokenSecret = secretsmanager.Secret.fromSecretNameV2(this, 'WebhookAccessTokenSecret', githubAccessTokenSecretName.valueAsString);
        const webhookAccessTokenSecret = secretsmanager.Secret.fromSecretNameV2(this, 'WebhookAccessTokenSecret', webhookSecretName.valueAsString);
        const codePipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: 'MyPipeline',
        });
        const outputArtifact = new codepipeline.Artifact('Source');
        // GitHubbuild action
        const githubSourceAction = new codepipelineActions.GitHubSourceAction({
            actionName: 'SourceAction',
            owner: githubRepositoryOwner.valueAsString,
            repo: githubRepositoryName.valueAsString,
            branch: githubBranchName.valueAsString,
            output: outputArtifact,
            oauthToken: githubAccessTokenSecret.secretValueFromJson(githubAccessTokenSecretKey.valueAsString),
            trigger: aws_codepipeline_actions_1.GitHubTrigger.WEBHOOK,
        });
        codePipeline.addStage({
            stageName: 'Source',
            actions: [githubSourceAction],
        });
        // CodeBuild project
        const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
            projectName: 'MyBuildProject',
            environment: {
                buildImage: codebuild.LinuxBuildImage.fromCodeBuildImageId(buildProjectImage.valueAsString),
                environmentVariables,
            },
        });
        // Add external webhook
        new codepipeline.CfnWebhook(this, 'MyCfnWebhook', {
            authentication: 'UNAUTHENTICATED',
            authenticationConfiguration: {},
            filters: [
                {
                    jsonPath: '$.secret',
                    matchEquals: webhookAccessTokenSecret
                        .secretValueFromJson(webhookSecretKey.valueAsString)
                        .toString(),
                },
            ],
            targetAction: 'SourceAction',
            targetPipeline: codePipeline.pipelineName,
            targetPipelineVersion: 1,
        });
        // Add some basic default permissions
        buildProject.addToRolePolicy(new iam.PolicyStatement({
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
            project: buildProject,
            input: outputArtifact,
        });
        codePipeline.addStage({
            stageName: 'Build',
            actions: [codeBuildAction],
        });
        // Export pipeline ARN for use in the parent stack
        new cdk.CfnOutput(this, 'PipelineArn', {
            value: codePipeline.pipelineArn,
        });
    }
}
exports.BuildPipeline = BuildPipeline;
