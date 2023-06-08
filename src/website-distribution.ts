import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NestedStackProps, StackConfig } from "./configuration";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cf from 'aws-cdk-lib/aws-cloudfront'
import * as cf_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import { ARecord } from "./route53";
import * as targets from 'aws-cdk-lib/aws-route53-targets';

/**
 * Generate a cloudfront distribution for serving content from an s3 bucket
 */
export class WebsiteDistribution extends cdk.NestedStack {

  public readonly distribution: cf.IDistribution;

  constructor(
    scope: Construct,
    id: string,
    props: NestedStackProps<{
      domainNames?: string,
    }>,
    stack: StackConfig,
    certificate: acm.ICertificate,
    bucket: s3.IBucket,
  ) {
    super(scope, id, props);

    const domainNames = new cdk.CfnParameter(this, 'domainNames', {
      type: 'String',
      description: "Provide a comma-separated list of valid domain names using only lowercase letters, numbers, and dash (-)",
      default: '',
      allowedPattern: "^[a-z0-9-,\\.\\*]*$"
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


/**
 * Attach a route53 alias to this distribution
 */
export class WebsiteDistributionAlias extends ARecord {

  constructor(
    scope: Construct,
    id: string,
    props: NestedStackProps<{
      subDomain?: string,
    }>,
    stack: StackConfig,
    zone: route53.IHostedZone,
    distribution: cf.IDistribution,
  ) {
    super(
      scope,
      id,
      props,
      stack,
      zone,
      new targets.CloudFrontTarget(distribution)
    );
  }
}
