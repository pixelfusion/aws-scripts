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
