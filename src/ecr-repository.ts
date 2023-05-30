import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ecr from "aws-cdk-lib/aws-ecr";
import { StackConfig } from "./configuration";

/**
 * Creates an ECR repository for uploading docker images to
 */
export class EcrRepositoryStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps, stack: StackConfig, service: string) {
        super(scope, id, props);

        // Create an ECR repositories
        const repositoryName = `${ stack.getSlug().toLowerCase() }/${ service.toLowerCase() }`;
        const repository = new ecr.Repository(
            this,
            stack.getResourceID(`${ service }ECRRepository`),
            {
                repositoryName
            }
        );
        repository.addLifecycleRule({
            description: 'Expire images older than 14 days',
            maxImageAge: cdk.Duration.days(14),
            rulePriority: 1,
            tagStatus: ecr.TagStatus.UNTAGGED,
        });

        repository.addLifecycleRule({
            description: 'Expire dev images older than 14 days',
            maxImageAge: cdk.Duration.days(14),
            rulePriority: 2,
            tagStatus: ecr.TagStatus.TAGGED,
            tagPrefixList: [ 'dev-' ],
        });

        // Export
        const exportId = stack.getStackExportId(`${ service }ECRRepository`);
        new cdk.CfnOutput(this, `${ exportId }Export`, {
            description: `ECR Repository name for Admin`,
            exportName: exportId,
            value: repository.repositoryArn,
        });
    }
}
