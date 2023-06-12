"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Certificate = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
/**
 * Generates an ACMS certificate
 */
class Certificate extends cdk.NestedStack {
    constructor(scope, id, props, stack, zone) {
        super(scope, id, props);
        const subDomain = new cdk.CfnParameter(this, 'subDomain', {
            type: 'String',
            description: 'Subdomain to map to this service',
            default: '',
        });
        // Check if domain name given
        const hasSubDomain = new cdk.CfnCondition(this, 'HasSubDomainCondition', {
            expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(subDomain.valueAsString, '')),
        });
        // Create a certificate in ACM for the domain
        const certificate = new acm.CfnCertificate(this, stack.getResourceID('CfnCertificate'), {
            domainName: cdk.Fn.conditionIf(hasSubDomain.logicalId, `${subDomain.valueAsString}.${zone.zoneName}`, zone.zoneName).toString(),
            subjectAlternativeNames: [
                cdk.Fn.conditionIf(hasSubDomain.logicalId, `*.${subDomain.valueAsString}.${zone.zoneName}`, `*.${zone.zoneName}`).toString(),
            ],
            validationMethod: acm.ValidationMethod.DNS,
            domainValidationOptions: [
                {
                    domainName: cdk.Fn.conditionIf(hasSubDomain.logicalId, `*.${subDomain.valueAsString}.${zone.zoneName}`, `*.${zone.zoneName}`).toString(),
                    hostedZoneId: zone.hostedZoneId,
                },
            ],
        });
        // CDK prefers an ICertificate so wrap it here
        this.certificate = acm.Certificate.fromCertificateArn(this, stack.getResourceID('Certificate'), certificate.ref);
    }
}
exports.Certificate = Certificate;
