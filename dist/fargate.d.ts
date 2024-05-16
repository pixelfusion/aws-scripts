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
    /**
     * Set to "default" to run a default image instead of
     * using the provided repository
     */
    imageVersion?: string | 'default';
    stack: StackConfig;
    cluster: ecs.ICluster;
    certificate: acm.ICertificate;
    zone: route53.IHostedZone;
    repository: ecr.IRepository;
    taskConfiguration: TaskConfiguration;
}
/**
 * Generate a fargate service that can be attached to a cluster. This service will include its own
 * load balancer.
 */
export declare class FargateService extends cdk.NestedStack {
    readonly service: ecs_patterns.ApplicationLoadBalancedFargateService;
    constructor(scope: Construct, id: string, props: FargateServiceProps);
}
export {};
