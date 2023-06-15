# Codebuild with Pipeline

This stack will create a codebuild project, register a pipeline, and create
two webhooks. One webhook is automatically registered with github, while
a second custom hook is created that you can use for other services
E.g. contentful.

Below is an example pipeline and build for https://github.com/myorg/myproject,
deploying from the same branch as the current enivoronment.

You would need to create a github token, and store it in
the secret `mysite/githubtoken:SecretValue:secret`.

An additional secret token should be setup at `mysite/pipeline:SecretValue:secret`
for an additional webhook to be used by contentful.

[See bootstrapping for instructions on hydrating secrets](./bootstrap.md)

```typescript
// Codebuild pipeline
const pipeline = new BuildPipeline(this, stack.getResourceID('BuildPipeline'), {
    githubRepositoryOwner: 'myorg',
    githubRepositoryName: 'myproject',
    githubBranchName: stack.getProperty('branch'),
    webhookSecretName: stack.getSecretName('pipeline'),
    webhookSecretKey: 'secret',
    githubAccessTokenSecretName: stack.getSecretName('githubtoken'),
    githubAccessTokenSecretKey: 'secret',
    stack,
    environment: {
        GATSBY_S3_BUCKET: bucket.bucket.bucketName,
        CLOUDFRONT_DISTRIBUTION: distribution.distribution.distributionId,
    },
})

new cdk.CfnOutput(this, 'CodebuildWebhookUrl', {
    description: 'URL to use for codebuild webhook',
    value: pipeline.externalWebhook.attrUrl,
})
```

## Registering the webhook

The additional webhook should be setup in contentful. You should customise
the webhook payload to include the secret you specified above.

```json
{
  "secret": "<my secret>"
}
```
