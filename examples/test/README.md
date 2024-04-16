# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

Times this infra is manually deployed (9).

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

### Setup

When you are running CDK you will need to setup a profile in your ~/.aws/config for the account

```
[profile williampike-uat]
region = ap-southeast-2
source_profile = default
role_arn = arn:aws:iam::<account.id>:role/PixelFusionAdmin
mfa_serial = arn:aws:iam::864680957887:mfa/<your.username>
```

Where <account.id> is the AWS account you are deploying to, and <your.username>
is your pixelfusion username

You can comment out mfa_serial but it's good to have 2FA security

Make sure to copy .env.example to .env and fill out.

