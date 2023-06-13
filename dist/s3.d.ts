import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { StackConfig } from './configuration';
/**
 * Configuration options for bucket
 */
declare enum BucketAccess {
    Public = "Public",
    Private = "Priavte"
}
interface S3BucketProps extends cdk.NestedStackProps {
    bucketName?: string;
    publicPath?: string;
    bucketAccess?: BucketAccess;
    stack: StackConfig;
}
/**
 * Generate an s3 bucket
 */
export declare class S3Bucket extends cdk.NestedStack {
    readonly bucket: s3.Bucket;
    constructor(scope: Construct, id: string, props: S3BucketProps);
}
export {};
