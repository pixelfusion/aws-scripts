import { EnvFactory, loadJsonFile } from "@pixelfusion/aws-scripts"
import * as cdk from 'aws-cdk-lib'

const adminFactory: EnvFactory = (stack, defaults) => {
  const json = loadJsonFile(__dirname, `../../admin/env.${ stack.getStageId() }.json`);
  return {
    ...json,
    environment: {
      ...json.environment,
      AWS_BUCKET: defaults['AWS_BUCKET'],
    },
    // Allow 10 minutes to do migrate etc...
    healthCheckGracePeriod: cdk.Duration.minutes(10),
  };
};


export default adminFactory;
