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
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
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
