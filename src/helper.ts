import {
  CreateSecretCommand,
  GetSecretValueCommand,
  ResourceNotFoundException,
  SecretsManagerClient,
  UpdateSecretCommand,
} from '@aws-sdk/client-secrets-manager'
import { fromIni, fromEnv } from '@aws-sdk/credential-providers'
import * as readline from 'readline'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Loads a file from disk and turns into json
 *
 * @param {String} dirname Base directory
 * @param {String} relativePath Path to the file
 */
export const loadJsonFile = (dirname: string, relativePath: string) => {
  const absolutePath = path.resolve(dirname, relativePath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File does not exist: ${absolutePath}`)
  }

  const jsonData = fs.readFileSync(absolutePath, 'utf-8')
  return JSON.parse(jsonData)
}

/**
 * Check if the given error is a ResourceNotFoundException
 *
 * @param error
 * @return bool
 */
function isResourceNotFoundError(
  error: unknown,
): error is ResourceNotFoundException {
  return !!(
    error &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'ResourceNotFoundException'
  )
}

// Helper function for node-js
function prompt(query: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise<string>((resolve) =>
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans)
    }),
  )
}

/**
 * Helper to load a credential for an sdk client
 *
 * @param ci
 */
function getCredentials(ci = process.env.CI) {
  if (ci) {
    return fromEnv()
  }

  return fromIni({
    mfaCodeProvider: async (serial: string) =>
      await prompt(`Type the mfa token for the following account: ${serial}\n`),
  })
}

/**
 * Generate a secret manager client
 *
 * @return SecretsManagerClient
 */
export const generateSecretManager = (
  region?: string,
): SecretsManagerClient => {
  return new SecretsManagerClient({
    credentials: getCredentials(),
    ...(region ? { region } : {}),
  })
}

/**
 * Create or update a secret with a list of values.
 * If you specify a value for a secret that has new keys,
 * these will be merged into the secret and updated, but
 * will not overwrite any existing secrets
 *
 * @param secretsManagerClient SDK client for secrets
 * @param secretName key of the given secret
 * @param defaultValue Record of values to use
 */
export const hydrateSecret = async (
  secretsManagerClient: SecretsManagerClient,
  secretName: string,
  defaultValue: Record<string, string>,
): Promise<void> => {
  try {
    console.log(`Processing secret ${secretName}`)

    // Check if the secret exists
    const getSecretValueCommand = new GetSecretValueCommand({
      SecretId: secretName,
    })
    const existingSecret = await secretsManagerClient.send(
      getSecretValueCommand,
    )
    const existingValue = existingSecret.SecretString
      ? JSON.parse(existingSecret.SecretString)
      : {}

    // Merge in any secret values not yet saved
    let anyChanged = false
    for (const [name, value] of Object.entries(defaultValue)) {
      if (!(name in existingValue)) {
        anyChanged = true
        existingValue[name] = value
      }
    }

    // If we have any changes update
    if (anyChanged) {
      const updateSecretCommand = new UpdateSecretCommand({
        SecretId: existingSecret.ARN,
        SecretString: JSON.stringify(existingValue),
      })
      console.log('Secret has changed, updating')
      await secretsManagerClient.send(updateSecretCommand)
    } else {
      console.log('Secret has been left in place')
    }
  } catch (error) {
    // Secret does not exist, create it
    if (isResourceNotFoundError(error)) {
      const createSecretCommand = new CreateSecretCommand({
        Name: secretName,
        SecretString: JSON.stringify(defaultValue),
      })
      console.log('Secret is being created')
      await secretsManagerClient.send(createSecretCommand)
    } else {
      // Unexpected error occurred
      throw error
    }
  }
}
