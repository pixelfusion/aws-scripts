# Certificates

SSL Certificates provided by AWS ACM

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
would create a certificate for website.mysite.com / *.website.mysite.com

This has a public `.certificate` property in case you need to extract
the internally created AWS CDK acm.Certificate.
