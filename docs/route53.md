# Route 53

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

