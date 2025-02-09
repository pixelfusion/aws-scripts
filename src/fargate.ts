import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as ssm from 'aws-cdk-lib/aws-secretsmanager'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import { StackConfig } from './configuration'
import { ARecord } from './route53'
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { SecurityGroup } from './security-group'

// Default docker image to use
const DEFAULT_IMAGE = 'nginxdemos/hello:latest'

/**
 * Represents a definition for a task that can be used to generate a task definition
 */
export interface TaskConfiguration {
  memoryLimitMiB?: number
  healthCheckGracePeriod?: cdk.Duration
  cpu?: number
  desiredCount?: number
  autoScalingCpuTarget?: number
  maxCount?: number
  minCount?: number
  environment?: Record<string, string>
  secrets?: Record<string, string>
}

/**
 * Generator for configuring ECS task definitions for a service
 */
export type EnvFactory = (
  stack: StackConfig,
  defaults: Record<string, string>,
) => TaskConfiguration

interface FargateServiceProps extends cdk.NestedStackProps {
  subDomainIncludingDot?: string
  healthCheckPath?: string
  stack: StackConfig
  cluster: ecs.ICluster
  certificate: acm.ICertificate
  zone: route53.IHostedZone
  imageVersion?: string
  repository?: ecr.IRepository
  taskConfiguration: TaskConfiguration
  image?: ecs.ContainerImage
  securityGroup?: ec2.ISecurityGroup
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
export class FargateService extends cdk.NestedStack {
  public readonly service: ecs_patterns.ApplicationLoadBalancedFargateService

  constructor(scope: Construct, id: string, props: FargateServiceProps) {
    super(scope, id, props)

    const {
      healthCheckPath = '/health-check',
      imageVersion = 'latest',
      subDomainIncludingDot = '',
      stack,
      cluster,
      certificate,
      zone,
      repository,
      taskConfiguration,
      securityGroup: defaultSecurityGroup,
    } = props

    // Compile secrets into list of mapped ecs.Secrets
    const secrets: { [key: string]: ecs.Secret } = {}
    const secretValues = taskConfiguration.secrets
    if (secretValues) {
      for (const [secretKey, value] of Object.entries(secretValues)) {
        if (value) {
          // Convert from json string to ecs.Secret
          const [secretName, fieldName] = value.split(':').slice(0, 2)
          const secret = ssm.Secret.fromSecretNameV2(
            this,
            secretKey,
            secretName,
          )
          secrets[secretKey] = ecs.Secret.fromSecretsManager(secret, fieldName)
        }
      }
    }

    // Pick image
    const image =
      props.image ||
      (repository &&
        ecs.ContainerImage.fromEcrRepository(repository, imageVersion)) ||
      ecs.ContainerImage.fromRegistry(DEFAULT_IMAGE)

    // Scaffold default security group if not provided
    let securityGroup = defaultSecurityGroup
    if (!securityGroup) {
      const groupStack = new SecurityGroup(
        this,
        stack.getResourceID('SecurityGroup'),
        { vpc: cluster.vpc },
      )
      securityGroup = groupStack.securityGroup
    }

    const desiredCount = taskConfiguration?.desiredCount || 1
    this.service = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      stack.getResourceID('FargateService'),
      {
        assignPublicIp: true,
        cluster: cluster,
        certificate: certificate,
        redirectHTTP: true,
        memoryLimitMiB: taskConfiguration?.memoryLimitMiB || 512,
        healthCheckGracePeriod:
          taskConfiguration?.healthCheckGracePeriod || cdk.Duration.seconds(60),
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
        securityGroups: [securityGroup],
      },
    )

    // Setup AutoScaling policy
    if (taskConfiguration.autoScalingCpuTarget) {
      // Default max capacity to double desired unless specified
      const maxCapacity = taskConfiguration?.maxCount || desiredCount * 2
      const minCapacity = taskConfiguration?.minCount || desiredCount
      const scaling = this.service.service.autoScaleTaskCount({
        maxCapacity,
        minCapacity,
      })
      scaling.scaleOnCpuUtilization(stack.getResourceID('CpuScaling'), {
        targetUtilizationPercent: taskConfiguration.autoScalingCpuTarget,
        scaleInCooldown: cdk.Duration.seconds(60),
        scaleOutCooldown: cdk.Duration.seconds(60),
      })
    }

    // Hack to fix subnets issue
    // https://github.com/aws/aws-cdk/issues/5892#issuecomment-701993883
    const cfnLoadBalancer = this.service.loadBalancer.node
      .defaultChild as elb.CfnLoadBalancer
    cfnLoadBalancer.subnets = cluster.vpc.selectSubnets({
      onePerAz: true,
      subnetType: ec2.SubnetType.PUBLIC,
    }).subnetIds

    const taskDefinition = this.service.taskDefinition

    if (repository) {
      taskDefinition.addToExecutionRolePolicy(
        new iam.PolicyStatement({
          actions: [
            'ecr:GetAuthorizationToken',
            'ecr:BatchCheckLayerAvailability',
            'ecr:GetDownloadUrlForLayer',
            'ecr:BatchGetImage',
          ],
          resources: [repository.repositoryArn],
        }),
      )
    }

    // Allow secrets
    taskDefinition.addToExecutionRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [`${stack.getSecretBaseArn()}/*`],
      }),
    )

    // Health check
    this.service.targetGroup.configureHealthCheck({
      path: healthCheckPath,
    })

    // Alias
    new ARecord(this, stack.getResourceID('Record'), {
      subDomainIncludingDot,
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(this.service.loadBalancer),
      ),
      stack,
      zone,
    })
  }
}
