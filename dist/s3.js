"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Bucket = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
/**
 * Configuration options for bucket
 */
var BucketAccess;
(function (BucketAccess) {
    BucketAccess["Public"] = "Public";
    BucketAccess["Private"] = "Priavte";
})(BucketAccess || (BucketAccess = {}));
/**
 * Generate an s3 bucket
 */
class S3Bucket extends cdk.NestedStack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { bucketName, publicPath = '/*', bucketAccess = BucketAccess.Private, stack, } = props;
        // Create base bucket
        this.bucket = new s3.Bucket(this, stack.getResourceID('Bucket'), {
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            publicReadAccess: false,
            bucketName,
            blockPublicAccess: {
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            },
        });
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
            });
        }
    }
}
exports.S3Bucket = S3Bucket;
