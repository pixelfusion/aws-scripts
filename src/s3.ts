import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { StackConfig } from './configuration'

/**
 * Configuration options for bucket
 */
export enum BucketAccess {
  Public = 'Public',
  Private = 'Priavte',
}

export interface S3BucketProps extends cdk.NestedStackProps {
  bucketName?: string
  publicPath?: string
  bucketAccess?: BucketAccess
  stack: StackConfig
  removalPolicy?: cdk.RemovalPolicy
}

/**
 * Generate an s3 bucket
 */
export class S3Bucket extends cdk.NestedStack {
  public readonly bucket: s3.Bucket

  constructor(scope: Construct, id: string, props: S3BucketProps) {
    super(scope, id, props)
    const {
      bucketName,
      publicPath = '/*',
      bucketAccess = BucketAccess.Private,
      stack,
      removalPolicy = stack.getRemovalPolicy(),
    } = props

    // Create base bucket
    this.bucket = new s3.Bucket(this, stack.getResourceID('Bucket'), {
      removalPolicy,
      publicReadAccess: false, // Note: Grant selective read on pattern after this
      bucketName,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    })

    if (bucketAccess === BucketAccess.Public) {
      // Conditionally add policy
      new s3.CfnBucketPolicy(this, 'BucketPolicy', {
        bucket: this.bucket.bucketName,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Principal: '*',
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: this.bucket.arnForObjects(publicPath),
            },
          ],
        },
      })
    }
  }
}
