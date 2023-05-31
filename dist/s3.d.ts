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
export declare class S3Bucket extends cdk.NestedStack {
    readonly bucket: s3.Bucket;
    constructor(scope: Construct, id: string, props: NestedStackProps<{
        bucketName?: string;
        publicPath?: string;
        bucketAccess?: BucketAccess;
    }>, stack: StackConfig);
}
