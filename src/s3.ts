import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { StackConfig } from './configuration';

/**
 * Configuration options for bucket
 */
export type BucketAccess = 'Public' | 'Private';

/**
 * Generate an s3 bucket
 */
export class S3Bucket extends cdk.Stack {

    public readonly bucket: s3.Bucket

    constructor(
        scope: Construct,
        id: string,
        props: cdk.StackProps,
        stack: StackConfig,
        options?: {
            bucketName?: string,
            publicPath?: string,
            bucketAccess?: BucketAccess,
        }
    ) {
        super(scope, id, props);

        // Check options
        const bucketName = options?.bucketName;
        const publicPath = options?.publicPath || '/*'
        const bucketAccess = options?.bucketAccess || 'Private'

        // Create base bucket
        this.bucket = new s3.Bucket(this, stack.getResourceID('Bucket'), {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            publicReadAccess: false,
            bucketName,
            blockPublicAccess: {
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            },
        });

        // Add public access
        if (bucketAccess == 'Public') {
            this.bucket.addToResourcePolicy(
                new iam.PolicyStatement({
                    actions: [ 's3:GetObject' ],
                    principals: [ new iam.AnyPrincipal() ],
                    resources: [ this.bucket.arnForObjects(publicPath) ],
                }),
            );
        }
    }
}
