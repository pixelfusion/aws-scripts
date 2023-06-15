# Configuration

## cdk.json configuration

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
        "slug": "mysite",
        "account_id": "111111111111",
        "removal_policy": "destroy",
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

You can also supply the optional `removal_policy`, which will
change the default policies for removal to either `retain` or `destroy`
for resources like RDS or S3. You can still override these on a
per-resource or per-stack basis. This is useful for specifying a
certain environment (E.g. uat) has no need for persistent resources,
especially if this environment has frequently changing resources.

## CDK entrypoint

When bootstrapping your app you will create a stage and a stack instance
as below.

Your entrypoint would declare all stacks, and you would specify which
stack you wish to deploy on the cdk command line. E.g.

```bash
# Deploy all stacks
npx cdk deploy --all
# Deploy this one stack
npx cdk deploy MySite-$(APP_ENV)-website
```

This would be your entrypoint script:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Stage, StageProps } from "@pixelfusion/aws-scripts"
import { WebsiteStack } from "../src/website";

const env = process.env.APP_ENV as string;
const app = new cdk.App();

// Build stage from environment
const stageContext: StageProps = app.node.tryGetContext('stage')[`${ env }`];
const stage: Stage = new Stage(env, stageContext);

// Base stack
{
    const stack = stage.getStack('website')
    new WebsiteStack(app, stack.getBaseResourceId(), stack.getStackProps(), stack);
}
```

Configuration can be done at the stage level, or if you need to override
it for a single stack, you can set it in the stack itself.
