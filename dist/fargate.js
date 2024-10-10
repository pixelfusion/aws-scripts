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
exports.FargateService = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const ecs_patterns = __importStar(require("aws-cdk-lib/aws-ecs-patterns"));
const ssm = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const route53_1 = require("./route53");
// Default docker image to use
const DEFAULT_IMAGE = 'nginxdemos/hello:latest';
/**
 * Generate a fargate service that can be attached to a cluster. This service will include its own
 * load balancer.
 *
 * You can pass in either one of the below:
 * image and repository, repository, or nothing to use the default image
 * If you pass in image by itself you will need to ensure that the task has permission to pull from that repository.
 * If you pass in repository then the ECS will automatically have the permissions to pull from that repository.
 */
class FargateService extends cdk.NestedStack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { healthCheckPath = '/health-check', imageVersion = 'latest', subDomainIncludingDot = '', stack, cluster, certificate, zone, repository, taskConfiguration, createTimeout, updateTimeout, } = props;
        // Compile secrets into list of mapped ecs.Secrets
        const secrets = {};
        const secretValues = taskConfiguration.secrets;
        if (secretValues) {
            for (const [secretKey, value] of Object.entries(secretValues)) {
                if (value) {
                    // Convert from json string to ecs.Secret
                    const [secretName, fieldName] = value.split(':').slice(0, 2);
                    const secret = ssm.Secret.fromSecretNameV2(this, secretKey, secretName);
                    secrets[secretKey] = ecs.Secret.fromSecretsManager(secret, fieldName);
                }
            }
        }
        // Pick image
        const image = props.image ||
            (repository &&
                ecs.ContainerImage.fromEcrRepository(repository, imageVersion)) ||
            ecs.ContainerImage.fromRegistry(DEFAULT_IMAGE);
        const desiredCount = taskConfiguration?.desiredCount || 1;
        this.service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, stack.getResourceID('AdminService'), {
            assignPublicIp: true,
            cluster: cluster,
            certificate: certificate,
            redirectHTTP: true,
            memoryLimitMiB: taskConfiguration?.memoryLimitMiB || 512,
            healthCheckGracePeriod: taskConfiguration?.healthCheckGracePeriod || cdk.Duration.seconds(60),
            cpu: taskConfiguration?.cpu || 256,
            desiredCount,
            taskImageOptions: {
                image,
                environment: taskConfiguration?.environment || {},
                secrets,
            },
            taskSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
                onePerAz: true,
            },
        });
        // Extract the low-level CloudFormation resource for the Fargate Service
        const cfnService = this.service.service.node.defaultChild;
        // Add wait timeout for creation
        if (createTimeout) {
            cfnService.addPropertyOverride('CreationPolicy', {
                ResourceSignal: {
                    Timeout: createTimeout, // Timeout after 15 minutes
                },
            });
        }
        // Add wait timeout for updates
        if (updateTimeout) {
            cfnService.addPropertyOverride('UpdatePolicy', {
                AutoScalingRollingUpdate: {
                    MinInstancesInService: '1',
                    MaxBatchSize: '1',
                    PauseTime: updateTimeout,
                },
            });
        }
        // Setup AutoScaling policy
        if (taskConfiguration.autoScalingCpuTarget) {
            // Default max capacity to double desired unless specified
            const maxCapacity = taskConfiguration?.maxCount || desiredCount * 2;
            const minCapacity = taskConfiguration?.minCount || desiredCount;
            const scaling = this.service.service.autoScaleTaskCount({
                maxCapacity,
                minCapacity,
            });
            scaling.scaleOnCpuUtilization(stack.getResourceID('CpuScaling'), {
                targetUtilizationPercent: taskConfiguration.autoScalingCpuTarget,
                scaleInCooldown: cdk.Duration.seconds(60),
                scaleOutCooldown: cdk.Duration.seconds(60),
            });
        }
        // Hack to fix subnets issue
        // https://github.com/aws/aws-cdk/issues/5892#issuecomment-701993883
        const cfnLoadBalancer = this.service.loadBalancer.node
            .defaultChild;
        cfnLoadBalancer.subnets = cluster.vpc.selectSubnets({
            onePerAz: true,
            subnetType: ec2.SubnetType.PUBLIC,
        }).subnetIds;
        const taskDefinition = this.service.taskDefinition;
        if (repository) {
            taskDefinition.addToExecutionRolePolicy(new iam.PolicyStatement({
                actions: [
                    'ecr:GetAuthorizationToken',
                    'ecr:BatchCheckLayerAvailability',
                    'ecr:GetDownloadUrlForLayer',
                    'ecr:BatchGetImage',
                ],
                resources: [repository.repositoryArn],
            }));
        }
        // Allow secrets
        taskDefinition.addToExecutionRolePolicy(new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            resources: [`${stack.getSecretBaseArn()}/*`],
        }));
        // Health check
        this.service.targetGroup.configureHealthCheck({
            path: healthCheckPath,
        });
        // Alias
        new route53_1.ARecord(this, stack.getResourceID('Record'), {
            subDomainIncludingDot,
            target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(this.service.loadBalancer)),
            stack,
            zone,
        });
    }
}
exports.FargateService = FargateService;
