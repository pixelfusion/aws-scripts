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
exports.hydrateSecret = exports.generateSecretManager = exports.loadJsonFile = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const readline = __importStar(require("readline"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Loads a file from disk and turns into json
 *
 * @param {String} dirname Base directory
 * @param {String} relativePath Path to the file
 */
const loadJsonFile = (dirname, relativePath) => {
    const absolutePath = path.resolve(dirname, relativePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File does not exist: ${absolutePath}`);
    }
    const jsonData = fs.readFileSync(absolutePath, 'utf-8');
    return JSON.parse(jsonData);
};
exports.loadJsonFile = loadJsonFile;
/**
 * Check if the given error is a ResourceNotFoundException
 *
 * @param error
 * @return bool
 */
function isResourceNotFoundError(error) {
    return !!(error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'ResourceNotFoundException');
}
// Helper function for node-js
function prompt(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
    }));
}
/**
 * Helper to load a credential for an sdk client
 *
 * @param ci
 */
function getCredentials(ci = process.env.CI) {
    if (ci) {
        return (0, credential_providers_1.fromEnv)();
    }
    return (0, credential_providers_1.fromIni)({
        mfaCodeProvider: async (serial) => await prompt(`Type the mfa token for the following account: ${serial}\n`),
    });
}
/**
 * Generate a secret manager client
 *
 * @return SecretsManagerClient
 */
const generateSecretManager = (region) => {
    return new client_secrets_manager_1.SecretsManagerClient({
        credentials: getCredentials(),
        ...(region ? { region } : {}),
    });
};
exports.generateSecretManager = generateSecretManager;
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
const hydrateSecret = async (secretsManagerClient, secretName, defaultValue) => {
    try {
        console.log(`Processing secret ${secretName}`);
        // Check if the secret exists
        const getSecretValueCommand = new client_secrets_manager_1.GetSecretValueCommand({
            SecretId: secretName,
        });
        const existingSecret = await secretsManagerClient.send(getSecretValueCommand);
        const existingValue = existingSecret.SecretString
            ? JSON.parse(existingSecret.SecretString)
            : {};
        // Merge in any secret values not yet saved
        let anyChanged = false;
        for (const [name, value] of Object.entries(defaultValue)) {
            if (!(name in existingValue)) {
                anyChanged = true;
                existingValue[name] = value;
            }
        }
        // If we have any changes update
        if (anyChanged) {
            const updateSecretCommand = new client_secrets_manager_1.UpdateSecretCommand({
                SecretId: existingSecret.ARN,
                SecretString: JSON.stringify(existingValue),
            });
            console.log('Secret has changed, updating');
            await secretsManagerClient.send(updateSecretCommand);
        }
        else {
            console.log('Secret has been left in place');
        }
    }
    catch (error) {
        // Secret does not exist, create it
        if (isResourceNotFoundError(error)) {
            const createSecretCommand = new client_secrets_manager_1.CreateSecretCommand({
                Name: secretName,
                SecretString: JSON.stringify(defaultValue),
            });
            console.log('Secret is being created');
            await secretsManagerClient.send(createSecretCommand);
        }
        else {
            // Unexpected error occurred
            throw error;
        }
    }
};
exports.hydrateSecret = hydrateSecret;
