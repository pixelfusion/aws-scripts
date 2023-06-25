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
exports.PostgresInstanceWithBastion = exports.PostgresInstance = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const aws_ec2_1 = require("aws-cdk-lib/aws-ec2");
const ssm = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const route53_1 = require("./route53");
/**
 * Generate a postgres instance with secret keys and bastion server
 */
class PostgresInstance extends cdk.NestedStack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stack, instanceType = ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO), postgresFullVersion = rds.PostgresEngineVersion.VER_15_2
            .postgresFullVersion, postgresMajorVersion = '15', 
        // RDS should snapshot by default
        removalPolicy = stack.getRemovalPolicy(cdk.RemovalPolicy.SNAPSHOT), vpc, } = props;
        // Create postgres database secret
        const databaseCredentialsSecret = new ssm.Secret(this, stack.getResourceID('RdsCredentials'), {
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
        });
        // Create a security group for the database
        const dbSecurityGroup = new ec2.SecurityGroup(this, stack.getResourceID('DatabaseSecurityGroup'), {
            vpc,
        });
        // Allow inbound connections from the VPC
        dbSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(5432));
        // create postgres database
        const rdsInstanceId = `${stack.getFullResourceId('RdsInstance')}`;
        this.rdsInstance = new rds.DatabaseInstance(this, rdsInstanceId, {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.of(postgresFullVersion, postgresMajorVersion),
            }),
            instanceType,
            vpc,
            databaseName: 'website',
            instanceIdentifier: rdsInstanceId,
            maxAllocatedStorage: 200,
            securityGroups: [dbSecurityGroup],
            credentials: rds.Credentials.fromSecret(databaseCredentialsSecret),
            deletionProtection: removalPolicy === cdk.RemovalPolicy.RETAIN,
            removalPolicy,
            vpcSubnets: {
                subnetType: aws_ec2_1.SubnetType.PRIVATE_WITH_EGRESS,
            },
        });
    }
}
exports.PostgresInstance = PostgresInstance;
/**
 * RDS instance with bastion
 */
class PostgresInstanceWithBastion extends PostgresInstance {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stack, vpc, zone, bastionSubdomainIncludingDot = 'bastion.', } = props;
        // Create a security group for the bastion host
        const bastionSecurityGroup = new ec2.SecurityGroup(this, stack.getResourceID('BastionSecurityGroup'), {
            vpc,
        });
        // Allow SSH access from anywhere
        bastionSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
        // Create a key pair
        const key = new ec2.CfnKeyPair(this, stack.getResourceID('BastionKeyPair'), {
            keyName: stack.getFullResourceId('BastionKeyPair'),
            keyType: 'ed25519',
        });
        // Create the bastion host
        const bastion = new ec2.Instance(this, stack.getResourceID('BastionHost'), {
            vpc,
            securityGroup: bastionSecurityGroup,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.NANO),
            machineImage: ec2.MachineImage.latestAmazonLinux2(),
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            keyName: key.keyName,
        });
        bastion.connections.allowFromAnyIpv4(ec2.Port.tcp(22), 'SSH access from the internet');
        // Allow the bastion host to connect to the database
        this.rdsInstance.connections.allowFrom(bastion, ec2.Port.tcp(5432));
        // Allocate an Elastic IP
        const bastionEip = new ec2.CfnEIP(this, stack.getResourceID('BastionEIP'));
        // Associate the Elastic IP with the bastion host
        new ec2.CfnEIPAssociation(this, stack.getResourceID('BastionEipAssociation'), {
            eip: bastionEip.ref,
            instanceId: bastion.instanceId,
        });
        // Create hostname for ssh. for bastion
        new route53_1.ARecord(this, stack.getResourceID('BastionRecordSet'), {
            subDomainIncludingDot: bastionSubdomainIncludingDot,
            target: route53.RecordTarget.fromIpAddresses(bastionEip.attrPublicIp),
            stack,
            zone,
        });
    }
}
exports.PostgresInstanceWithBastion = PostgresInstanceWithBastion;
