# VPC

Generate a VPC appropriate for use with these components.

This VPC will have two public and two private (with egress) subnets,
one for each AZ in the region, with no nat gateway or elastic IP.

```typescript
// Create the VPC
const vpc = new Vpc(this, 'VPC', {})

// Pass in the `vpc` property to other services
new PostgresInstanceWithBastion(this, stack.getResourceID('Database'), {
  stack,
  vpc: vpc.vpc,
  zone,
})
```
