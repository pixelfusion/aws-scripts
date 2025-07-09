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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityGroup = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
/**
 * Default security group suitable for a basic ECS service
 */
class SecurityGroup extends cdk.NestedStack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { vpc, incomingPorts } = props;
        this.securityGroup = new ec2.SecurityGroup(this, `${id}Group`, {
            vpc,
            description: 'Allows HTTP/HTTPS ingress and all egress traffic',
            allowAllOutbound: true,
            allowAllIpv6Outbound: true,
        });
        const portsToOpen = incomingPorts || [80, 443];
        // Open all selected ports
        portsToOpen.forEach((port) => {
            this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(port), `Allow ${port} from anywhere (IPv4)`);
            this.securityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(port), `Allow ${port} from anywhere (IPv6)`);
        });
    }
}
exports.SecurityGroup = SecurityGroup;
