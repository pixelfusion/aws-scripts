#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { Stage, StageProps } from '@pixelfusion/aws-scripts'
import { BootstrapStack } from '../src/bootstrap'
import { AdminStack } from '../src/admin'
import adminFactory from '../src/admin.env'

const env = process.env.APP_ENV as string
const app = new cdk.App()

// Build stage from environment
const stageContext: StageProps = app.node.tryGetContext('stage')[`${env}`]
const stage: Stage = new Stage(env, stageContext)

// Create base stack
{
  const stack = stage.getStack('bootstrap')
  new BootstrapStack(
    app,
    stack.getBaseResourceId(),
    stack.getStackProps(),
    stack,
  )
}

// Create admin stack
{
  const adminVersion: string =
    app.node.tryGetContext('admin_version') || 'default'
  const stack = stage.getStack('admin')
  new AdminStack(
    app,
    stack.getBaseResourceId(),
    stack.getStackProps(),
    stack,
    adminVersion,
    adminFactory,
  )
}
