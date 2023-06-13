import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { StackConfig } from './configuration'
import * as route53 from 'aws-cdk-lib/aws-route53'

export interface ARecordProps extends cdk.NestedStackProps {
  subDomainIncludingDot?: string
  stack: StackConfig
  zone: route53.IHostedZone
  target: route53.RecordTarget
}

/**
 * Create A-record to any resource
 */
export class ARecord extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: ARecordProps) {
    super(scope, id, props)

    const { subDomainIncludingDot = '', stack, zone, target } = props

    // create A recordset alias targeting admin service's load balancer
    new route53.ARecord(this, stack.getResourceID('RecordSet'), {
      recordName: `${subDomainIncludingDot}${zone.zoneName}`,
      zone,
      target,
    })
  }
}
