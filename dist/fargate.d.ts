import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { NestedStackProps, StackConfig } from './configuration';
/**
 * Represents a definition for a task that can be used to generate a task definition
 */
export type TaskConfiguration = {
    memoryLimitMiB?: number;
    cpu?: number;
    desiredCount?: number;
    environment?: Record<string, string>;
    secrets?: Record<string, string>;
};
/**
 * Generator for configuring ECS task definitions for a service
 */
export type EnvFactory = (stage: StackConfig, defaults: Record<string, string>) => TaskConfiguration;
/**
 * Generate a fargate service that can be attached to a cluster. This service will include its own
 * load balancer.
 */
export declare class FargateService extends cdk.NestedStack {
    readonly service: ecs_patterns.ApplicationLoadBalancedFargateService;
    constructor(scope: Construct, id: string, props: NestedStackProps<{
        subDomainWithoutDot?: string;
        healthCheckPath?: string;
    }>, stack: StackConfig, cluster: ecs.ICluster, certificate: acm.ICertificate, zone: route53.IHostedZone, repository: ecr.IRepository, version: string, taskConfiguration: TaskConfiguration);
}