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
exports.EcrRepositoryStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
/**
 * Creates an ECR repository for uploading docker images to
 */
class EcrRepositoryStack extends cdk.NestedStack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stack, service, 
        // ECR can normally be destroyed by default
        removalPolicy = stack.getRemovalPolicy(cdk.RemovalPolicy.DESTROY), } = props;
        // Create an ECR repositories
        const slug = stack.getSlug().toLowerCase();
        const repositoryName = `${slug}/${service.toLowerCase()}`;
        const repository = new ecr.Repository(this, stack.getResourceID(`${service}ECRRepository`), {
            repositoryName,
            removalPolicy,
        });
        repository.addLifecycleRule({
            description: 'Expire images older than 14 days',
            maxImageAge: cdk.Duration.days(14),
            rulePriority: 1,
            tagStatus: ecr.TagStatus.UNTAGGED,
        });
        repository.addLifecycleRule({
            description: 'Expire dev images older than 14 days',
            maxImageAge: cdk.Duration.days(14),
            rulePriority: 2,
            tagStatus: ecr.TagStatus.TAGGED,
            tagPrefixList: ['dev-'],
        });
        // Export
        const exportId = stack.getStackExportId(`${service}ECRRepository`);
        new cdk.CfnOutput(this, `${exportId}Export`, {
            description: `ECR Repository name for Admin`,
            exportName: exportId,
            value: repository.repositoryArn,
        });
    }
}
exports.EcrRepositoryStack = EcrRepositoryStack;
