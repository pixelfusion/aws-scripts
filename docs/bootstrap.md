# Bootstrap setup

When setting up your environment there are normally a couple of things
you need to do:

- Bootstrap CDK features on your AWS account
- Bootstrap your CI/CD pipeline with necessary permissions
- Bootstrap all secrets necessary for deployment

## Bootstrap AWS account

Setting up CDK is pretty simple, and is run as below

```bash
npx cdk bootstrap --all
```

This will setup the standard CDK stack, bucket, etc... on your  qaccount.

See https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html for more documentation

## Bootstrap CI/CD

Normally with a CI/CD pipeline you would need to create a user with
necessary authentication, and load these credentials into your pipeline.

Note that the example below targets github actions, but the general
process is similar for other pipelines.

For github, for example, we have a stardard `GithubDeployStack` that
you can use for setting up the necessary requirements.

If your CI/CD requires other resources prior to infrastructure build,
such as an ECR repository for releasing your code to (to be used as a source
for code deployments by your main stack) then best practice is to bundle
all of these into a single bootstrap stack and run this manually from
your local environment.

Below is an example bootstrap stack that sets up a github user,
and an ECR repository.

```typescript
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import {
  StackConfig,
  GithubDeployStack,
  EcrRepositoryStack,
} from '@pixelfusion/aws-scripts'

/**
 * Bootstrap CI / CD environment by creating a github user and ECR for admin
 */
export class BootstrapStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps,
    stack: StackConfig,
  ) {
    super(scope, id, props)

    // Create deployer
    const githubDeployStack = new GithubDeployStack(
      this,
      stack.getResourceID('GithubDeploy'),
      {},
    )

    // Register admin ECR
    new EcrRepositoryStack(this, stack.getResourceID('EcrRepository'), {
      stack,
      service: 'Admin',
    })

    // Define the outputs in the parent stack
    new cdk.CfnOutput(this, 'GithubUserAccessKeyID', {
      description: 'Value of AWS_ACCESS_KEY_ID for github secrets',
      value: githubDeployStack.githubActionsUserAccessKey.ref,
    })

    new cdk.CfnOutput(this, 'GithubUserSecretAccessKey', {
      description: 'Value of AWS_SECRET_ACCESS_KEY for github secrets',
      value: githubDeployStack.githubActionsUserAccessKey.attrSecretAccessKey,
    })
  }
}
```

This stack will setup an ecr repository with the slug `<appslug>/admin`,
and create a github user, echoing the user's API credentials to the
console. You are then able to pick these up, and load these as secrets
into github environment (if you are using such).

Your action for deploying this site could look similar to below:

```yaml
name: Release
on:
  push:
    branches:
      - master
      - release/uat
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  AWS_REGION: ap-southeast-2
  SLUG: mysite
jobs:
  prebuild:
    name: Prebuild setup and semantic release
    outputs:
      version: ${{ steps.tag.outputs.version }}
      app_env: ${{ steps.check_environment.outputs.environment }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Detect Aws creds key names
        id: check_environment
        uses: pixelfusion/actions/detect-environment@v1
      - name: Tag semantic release
        id: tag
        uses: pixelfusion/actions/tag@v1
  build-admin:
    name: Build
    runs-on: ubuntu-latest
    needs: prebuild
    environment:
      name: ${{ needs.prebuild.outputs.app_env }}
    outputs:
      docker_image: ${{ steps.admin_version.outputs.docker_image }}
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Build docker image for admin
        id: build_admin
        uses: pixelfusion/actions/build@v1
        with:
          build-dir: 'admin'
        env:
          VERSION: ${{ needs.prebuild.outputs.version }}
          AWS_REPOSITORY: ${{ env.SLUG }}/admin
          AWS_ACCOUNT: ${{ vars.AWS_ACCOUNT }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  deploy-infra:
    name: Deploy Infra
    runs-on: ubuntu-latest
    needs: [ prebuild, build-admin ]
    environment:
      name: ${{ needs.prebuild.outputs.app_env }}
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          mask-aws-account-id: false
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Deploy Infrastructure
        env:
          APP_ENV: ${{ needs.prebuild.outputs.app_env }}
        run: |
          cd infra
          npm ci
          npx cdk deploy \
            --context version=${{ needs.prebuild.outputs.version }} \
            --require-approval never \
            ${{ env.SLUG }-${{ env.APP_ENV }}-admin
```

## Bootstrap secrets

Because CDK does not have a native way for checking and gracefully hydrating
new secrets it's necessary for application secrets to be bootstrap via
a distinct step, using the AWS SDK.

You can use some of the useful utilities in this package to help ensure that
your deployment has a good set of defaults for any necessary secrets.

The below is an example of a `bin/secrets.ts` script that will check
the secret store, and update any missing values with generated defaults.

Note that this utility is safely idempotent; It will not overwrite the
existing value if one already exists.

```typescript
#!/usr/bin/env node
import 'source-map-support/register'
import { generateSecretManager, hydrateSecret } from '@pixelfusion/aws-scripts'
import * as crypto from 'crypto'
import * as passwordGenerator from 'generate-password'

/**
 * Setup a secret token for codebuild webhook
 */
async function generateSecrets() {
  {
    // Update to specific region
    const client = generateSecretManager({ region: 'us-east-1' })

    // Ensure that mysite/pipeline:SecretString:secret:: has a value
    const secret = passwordGenerator.generate({ length: 32 })
    await hydrateSecret(client, 'mysite/pipeline', { secret })
  }
}

generateSecrets()
```

You can also run this script as a part of your build pipeline if necessary.

```yaml
  - name: Bootstrap secrets
    run: |
      cd infra
      npm ci
      npx ts-node ./bin/secrets.ts
```

This could also be safely used for things like generating a default admin
password, laravel app keys, or database salts. You could even use it for
exporting select github secrets into secret manager if necessary.
