import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { StackConfig } from './configuration';
export interface BuildPipelineProps extends cdk.NestedStackProps {
    githubRepositoryOwner: string;
    githubRepositoryName: string;
    githubBranchName: string;
    buildProjectImage?: string;
    webhookSecretName?: string;
    webhookSecretKey?: string;
    githubAccessTokenSecretName?: string;
    githubAccessTokenSecretKey?: string;
    stack: StackConfig;
    environment: Record<string, string>;
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
export declare class BuildPipeline extends cdk.NestedStack {
    readonly buildProject: codebuild.PipelineProject;
    readonly codePipeline: codepipeline.Pipeline;
    readonly externalWebhook: codepipeline.CfnWebhook;
    constructor(scope: Construct, id: string, props: BuildPipelineProps);
}
