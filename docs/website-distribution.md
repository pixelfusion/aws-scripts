# Website distribution

This creates a cloudfront distribution useful for serving static content
from an s3 bucket.

Note that the distribution and aliases must be created separately; One
WebsiteDistributionAlias for each url served by the distribution.

```typescript
// create distribution
const distribution = new WebsiteDistribution(
  this,
  stack.getResourceID('Distribution'),
  {
    domainNames: [
      `${stack.getProperty('subdomain')}.${stack.getProperty(
        'hosted_zone_name',
      )}`,
    ],
    stack,
    certificate: certificate.certificate,
    bucket: bucket.bucket,
  },
)

new WebsiteDistributionAlias(
  this,
  stack.getResourceID('DistributionAlias'),
  {
    subDomainIncludingDot: `${stack.getProperty('subdomain')}.`,
    stack,
    zone,
    distribution: distribution.distribution,
  },
)
```
