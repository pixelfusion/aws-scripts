import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import { NestedStackProps, StackConfig } from './configuration'

/**
 * Generates an ACMS certificate
 */
export class Certificate extends cdk.NestedStack {
  public readonly certificate: acm.ICertificate

  constructor(
    scope: Construct,
    id: string,
    props: NestedStackProps<{
      subDomain?: string
    }>,
    stack: StackConfig,
    zone: route53.IHostedZone,
  ) {
    super(scope, id, props)

    const subDomain = new cdk.CfnParameter(this, 'subDomain', {
      type: 'String',
      description: 'Subdomain to map to this service',
      default: '',
    })

    // Check if domain name given
    const hasSubDomain = new cdk.CfnCondition(this, 'HasSubDomainCondition', {
      expression: cdk.Fn.conditionNot(
        cdk.Fn.conditionEquals(subDomain.valueAsString, ''),
      ),
    })

    // Create a certificate in ACM for the domain
    const certificate = new acm.CfnCertificate(
      this,
      stack.getResourceID('CfnCertificate'),
      {
        domainName: cdk.Fn.conditionIf(
          hasSubDomain.logicalId,
          `${subDomain.valueAsString}.${zone.zoneName}`,
          zone.zoneName,
        ).toString(),
        subjectAlternativeNames: [
          cdk.Fn.conditionIf(
            hasSubDomain.logicalId,
            `*.${subDomain.valueAsString}.${zone.zoneName}`,
            `*.${zone.zoneName}`,
          ).toString(),
        ],
        validationMethod: acm.ValidationMethod.DNS,
        domainValidationOptions: [
          {
            domainName: cdk.Fn.conditionIf(
              hasSubDomain.logicalId,
              `*.${subDomain.valueAsString}.${zone.zoneName}`,
              `*.${zone.zoneName}`,
            ).toString(),
            hostedZoneId: zone.hostedZoneId,
          },
        ],
      },
    )

    // CDK prefers an ICertificate so wrap it here
    this.certificate = acm.Certificate.fromCertificateArn(
      this,
      stack.getResourceID('Certificate'),
      certificate.ref,
    )
  }
}
