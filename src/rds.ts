import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import { RemovalPolicy } from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ssm from 'aws-cdk-lib/aws-secretsmanager'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as route53 from 'aws-cdk-lib/aws-route53'
import { NestedStackProps, StackConfig } from './configuration'

/**
 * Generate a postgres instance with secret keys and bastion server
 */
export class PostgresInstance extends cdk.NestedStack {
  protected readonly rdsInstance: rds.DatabaseInstance

  constructor(
    scope: Construct,
    id: string,
    props: NestedStackProps<{
      postgresFullVersion?: string
      postgresMajorVersion?: string
    }>,
    // Postgres instance
    stack: StackConfig,
    vpc: ec2.IVpc,
  ) {
    super(scope, id, props)

    const postgresFullVersion = new cdk.CfnParameter(
      this,
      'postgresFullVersion',
      {
        type: 'String',
        description: 'Postgres engine full version',
        default: rds.PostgresEngineVersion.VER_15_2.postgresFullVersion,
      },
    )

    const postgresMajorVersion = new cdk.CfnParameter(
      this,
      'postgresMajorVersion',
      {
        type: 'String',
        description:
          'Postgres engine major version. This should match the full version',
        default: '15',
      },
    )

    // Create postgres database secret
    const databaseCredentialsSecret = new ssm.Secret(
      this,
      stack.getResourceID('RdsCredentials'),
      {
        secretName: stack.getSecretName('RdsCredentials'),
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: 'master',
          }),
          excludePunctuation: true,
          passwordLength: 30,
          includeSpace: false,
          generateStringKey: 'password',
        },
      },
    )

    // Create a security group for the database
    const dbSecurityGroup = new ec2.SecurityGroup(
      this,
      stack.getResourceID('DatabaseSecurityGroup'),
      {
        vpc,
      },
    )

    // Allow inbound connections from the VPC
    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
    )

    // create postgres database
    const rdsInstanceId = `${stack.getFullResourceId('RdsInstance')}`
    this.rdsInstance = new rds.DatabaseInstance(this, rdsInstanceId, {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.of(
          postgresFullVersion.valueAsString,
          postgresMajorVersion.valueAsString,
        ),
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO,
      ),
      vpc: vpc,
      databaseName: 'website',
      instanceIdentifier: rdsInstanceId,
      maxAllocatedStorage: 200,
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(databaseCredentialsSecret),
      deletionProtection: true,
      removalPolicy: RemovalPolicy.SNAPSHOT,
    })
  }
}

/**
 * RDS instance with bastion
 */
export class PostgresInstanceWithBastion extends PostgresInstance {
  constructor(
    scope: Construct,
    id: string,
    props: NestedStackProps<{
      postgresFullVersion?: string
      postgresMajorVersion?: string
      bastionSubdomain?: string
    }>,
    // Postgres instance
    stack: StackConfig,
    vpc: ec2.IVpc,
    zone: route53.IHostedZone,
  ) {
    super(scope, id, props, stack, vpc)

    const bastionSubdomain = new cdk.CfnParameter(this, 'bastionSubdomain', {
      type: 'String',
      description: 'Subdomain for hostname',
      default: 'ssh',
    })

    // Create a security group for the bastion host
    const bastionSecurityGroup = new ec2.SecurityGroup(
      this,
      stack.getResourceID('BastionSecurityGroup'),
      {
        vpc,
      },
    )

    // Allow SSH access from anywhere
    bastionSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22))

    // Create a key pair
    const key = new ec2.CfnKeyPair(
      this,
      stack.getResourceID('BastionKeyPair'),
      {
        keyName: stack.getFullResourceId('BastionKeyPair'),
        keyType: 'ed25519',
      },
    )

    // Create the bastion host
    const bastion = new ec2.Instance(this, stack.getResourceID('BastionHost'), {
      vpc,
      securityGroup: bastionSecurityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.NANO,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      keyName: key.keyName,
    })

    bastion.connections.allowFromAnyIpv4(
      ec2.Port.tcp(22),
      'SSH access from the internet',
    )

    // Allow the bastion host to connect to the database
    this.rdsInstance.connections.allowFrom(bastion, ec2.Port.tcp(5432))

    // Allocate an Elastic IP
    const bastionEip = new ec2.CfnEIP(this, stack.getResourceID('BastionEIP'))

    // Associate the Elastic IP with the bastion host
    new ec2.CfnEIPAssociation(
      this,
      stack.getResourceID('BastionEipAssociation'),
      {
        eip: bastionEip.ref,
        instanceId: bastion.instanceId,
      },
    )

    // Create hostname for ssh. for bastion
    new route53.ARecord(this, stack.getResourceID('BastionRecordSet'), {
      recordName: bastionSubdomain.valueAsString,
      zone: zone,
      target: route53.RecordTarget.fromIpAddresses(bastionEip.attrPublicIp),
    })
  }
}