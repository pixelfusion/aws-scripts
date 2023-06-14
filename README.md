# AWS Scripts

A lot of useful CDK scripts built to put together a set of useful, resuable solutions.

## Installation

You can add the library directly from github.

```bash
npm install github:pixelfusion/aws-scripts#master
```

## Setup

In your cdk.json you'll need to make sure you have a context structure that
includes both stages and stacks. A stage is normally bound to a single account,
and a stack is a stack inside that account.

E.g.

```json
{
  "context": {
    "stage": {
      "uat": {
        "name": "UAT",
        "slug": "My Site",
        "account_id": "111111111111",
        "hosted_zone_name": "mysite.com",
        "stacks": {
          "bootstrap": {
            "name": "Bootstrap",
            "region": "ap-southeast-2"
          },
          "admin": {
            "name": "Admin",
            "region": "ap-southeast-2"
          },
          "website": {
            "region": "us-east-1",
            "name": "Website",
            "subdomain": "www"
          }
        }
      }
    }
  }
}
```

At either the stage or stack level the below must always be provided:

- name - The name of the stage / stack (required for both)
- account_id - The AWS account to run against
- region - The AWS region to run against
- slug - An identifying slug to use for prefixes / urls internally

When bootstrapping your app you will create a stage and a stack instance
as below.

Stack name is normally passed in via `--context stack=<stackname>` when
running cdk, or just hard-code it if you have only one stack

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StackConfig, Stage, StageProps } from "@pixelfusion/aws-scripts"
import { WebsiteStack } from "../src/website";

const env = process.env.APP_ENV as string;
const app = new cdk.App();

// Build stage from environment
const stageContext: StageProps = app.node.tryGetContext('stage')[`${ env }`];
const stage: Stage = new Stage(env, stageContext);

// Get stack configuration
const stackName: string = app.node.tryGetContext('stack');
const stack: StackConfig = stage.getStack('website')

// Create base stack
new WebsiteStack(app, stack.getBaseResourceId(), stack.getStackProps(), stack);
```

Configuration can be done at the stage level, or if you need to override
it for a single stack, you can set it in the stack itself.

## List of components

### Certificates

SSL Certificates provided by AWS ACM

```typescript
import { Certificate } from "@pixelfusion/aws-scripts";

// Create a certificate in ACM for the domain
const certificate = new Certificate(
  this,
  stack.getResourceID('Certificate'),
  {
    parameters: {
      subDomain: stack.getProperty('subdomain'),
    }
  },
  stack,
  zone
);
```

This will create and validate a certificate within a domain attached to a zone,
optionally prefixed with a subdomain. E.g. mysite.com with subDomain website
would create a certificate for website.mysite.com / *.website.mysite.com

This has a public `.certificate` property in case you need to extract
the internally created AWS CDK acm.Certificate.

### ECR Repository

Docker repository provided by AWS ECR

```typescript
import { EcrRepositoryStack } from "@pixelfusion/aws-scripts";

// Register admin ECR
new EcrRepositoryStack(
  this,
  stack.getResourceID('EcrRepository'),
  {},
  stack,
  'Admin'
)
```

### Fargate

Creates a fargate cluster, and registers one or more services with it.

Start by creating a fargate cluster directly with AWS, and then passing
it to the FargateService stack to register a service with load balancer.

```typescript
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";

const vpc = new ec2.Vpc(this, stack.getResourceID('Vpc'), {
  maxAzs: 2,
  natGateways: 1,
});
const cluster = new ecs.Cluster(this, stack.getResourceID("Fargate"), {
  vpc: vpc,
});
```

Secondly you need to create a task definition factory for your service.
This will help you register all your environment variables etc... that
will be used to run your service.

Here is an example of a factory. This loads a base task definition from either
an env.uat.json or env.prod.json, and then decorates it.

```typescript
import { EnvFactory, loadJsonFile } from "@pixelfusion/aws-scripts"

const adminFactory: EnvFactory = (stack, defaults) => {
    const json = loadJsonFile(__dirname, `../../admin/env.${ stack.getStageId() }.json`);
    return {
        ...json,
        environment: {
            ...json.environment,
            AWS_BUCKET: defaults['AWS_BUCKET'],
        }
    };
};


export default adminFactory;
```

Now you can create your service and attach it to this cluster with the
generated task definition.

```typescript
import { FargateService } from "@pixelfusion/aws-scripts";

// Build environment from admin
const adminEnvironment = adminFactory(stack, {
    AWS_BUCKET: assetBucket.bucket.bucketName,
})

// Admin Service
const service = new FargateService(
    this,
    stack.getResourceID('Admin'),
    {
        parameters: {
            imageVersion: adminVersion,
        },
    },
    stack,
    cluster,
    certificate.certificate,
    zone,
    repository,
    adminEnvironment
);
```

Once the service is created you can access the internal AWS service via the `.service`
property, in case you need to add any extra permissions.

```typescript
// After creating the service add a few more permissions
const taskDefinition = service.service.taskDefinition;
taskDefinition.addToExecutionRolePolicy(
    new iam.PolicyStatement({
        actions: [ 's3:*' ],
        resources: [
            assetBucket.bucket.bucketArn,
            `${ assetBucket.bucket.bucketArn }/*`,
        ]
    })
);
```

### Github

Helper for creating a github user with necessary permissions to deploy stacks
to AWS. The cdk will need to run as this user in order to have enough
permissions to create resources in AWS.

```typescript
import { GithubDeployStack } from "@pixelfusion/aws-scripts";

// Create deployer
new GithubDeployStack(
    this,
    stack.getResourceID('GithubDeploy'),
    {}
);
```

### RDS

Create RDS databases for AWS. Currently there are two flavours of RDS:

 - postgres
 - postgres, but with a bastion server

If you are using a bastion server, a new SSH key is generated and stored
in parameter store for you to retrieve after.

DB credentials are stored in secret manager

```typescript
import { PostgresInstanceWithBastion } from "@pixelfusion/aws-scripts";

new PostgresInstanceWithBastion(
    this,
    stack.getResourceID('Database'),
    {},
    stack,
    vpc,
    zone
);
```

### Route 53

Create A-records or aliases to AWS services.

Each record must be provided a specific target specification. E.g. an ALB,
S3 bucket, or cloudfront alias.

```typescript
import { ARecord } from "@pixelfusion/aws-scripts";

new ARecord(
  this,
  stack.getResourceID('Record'),
  {
    parameters: {
      subDomain: subDomain.valueAsString
    }
  },
  stack,
  zone,
  new targets.LoadBalancerTarget(this.service.loadBalancer)
);
```

### S3

Create an S3 storage bucket.

```typescript
import { S3Bucket } from "@pixelfusion/aws-scripts";

const assetBucket = new S3Bucket(
    this,
    stack.getResourceID('Assets'),
    {
        parameters: {
            publicPath: 'public/*',
            bucketAccess: 'Public',
        },
    },
    stack
);
```

The bucket has a `.bucket` property you can use to access
the exposed S3 bucket reference. E.g. to get the bucket name
after creation.
