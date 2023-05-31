"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Bucket = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const iam = require("aws-cdk-lib/aws-iam");
/**
 * Generate an s3 bucket
 */
class S3Bucket extends cdk.Stack {
    constructor(scope, id, props, stack, options) {
        super(scope, id, props);
        // Check options
        const bucketName = options?.bucketName;
        const publicPath = options?.publicPath || '/*';
        const bucketAccess = options?.bucketAccess || 'Private';
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
            this.bucket.addToResourcePolicy(new iam.PolicyStatement({
                actions: ['s3:GetObject'],
                principals: [new iam.AnyPrincipal()],
                resources: [this.bucket.arnForObjects(publicPath)],
            }));
        }
    }
}
exports.S3Bucket = S3Bucket;
