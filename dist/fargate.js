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
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
/**
 * Generate a fargate service that can be attached to a cluster. This service will include its own
 * load balancer.
 */
class FargateService extends cdk.NestedStack {
    constructor(scope, id, props, stack, cluster, certificate, zone, repository, taskConfiguration) {
        super(scope, id, props);
        const subDomainWithoutDot = new cdk.CfnParameter(this, 'subDomainWithoutDot', {
            type: 'String',
            description: 'Subdomain to map to this service (including trailing dot if any)',
            default: '',
        });
        const healthCheckPath = new cdk.CfnParameter(this, 'healthCheckPath', {
            type: 'String',
            description: 'Path to health check url',
            default: '/health-check',
        });
        const imageVersion = new cdk.CfnParameter(this, 'imageVersion', {
            type: 'String',
            description: 'Docker image version to use',
            default: 'latest',
        });
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
                image: ecs.ContainerImage.fromEcrRepository(repository, imageVersion.valueAsString),
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
        this.service.targetGroup.configureHealthCheck({
            path: healthCheckPath.valueAsString
        });
        // create A recordset alias targeting admin service's load balancer
        const recordName = cdk.Fn.join('', [
            subDomainWithoutDot.valueAsString,
            zone.zoneName
        ]);
        new route53.ARecord(this, stack.getResourceID('Recordset'), {
            recordName,
            zone,
            target: {
                aliasTarget: new targets.LoadBalancerTarget(this.service.loadBalancer)
            }
        });
    }
}
exports.FargateService = FargateService;
