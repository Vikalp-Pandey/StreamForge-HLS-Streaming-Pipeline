import { env } from '@repo/env/server';

import { SQSClient } from '@aws-sdk/client-sqs';

export const sqsClient = new SQSClient({
  region: env.AWS_REGION,
});
