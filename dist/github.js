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
exports.GithubDeployStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
/**
 * Stack to generate a GitHub deployer, along with key and secret for loading into GitHub secrets
 */
class GithubDeployStack extends cdk.NestedStack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { secretName = 'bootstrap/github' } = props || {};
        // Create IAM user
        const githubDeployUser = new iam.User(this, 'GithubDeployUser', {
            path: '/',
        });
        // Attach policies to the user
        const adminPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['*'],
                    resources: ['*'],
                }),
            ],
        });
        githubDeployUser.attachInlinePolicy(new iam.Policy(this, 'GithubActionsAdministrator', {
            policyName: 'GithubActionsAdministrator',
            document: adminPolicy,
        }));
        // Create access key for the user
        this.githubActionsUserAccessKey = new iam.CfnAccessKey(this, 'GithubActionsUserAccessKey', {
            userName: githubDeployUser.userName,
        });
        // Store key in secret manager
        new secretsmanager.Secret(this, 'GithubActionsUserSecret', {
            secretName,
            secretStringValue: cdk.SecretValue.unsafePlainText(JSON.stringify({
                AWS_USER_NAME: this.githubActionsUserAccessKey.userName,
                AWS_ACCESS_KEY_ID: this.githubActionsUserAccessKey.ref,
                AWS_SECRET_ACCESS_KEY: this.githubActionsUserAccessKey.attrSecretAccessKey,
            })),
        });
    }
}
exports.GithubDeployStack = GithubDeployStack;
