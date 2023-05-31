import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from "aws-cdk-lib/aws-s3";
import { NestedStackProps, StackConfig } from './configuration';

/**
 * Configuration options for bucket
 */
export type BucketAccess = 'Public' | 'Private';

/**
 * Generate an s3 bucket
 */
export class S3Bucket extends cdk.NestedStack {

  public readonly bucket: s3.Bucket

  constructor(
    scope: Construct,
    id: string,
    props: NestedStackProps<{
      bucketName?: string,
      publicPath?: string,
      bucketAccess?: BucketAccess,
    }>,
    stack: StackConfig
  ) {
    super(scope, id, props);

    const bucketName = new cdk.CfnParameter(this, 'bucketName', {
      type: 'String',
      description: 'Name for this bucket',
      default: '',
    });

    const publicPath = new cdk.CfnParameter(this, 'publicPath', {
      type: 'String',
      description: 'Public path',
      default: '/*',
    });

    const bucketAccess = new cdk.CfnParameter(this, 'bucketAccess', {
      type: 'String',
      description: 'Access for this bucket',
      allowedValues: [ 'Public', 'Private' ],
      default: 'Private',
    });

    // Create base bucket
    this.bucket = new s3.Bucket(this, stack.getResourceID('Bucket'), {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      publicReadAccess: false,
      bucketName: bucketName.valueAsString,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
    });

    // Condition for public access
    const bucketIsPublic = new cdk.CfnCondition(
      this,
      'BucketIsPublicCondition',
      {
        expression: cdk.Fn.conditionEquals(bucketAccess.valueAsString, 'Public')
      }
    )

    // Conditionally add policy
    const bucketPolicy = new s3.CfnBucketPolicy(
      this,
      'BucketPolicy',
      {
        bucket: this.bucket.bucketName,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Principal: '*',
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: this.bucket.arnForObjects(publicPath.valueAsString),
            }
          ]
        },
      }
    )
    bucketPolicy.cfnOptions.condition = bucketIsPublic;
  }
}
