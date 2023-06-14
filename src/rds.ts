import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ssm from 'aws-cdk-lib/aws-secretsmanager'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as route53 from 'aws-cdk-lib/aws-route53'
import { StackConfig } from './configuration'
import { ARecord } from './route53'

export interface PostgresInstanceProps extends cdk.NestedStackProps {
  postgresFullVersion?: string
  postgresMajorVersion?: string
  stack: StackConfig
  vpc: ec2.IVpc
  removalPolicy: cdk.RemovalPolicy
}

/**
 * Generate a postgres instance with secret keys and bastion server
 */
export class PostgresInstance extends cdk.NestedStack {
  protected readonly rdsInstance: rds.DatabaseInstance

  constructor(scope: Construct, id: string, props: PostgresInstanceProps) {
    super(scope, id, props)

    const {
      postgresFullVersion = rds.PostgresEngineVersion.VER_15_2
        .postgresFullVersion,
      postgresMajorVersion = '15',
      removalPolicy = cdk.RemovalPolicy.SNAPSHOT,
      stack,
      vpc,
    } = props

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
          postgresFullVersion,
          postgresMajorVersion,
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
      removalPolicy,
    })
  }
}

export interface PostgresInstanceWithBastionProps
  extends PostgresInstanceProps {
  bastionSubdomainIncludingDot?: string
  zone: route53.IHostedZone
}

/**
 * RDS instance with bastion
 */
export class PostgresInstanceWithBastion extends PostgresInstance {
  constructor(
    scope: Construct,
    id: string,
    props: PostgresInstanceWithBastionProps,
  ) {
    super(scope, id, props)

    const { stack, vpc, zone, bastionSubdomainIncludingDot } = props

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
    new ARecord(this, stack.getResourceID('BastionRecordSet'), {
      subDomainIncludingDot: bastionSubdomainIncludingDot,
      target: route53.RecordTarget.fromIpAddresses(bastionEip.attrPublicIp),
      stack,
      zone,
    })
  }
}
