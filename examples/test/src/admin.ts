import * as cdk from 'aws-cdk-lib'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import {
  BucketAccess,
  Certificate,
  EnvFactory,
  FargateService,
  S3Bucket,
  StackConfig,
  Vpc,
} from '@pixelfusion/aws-scripts'

/**
 * Base stack for admin
 */
export class AdminStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps,
    stack: StackConfig,
    adminVersion: string,
    adminFactory: EnvFactory,
  ) {
    super(scope, id, props)

    // find hosted zone by domain name. will fail if none hosted zone found.
    const zone = route53.HostedZone.fromLookup(
      this,
      stack.getResourceID('HostedZone'),
      {
        domainName: stack.getProperty('hosted_zone_name'),
      },
    )

    const vpc = new Vpc(this, 'VPC', {})

    // Create a certificate in ACM for the domain
    const certificate = new Certificate(
      this,
      stack.getResourceID('Certificate'),
      {
        stack,
        zone,
      },
    )

    const assetBucket = new S3Bucket(this, stack.getResourceID('Assets'), {
      bucketAccess: BucketAccess.Public,
      publicPath: 'public/*',
      stack,
    })

    // Fargate cluster
    const cluster = new ecs.Cluster(this, stack.getResourceID('Fargate'), {
      vpc: vpc.vpc,
    })

    // Build environment from admin
    const taskConfiguration = adminFactory(stack, {
      AWS_BUCKET: assetBucket.bucket.bucketName,
    })

    // Lookup repository from bootstrap
    const repositoryName = `${ stack.getSlug().toLowerCase() }/admin`
    const repositoryArn = cdk.Fn.importValue(
      stack.getStackExportId('AdminECRRepository'),
    )
    const repository = ecr.Repository.fromRepositoryAttributes(
      this,
      'AdminECRRepository',
      {
        repositoryName,
        repositoryArn,
      },
    )

    // Admin Service
    const service = new FargateService(this, stack.getResourceID('Admin'), {
      imageVersion: adminVersion,
      stack,
      cluster,
      certificate: certificate.certificate,
      zone,
      repository,
      taskConfiguration,
      healthCheckPath: '/health-check',
    })

    // After creating the service add a few more permissions
    const taskDefinition = service.service.taskDefinition
    taskDefinition.addToTaskRolePolicy(
      new iam.PolicyStatement({
        actions: [ 's3:*' ],
        resources: [
          assetBucket.bucket.bucketArn,
          `${ assetBucket.bucket.bucketArn }/*`,
        ],
      }),
    )
  }
}
