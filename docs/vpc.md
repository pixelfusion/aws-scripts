# VPC

Generate a VPC appropriate for use with these components.

This VPC will have two public and two private (with egress) subnets,
one for each AZ in the region, with no nat gateway or elastic IP.

```typescript
// Create the VPC
const vpc = new Vpc(this, 'VPC', {})

// Pass in the `vpc` property to other services
new PostgresInstanceWithBastion(this, stack.getResourceID('Database'), {
  stack,
  vpc: vpc.vpc,
  zone,
})
```

Note that if you need secret manager access, some resources (like lambdas)
won't be able to access secret manager unless you add at least one
NAT gateway. Do this as below

```typescript
const vpc = new Vpc(this, 'VPC', {
  natGateways: 1
})

const rdsLambdaFn = new lambda_node.NodejsFunction(
  this,
  stack.getResourceID('Lambda'),
  {
    runtime: lambda.Runtime.NODEJS_18_X,
    entry: 'src/index.ts',
    functionName: 'lambda',
    vpc: vpc.vpc,
    vpcSubnets: vpc.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    }),
    securityGroups: [ lambdaSG ],
  },
)

// Grant read access to secrets
const secret = secretsmanager.Secret.fromSecretNameV2(
  this,
  stack.getResourceID('LambdaSecrets'),
  stack.getSecretName('lambda'),
)
secret.grantRead(rdsLambdaFn)
```
