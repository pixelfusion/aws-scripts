# RDS

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
