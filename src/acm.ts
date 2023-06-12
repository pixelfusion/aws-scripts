import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import { NestedStackProps, StackConfig } from './configuration'

/**
 * Generates an ACMS certificate
 */
export class Certificate extends cdk.NestedStack {
  public readonly certificate: acm.Certificate

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
    this.certificate = new acm.Certificate(
      this,
      stack.getResourceID('Certificate'),
      {
        domainName: cdk.Fn.conditionIf(
          hasSubDomain.logicalId,
          cdk.Fn.join('.', [subDomain.valueAsString, zone.zoneName]),
          zone.zoneName,
        ).toString(),
        subjectAlternativeNames: [
          cdk.Fn.conditionIf(
            hasSubDomain.logicalId,
            cdk.Fn.join('.', ['*', subDomain.valueAsString, zone.zoneName]),
            cdk.Fn.join('.', ['*', zone.zoneName]),
          ).toString(),
        ],
        validation: {
          props: {
            hostedZone: zone,
          },
          method: acm.ValidationMethod.DNS,
        },
      },
    )
  }
}
