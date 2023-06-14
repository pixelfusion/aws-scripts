import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import { StackConfig } from './configuration'

export interface CertificateProps extends cdk.NestedStackProps {
  subDomainIncludingDot?: string
  stack: StackConfig
  zone: route53.IHostedZone
}

/**
 * Generates an ACMS certificate
 */
export class Certificate extends cdk.NestedStack {
  public readonly certificate: acm.ICertificate

  constructor(scope: Construct, id: string, props: CertificateProps) {
    super(scope, id, props)

    const { subDomainIncludingDot = '', stack, zone } = props

    // Create a certificate in ACM for the domain
    this.certificate = new acm.Certificate(
      this,
      stack.getResourceID('Certificate'),
      {
        domainName: `${subDomainIncludingDot}${zone.zoneName}`,
        subjectAlternativeNames: [`*.${subDomainIncludingDot}${zone.zoneName}`],
        validation: acm.CertificateValidation.fromDns(zone),
      },
    )
  }
}
