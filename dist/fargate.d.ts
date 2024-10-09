import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { StackConfig } from './configuration';
/**
 * Represents a definition for a task that can be used to generate a task definition
 */
export interface TaskConfiguration {
    memoryLimitMiB?: number;
    healthCheckGracePeriod?: cdk.Duration;
    cpu?: number;
    desiredCount?: number;
    autoScalingCpuTarget?: number;
    maxCount?: number;
    minCount?: number;
    environment?: Record<string, string>;
    secrets?: Record<string, string>;
}
/**
 * Generator for configuring ECS task definitions for a service
 */
export type EnvFactory = (stack: StackConfig, defaults: Record<string, string>) => TaskConfiguration;
interface FargateServiceProps extends cdk.NestedStackProps {
    subDomainIncludingDot?: string;
    healthCheckPath?: string;
    stack: StackConfig;
    cluster: ecs.ICluster;
    certificate: acm.ICertificate;
    zone: route53.IHostedZone;
    imageVersion?: string;
    repository?: ecr.IRepository;
    taskConfiguration: TaskConfiguration;
    image?: ecs.ContainerImage;
}
/**
 * Generate a fargate service that can be attached to a cluster. This service will include its own
 * load balancer.
 *
 * You can pass in either one of the below:
 * image and repository, repository, or nothing to use the default image
 * If you pass in image by itself you will need to ensure that the task has permission to pull from that repository.
 * If you pass in repository then the ECS will automatically have the permissions to pull from that repository.
 */
export declare class FargateService extends cdk.NestedStack {
    readonly service: ecs_patterns.ApplicationLoadBalancedFargateService;
    constructor(scope: Construct, id: string, props: FargateServiceProps);
}
export {};
