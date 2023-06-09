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
    constructor(scope, id, props) {
        super(scope, id, props);
        const { subDomainIncludingDot = '', stack, zone } = props;
        // Create a certificate in ACM for the domain
        this.certificate = new acm.Certificate(this, stack.getResourceID('Certificate'), {
            domainName: `${subDomainIncludingDot}${zone.zoneName}`,
            subjectAlternativeNames: [`*.${subDomainIncludingDot}${zone.zoneName}`],
            validation: acm.CertificateValidation.fromDns(zone),
        });
    }
}
exports.Certificate = Certificate;
