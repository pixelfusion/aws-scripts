# ECR Repository

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
