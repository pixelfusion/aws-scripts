import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NestedStackProps, StackConfig } from "./configuration";
import * as route53 from "aws-cdk-lib/aws-route53";

/**
 * Create A-record to any resource
 */
export class ARecord extends cdk.NestedStack {

  constructor(
    scope: Construct,
    id: string,
    props: NestedStackProps<{
      subDomain?: string
    }>,
    stack: StackConfig,
    zone: route53.IHostedZone,
    aliasTarget: route53.IAliasRecordTarget,
  ) {
    super(scope, id, props);

    const subDomain = new cdk.CfnParameter(this, 'subDomain', {
      type: 'String',
      description: 'Subdomain to map to this service',
      default: '',
    });

    // Check if domain name given
    const hasDomainName = new cdk.CfnCondition(
      this,
      'HasDomainNameCondition',
      {
        expression: cdk.Fn.conditionNot(
          cdk.Fn.conditionEquals(subDomain.valueAsString, '')
        )
      }
    )

    const isBaseDomain = new cdk.CfnCondition(
      this,
      'IsBaseDomainCondition',
      {
        expression: cdk.Fn.conditionEquals(subDomain.valueAsString, '')
      }
    )

    // create A recordset alias targeting admin service's load balancer
    const recordWithSubdomain = new route53.ARecord(this, stack.getResourceID('RecordsetWithSubdomain'), {
      recordName: subDomain.valueAsString,
      zone,
      target: { aliasTarget }
    });

    const cfnRecordWithSubdomain = recordWithSubdomain.node.defaultChild as route53.CfnRecordSet;
    cfnRecordWithSubdomain.cfnOptions.condition = hasDomainName;

    // Different parameters if it's a base record
    const record = new route53.ARecord(this, stack.getResourceID('Recordset'), {
      zone,
      target: { aliasTarget }
    });

    const cfnRecord = record.node.defaultChild as route53.CfnRecordSet;
    cfnRecord.cfnOptions.condition = isBaseDomain;
  }
}
