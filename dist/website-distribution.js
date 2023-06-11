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
exports.WebsiteDistributionAlias = exports.WebsiteDistribution = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cf = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const cf_origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const route53_1 = require("./route53");
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
/**
 * Generate a cloudfront distribution for serving content from an s3 bucket
 */
class WebsiteDistribution extends cdk.NestedStack {
    constructor(scope, id, props, stack, certificate, bucket) {
        super(scope, id, props);
        const domainNames = new cdk.CfnParameter(this, 'domainNames', {
            type: 'String',
            description: 'Provide a comma-separated list of valid domain names using only lowercase letters, numbers, and dash (-)',
            default: '',
            allowedPattern: '^[a-z0-9-,\\.\\*]*$',
        });
        this.distribution = new cf.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: new cf_origins.S3Origin(bucket),
                cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
                viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
                compress: true,
            },
            domainNames: cdk.Fn.split(',', domainNames.valueAsString),
            priceClass: cf.PriceClass.PRICE_CLASS_ALL,
            httpVersion: cf.HttpVersion.HTTP2,
            certificate: certificate,
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],
        });
    }
}
exports.WebsiteDistribution = WebsiteDistribution;
/**
 * Attach a route53 alias to this distribution
 */
class WebsiteDistributionAlias extends route53_1.ARecord {
    constructor(scope, id, props, stack, zone, distribution) {
        super(scope, id, props, stack, zone, new targets.CloudFrontTarget(distribution));
    }
}
exports.WebsiteDistributionAlias = WebsiteDistributionAlias;
