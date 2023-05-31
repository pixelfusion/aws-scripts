"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Certificate = void 0;
const cdk = require("aws-cdk-lib");
const acm = require("aws-cdk-lib/aws-certificatemanager");
/**
 * Generates an ACMS certificate
 */
class Certificate extends cdk.Stack {
    constructor(scope, id, props, stack, zone) {
        super(scope, id, props);
        // Create a certificate in ACM for the domain
        this.certificate = new acm.Certificate(this, stack.getResourceID('Certificate'), {
            domainName: `*.${zone.zoneName}`,
            subjectAlternativeNames: [],
            validation: {
                props: {
                    hostedZone: zone
                },
                method: acm.ValidationMethod.DNS
            }
        });
    }
}
exports.Certificate = Certificate;
