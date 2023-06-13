import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { StackConfig } from './configuration'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cf from 'aws-cdk-lib/aws-cloudfront'
import * as cf_origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as route53 from 'aws-cdk-lib/aws-route53'
import { ARecord, ARecordProps } from './route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'

interface WebsiteDistributionProps extends cdk.NestedStackProps {
  domainNames: string[]
  stack: StackConfig
  certificate: acm.ICertificate
  bucket: s3.IBucket
}

/**
 * Generate a cloudfront distribution for serving content from an s3 bucket
 */
export class WebsiteDistribution extends cdk.NestedStack {
  public readonly distribution: cf.IDistribution

  constructor(scope: Construct, id: string, props: WebsiteDistributionProps) {
    super(scope, id, props)

    const { domainNames, stack, certificate, bucket } = props

    this.distribution = new cf.Distribution(
      this,
      stack.getResourceID('Distribution'),
      {
        defaultBehavior: {
          origin: new cf_origins.S3Origin(bucket),
          cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
          viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
          compress: true,
        },
        domainNames,
        priceClass: cf.PriceClass.PRICE_CLASS_ALL,
        httpVersion: cf.HttpVersion.HTTP2,
        certificate,
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
        ],
      },
    )
  }
}

interface WebsiteDistributionAliasProps extends Omit<ARecordProps, 'target'> {
  distribution: cf.IDistribution
}

/**
 * Attach a route53 alias to this distribution
 */
export class WebsiteDistributionAlias extends ARecord {
  constructor(
    scope: Construct,
    id: string,
    props: WebsiteDistributionAliasProps,
  ) {
    super(scope, id, {
      ...props,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(props.distribution),
      ),
    })
  }
}
