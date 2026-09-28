import { sqsClient } from '@repo/clients/sqs';
import { env } from '@repo/env/server';

import { SendMessageCommand } from '@aws-sdk/client-sqs';

export async function enqueueTranscodeJob(transcodeJobId: string) {
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: env.AWS_TRANSCODE_QUEUE_URL,
      MessageBody: JSON.stringify({ transcodeJobId }),
    }),
  );
}
