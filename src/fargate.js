"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FargateService = void 0;
const cdk = require("aws-cdk-lib");
const ecs = require("aws-cdk-lib/aws-ecs");
const ecs_patterns = require("aws-cdk-lib/aws-ecs-patterns");
const ssm = require("aws-cdk-lib/aws-secretsmanager");
const iam = require("aws-cdk-lib/aws-iam");
const route53 = require("aws-cdk-lib/aws-route53");
const targets = require("aws-cdk-lib/aws-route53-targets");
/**
 * Generate a fargate service that can be attached to a cluster. This service will include its own
 * load balancer.
 */
class FargateService extends cdk.Stack {
    constructor(scope, id, props, stack, cluster, certificate, zone, repository, version, taskConfiguration, options) {
        super(scope, id, props);
        const subDomainWithoutDot = options?.subDomainWithoutDot ?? "";
        const healthCheckPath = options?.healthCheckPath ?? '/health-check';
        // Compile secrets into list of mapped ecs.Secrets
        const secrets = {};
        const secretValues = taskConfiguration.secrets;
        if (secretValues) {
            for (const secretKey in Object.keys(secretValues)) {
                // Convert from json string to ecs.Secret
                const value = secretValues[secretKey];
                const [secretName, fieldName] = value.split(':').slice(0, 2);
                const secret = ssm.Secret.fromSecretNameV2(this, secretKey, secretName);
                secrets[secretKey] = ecs.Secret.fromSecretsManager(secret, fieldName);
            }
        }
        this.service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, stack.getResourceID("AdminService"), {
            cluster: cluster,
            certificate: certificate,
            redirectHTTP: true,
            memoryLimitMiB: taskConfiguration?.memoryLimitMiB || 512,
            cpu: taskConfiguration?.cpu || 256,
            desiredCount: taskConfiguration?.desiredCount || 1,
            taskImageOptions: {
                image: ecs.ContainerImage.fromEcrRepository(repository, version),
                environment: taskConfiguration?.environment || {},
                secrets,
            },
        });
        const taskDefinition = this.service.taskDefinition;
        taskDefinition.addToExecutionRolePolicy(new iam.PolicyStatement({
            actions: [
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage'
            ],
            resources: [repository.repositoryArn],
        }));
        // Allow secrets
        taskDefinition.addToExecutionRolePolicy(new iam.PolicyStatement({
            actions: ["secretsmanager:GetSecretValue"],
            resources: [`${stack.getSecretBaseArn()}/*`],
        }));
        // Health check
        this.service.targetGroup.configureHealthCheck({ path: healthCheckPath });
        // create A recordset alias targeting admin service's load balancer
        new route53.ARecord(this, stack.getResourceID('Recordset'), {
            recordName: `${subDomainWithoutDot}${zone.zoneName}`,
            zone,
            target: {
                aliasTarget: new targets.LoadBalancerTarget(this.service.loadBalancer)
            }
        });
    }
}
exports.FargateService = FargateService;
