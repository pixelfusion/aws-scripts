# AWS Scripts

A lot of useful CDK scripts built to put together a set of useful, resuable solutions.

## Installation

You can add the library directly from github.

```bash
npm install github:pixelfusion/aws-scripts#feat/distribution
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
```

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

Provided by acm.ts

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
would cerate a certificate for website.mysite.com / *.website.mysite.com

