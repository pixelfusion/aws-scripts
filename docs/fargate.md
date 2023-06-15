# Fargate

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
