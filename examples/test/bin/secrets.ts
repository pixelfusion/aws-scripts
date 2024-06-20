#!/usr/bin/env node
import 'source-map-support/register'
import { generateSecretManager, hydrateSecret } from '@pixelfusion/aws-scripts'
import * as crypto from 'crypto'
import * as passwordGenerator from 'generate-password'

/**
 * Generate secret defaults for our app
 */
async function generateSecrets() {
  // Admin secrets
  {
    const client = generateSecretManager({
      region: 'ap-southeast-2',
    })

    // Laravel app key
    const rawAppKey: string = crypto.randomBytes(64).toString('hex')
    const appKey: string =
      'base64:' +
      crypto.createHash('sha256').update(rawAppKey, 'utf8').digest('base64')

    // Admin password
    const password = passwordGenerator.generate({ length: 10 })

    const secrets: Record<string, string> = {
      APP_KEY: appKey,
      APP_ADMIN_NAME: 'admin',
      APP_ADMIN_EMAIL: 'info@pixelfusion.co.nz',
      APP_ADMIN_PASSWORD: password,
    }

    // Bootstrap secrets
    await hydrateSecret(client, 'CDKTest/AdminService', secrets)

  }
}

generateSecrets()
