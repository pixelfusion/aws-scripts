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
exports.Stage = exports.StackConfig = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
/**
 * Represents a single stack in an environment
 */
class StackConfig {
    /**
     * Build a new stack, linking to a parent stage
     *
     * @param {string} id
     * @param {Configuration} stage Stage details
     * @param {StackProps} stack Properties for the specific stack
     */
    constructor(id, stage, stack) {
        /**
         * Get ID for this stack
         */
        this.getId = () => {
            return this.id;
        };
        /**
         * Main slug to identify this stack by. Used for ECR and secret prefixes.
         *
         * @return {string} slug
         */
        this.getSlug = () => {
            return this.getProperty('slug');
        };
        /**
         * Get account ID for this stack
         *
         * @return {string} account ID
         */
        this.getAccountId = () => {
            return this.getProperty('account_id');
        };
        /**
         * Get AWS region for this stack
         *
         * @return {string} Region
         */
        this.getRegion = () => {
            return this.getProperty('region');
        };
        /**
         * Get human-readable name for this stack
         *
         * @return {string} name of this tack
         */
        this.getStackName = () => {
            return this.stack.name;
        };
        /**
         * Get the stage
         *
         * @return {Stage}
         */
        this.getStage = () => {
            return this.stage;
        };
        /**
         * Lookup name of stage
         *
         * @return {string} name of this stage
         */
        this.getStageName = () => {
            return this.stage.getStageName();
        };
        /**
         * Lookup id of stage
         *
         * @return {string} id of this stage
         */
        this.getStageId = () => {
            return this.stage.getId();
        };
        /**
         * Get a named property from this stack. Can be used for any specific
         * input parameter to configure a stack.
         *
         * @param {string} name Key specified in cdk.json for the value we want to lookup for this stack.
         * @param {string|undefined} default_value If default value is omitted, this value is mandatory.
         * @return {string} value of this property
         */
        this.getProperty = (name, default_value = undefined) => {
            // Look up stack-specific property, failing over to stage if not overridden for this stack
            const value = this.stack?.[name] ?? this.stage.getProperty(name) ?? default_value;
            if (value) {
                return value;
            }
            throw new Error(`Missing value ${name} for stack`);
        };
        /**
         * Get the standard removal policy for this tack
         * @param default_value
         */
        this.getRemovalPolicy = (default_value = cdk.RemovalPolicy.RETAIN) => {
            return (this.stack.removal_policy ??
                this.stage.getProps().removal_policy ??
                default_value);
        };
        /**
         * Get build environment required by an CDK stack
         *
         * @return {cdk.Environment} CDK required environment configuration
         */
        this.getEnvironment = () => {
            return {
                account: this.getAccountId(),
                region: this.getRegion(),
            };
        };
        /**
         * Generate AWS stack props
         *
         * @return {cdk.StackProps}
         */
        this.getStackProps = () => {
            return {
                env: this.getEnvironment(),
            };
        };
        /**
         * Generate a resource ID for any component.
         * Useful for generating a stack identifier for a resourc.
         *
         * @param {string} name
         * @return {string} Full ID for this resource
         */
        this.getFullResourceId = (name) => {
            return `${this.getBaseResourceId()}-${name}`;
        };
        /**
         * Build an export value that can be used across stacks in the same stage.
         * Note that stack name is excluded since these are shared between stacks
         *
         * @param {string} name Unique name within this stage to export
         * @return {String} an export
         */
        this.getStackExportId = (name) => {
            return `${this.getSlug()}-${this.getStageId()}-${name}`;
        };
        /**
         * Get base resource ID. Useful for the base stack name.
         *
         * @eturn {string}
         */
        this.getBaseResourceId = () => {
            return `${this.getSlug()}-${this.getStageId()}-${this.getId()}`;
        };
        /**
         * Generate a resource ARN for any component.
         * Useful for specifying a full secret key to use for an ECS task definition
         *
         * E.g. arn:aws:secretmanager:ap-southeast-2:11111111:secret:myproject/rds:DB_PASSWORD::
         *
         * @param {string} name Secret identifier, excluding prefix slug
         * @param {string} key Key used inside this secret
         * @return {string} Full ARN for this secret
         */
        this.getSecretArn = (name, key) => {
            return `${this.getSecretBaseArn()}/${name}:${key}::`;
        };
        /**
         * Generate base secret ARN up until the slug prefix.
         * Useful for creating wildcard permissions to allow access to a specific
         * prefix within an account.
         *
         * E.g. arn:aws:secretmanager:ap-southeast-2:11111111:secret:myproject
         *
         * @return {string} Partial ARN for secrets
         */
        this.getSecretBaseArn = () => {
            return `${this.getBaseArn('secretsmanager')}:secret:${this.getSlug()}`;
        };
        /**
         * Get name component of secret from full ARN.
         * Useful for instructing services which key to store a secret inside
         *
         * E.g. myproject/rds
         *
         * @return {string}
         */
        this.getSecretName = (name) => {
            return `${this.getSlug()}/${name}`;
        };
        /**
         * Get base ARN for any specified service.
         * Useful for constructing full ARN for abstract services in this account.
         *
         * E.g. arn:aws:secretmanager:ap-southeast-2:11111111
         *
         * @param {string} service
         * @return {string} Base ARN for this service
         */
        this.getBaseArn = (service) => {
            return `arn:aws:${service}:${this.getRegion()}:${this.getAccountId()}`;
        };
        /**
         * Helper to convert a resource name to a resource ID.
         * Useful for creating named identifier for resources within stacks.
         *
         * @param {string} name
         * @return {string}
         */
        this.getResourceID = (name) => {
            return name.replace(/[^A-Za-z0-9-]/gi, '-');
        };
        if (!stage) {
            throw new Error(`Invalid stage ${id}`);
        }
        this.id = id;
        this.stage = stage;
        this.stack = stack;
    }
}
exports.StackConfig = StackConfig;
/***
 * Represents a stage that contains any number of stacks for this project.
 * E.g. "UAT".
 */
class Stage {
    constructor(id, stage) {
        /**
         * Get ID for this stage
         */
        this.getId = () => {
            return this.id;
        };
        /**
         * Get stage props
         */
        this.getProps = () => {
            return this.stage;
        };
        /**
         * Main slug to identify this stack by. Used for ECR and secret prefixes.
         */
        this.getSlug = () => {
            return this.getProperty('slug');
        };
        /**
         * Get human-readable name for this stage
         */
        this.getStageName = () => {
            return this.stage.name;
        };
        /**
         * Get a named property from this stage
         * @param name
         */
        this.getProperty = (name) => {
            return this.stage?.[name];
        };
        /**
         * Lookup and generate a stack for the given name
         *
         * @param {string} id ID of this stack
         * @return {StackConfig} The generated stack
         */
        this.getStack = (id) => {
            const stackProps = this.stage.stacks?.[id];
            if (!stackProps) {
                throw new Error(`Invalid stack ${id}`);
            }
            return new StackConfig(id, this, stackProps);
        };
        this.id = id;
        this.stage = stage;
    }
}
exports.Stage = Stage;
