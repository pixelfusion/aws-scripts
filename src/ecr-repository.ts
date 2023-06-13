import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import { StackConfig } from './configuration'

export interface EcrRepositoryStackProps extends cdk.NestedStackProps {
  stack: StackConfig
  service: string
}

/**
 * Creates an ECR repository for uploading docker images to
 */
export class EcrRepositoryStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: EcrRepositoryStackProps) {
    super(scope, id, props)

    const { stack, service } = props

    // Create an ECR repositories
    const slug = stack.getSlug().toLowerCase()
    const repositoryName = `${slug}/${service.toLowerCase()}`
    const repository = new ecr.Repository(
      this,
      stack.getResourceID(`${service}ECRRepository`),
      {
        repositoryName,
      },
    )
    repository.addLifecycleRule({
      description: 'Expire images older than 14 days',
      maxImageAge: cdk.Duration.days(14),
      rulePriority: 1,
      tagStatus: ecr.TagStatus.UNTAGGED,
    })

    repository.addLifecycleRule({
      description: 'Expire dev images older than 14 days',
      maxImageAge: cdk.Duration.days(14),
      rulePriority: 2,
      tagStatus: ecr.TagStatus.TAGGED,
      tagPrefixList: ['dev-'],
    })

    // Export
    const exportId = stack.getStackExportId(`${service}ECRRepository`)
    new cdk.CfnOutput(this, `${exportId}Export`, {
      description: `ECR Repository name for Admin`,
      exportName: exportId,
      value: repository.repositoryArn,
    })
  }
}
