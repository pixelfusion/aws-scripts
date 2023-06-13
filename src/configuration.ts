import * as cdk from 'aws-cdk-lib'

/**
 * Props required for a single stack. slug, account_id and region need to be declared
 * either at the stack or the stage level.
 *
 * Note that stack con contain multiple services, and most projects only have a single stack.
 */
export interface StackProps extends Record<string, any> {
  name: string
  slug?: string
  account_id?: string
  region?: string
}

/**
 * Represents a single stack in an environment
 */
export class StackConfig {
  /**
   * ID of this stack
   * @private
   */

  private readonly id: string
  /**
   * Parent stage to inherit configuration from
   * @private
   */
  private readonly stage: Stage

  /**
   * Properties specific to this stack
   * @private
   */
  private readonly stack: StackProps

  /**
   * Build a new stack, linking to a parent stage
   *
   * @param {string} id
   * @param {Configuration} stage Stage details
   * @param {StackProps} stack Properties for the specific stack
   */
  constructor(id: string, stage: Stage, stack: StackProps) {
    this.id = id
    this.stage = stage
    this.stack = stack
  }

  /**
   * Get ID for this stack
   */
  getId = (): string => {
    return this.id
  }

  /**
   * Main slug to identify this stack by. Used for ECR and secret prefixes.
   *
   * @return {string} slug
   */
  getSlug = (): string => {
    return this.getProperty('slug')
  }

  /**
   * Get account ID for this stack
   *
   * @return {string} account ID
   */
  getAccountId = (): string => {
    return this.getProperty('account_id')
  }

  /**
   * Get AWS region for this stack
   *
   * @return {string} Region
   */
  getRegion = (): string => {
    return this.getProperty('region')
  }

  /**
   * Get human-readable name for this stack
   *
   * @return {string} name of this tack
   */
  getStackName = (): string => {
    return this.stack.name
  }

  /**
   * Get the stage
   *
   * @return {Stage}
   */
  getStage = (): Stage => {
    return this.stage
  }

  /**
   * Lookup name of stage
   *
   * @return {string} name of this stage
   */
  getStageName = (): string => {
    return this.stage.getStageName()
  }

  /**
   * Lookup id of stage
   *
   * @return {string} id of this stage
   */
  getStageId = (): string => {
    return this.stage.getId()
  }

  /**
   * Get a named property from this stack. Can be used for any specific
   * input parameter to configure a stack.
   *
   * @param {string} name Key specified in cdk.json for the value we want to lookup for this stack.
   * @param {string|undefined} default_value If default value is omitted, this value is mandatory.
   * @return {string} value of this property
   */
  getProperty = (
    name: string,
    default_value: undefined | string = undefined,
  ): string => {
    // Look up stack-specific property, failing over to stage if not overridden for this stack
    const value =
      this.stack?.[name] || this.stage.getProperty(name) || default_value
    if (value) {
      return value
    }
    throw new Error(`Missing value ${name} for stack`)
  }

  /**
   * Get build environment required by an CDK stack
   *
   * @return {cdk.Environment} CDK required environment configuration
   */
  getEnvironment = (): cdk.Environment => {
    return {
      account: this.getAccountId(),
      region: this.getRegion(),
    }
  }

  /**
   * Generate AWS stack props
   *
   * @return {cdk.StackProps}
   */
  getStackProps = (): cdk.StackProps => {
    return {
      env: this.getEnvironment(),
    }
  }

  /**
   * Generate a resource ID for any component.
   * Useful for generating a stack identifier for a resourc.
   *
   * @param {string} name
   * @return {string} Full ID for this resource
   */
  getFullResourceId = (name: string): string => {
    return `${this.getBaseResourceId()}-${name}`
  }

  /**
   * Build an export value that can be used across stacks in the same stage.
   * Note that stack name is excluded since these are shared between stacks
   *
   * @param {string} name Unique name within this stage to export
   * @return {String} an export
   */
  getStackExportId = (name: string): string => {
    return `${this.getSlug()}-${this.getStageId()}-${name}`
  }

  /**
   * Get base resource ID. Useful for the base stack name.
   *
   * @eturn {string}
   */
  getBaseResourceId = (): string => {
    return `${this.getSlug()}-${this.getStageId()}-${this.getId()}`
  }

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
  getSecretArn = (name: string, key: string): string => {
    return `${this.getSecretBaseArn()}/${name}:${key}::`
  }

  /**
   * Generate base secret ARN up until the slug prefix.
   * Useful for creating wildcard permissions to allow access to a specific
   * prefix within an account.
   *
   * E.g. arn:aws:secretmanager:ap-southeast-2:11111111:secret:myproject
   *
   * @return {string} Partial ARN for secrets
   */
  getSecretBaseArn = (): string => {
    return `${this.getBaseArn('secretsmanager')}:secret:${this.getSlug()}`
  }

  /**
   * Get name component of secret from full ARN.
   * Useful for instructing services which key to store a secret inside
   *
   * E.g. myproject/rds
   *
   * @return {string}
   */
  getSecretName = (name: string): string => {
    return `${this.getSlug()}/${name}`
  }

  /**
   * Get base ARN for any specified service.
   * Useful for constructing full ARN for abstract services in this account.
   *
   * E.g. arn:aws:secretmanager:ap-southeast-2:11111111
   *
   * @param {string} service
   * @return {string} Base ARN for this service
   */
  getBaseArn = (service: string): string => {
    return `arn:aws:${service}:${this.getRegion()}:${this.getAccountId()}`
  }

  /**
   * Helper to convert a resource name to a resource ID.
   * Useful for creating named identifier for resources within stacks.
   *
   * @param {string} name
   * @return {string}
   */
  getResourceID = (name: string): string => {
    return name.replace(/[^A-Za-z0-9-]/gi, '-')
  }
}

/**
 * Props that are shared across all stacks within a single stage
 */
export interface StageProps extends StackProps {
  stacks: Record<string, StackProps>
}

/***
 * Represents a stage that contains any number of stacks for this project.
 * E.g. "UAT".
 */
export class Stage {
  /**
   * ID of this stage
   * @private
   */

  private readonly id: string

  /**
   * Stage props
   * @private
   */
  private readonly stage: StageProps

  constructor(id: string, stage: StageProps) {
    this.id = id
    this.stage = stage
  }

  /**
   * Get ID for this stage
   */
  getId = (): string => {
    return this.id
  }

  /**
   * Main slug to identify this stack by. Used for ECR and secret prefixes.
   */
  getSlug = (): undefined | string => {
    return this.getProperty('slug')
  }

  /**
   * Get human-readable name for this stage
   */
  getStageName = (): string => {
    return this.stage.name
  }

  /**
   * Get a named property from this stage
   * @param name
   */
  getProperty = (name: string): undefined | string => {
    return this.stage?.[name]
  }

  /**
   * Lookup and generate a stack for the given name
   *
   * @param {string} id ID of this stack
   * @return {StackConfig} The generated stack
   */
  getStack = (id: string): StackConfig => {
    const stackProps = this.stage.stacks?.[id]
    if (!stackProps) {
      throw new Error(`Invalid stack ${id}`)
    }
    return new StackConfig(id, this, stackProps)
  }
}
