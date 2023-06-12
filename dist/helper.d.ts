import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
/**
 * Loads a file from disk and turns into json
 *
 * @param {String} dirname Base directory
 * @param {String} relativePath Path to the file
 */
export declare const loadJsonFile: (dirname: string, relativePath: string) => any;
/**
 * Generate a secret manager client
 *
 * @return SecretsManagerClient
 */
export declare const generateSecretManager: (region?: string) => SecretsManagerClient;
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
export declare const hydrateSecret: (secretsManagerClient: SecretsManagerClient, secretName: string, defaultValue: Record<string, string>) => Promise<void>;
