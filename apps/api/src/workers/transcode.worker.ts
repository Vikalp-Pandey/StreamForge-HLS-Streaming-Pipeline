import { env } from '@repo/env/server';

import {
  DeleteMessageCommand,
  type Message,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { logger } from '@packages/httputils';

import { sqsClient } from '@repo/clients/sqs';

import { processTranscodeJob } from '@/services/transcode/process-transcode-job.service';

interface TranscodeMessage {
  transcodeJobId: string;
}

function parseMessage(body: string): TranscodeMessage {
  const value = JSON.parse(body);

  if (
    typeof value !== 'object' ||
    value === null ||
    !('transcodeJobId' in value) ||
    typeof value.transcodeJobId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(value.transcodeJobId)
  ) {
    throw new Error('Invalid transcode queue message');
  }

  return { transcodeJobId: value.transcodeJobId };
}

async function processQueueMessage(input: Message) {
  if (!input.Body || !input.ReceiptHandle) {
    throw new Error('SQS message body or receipt handle is missing');
  }

  const message = parseMessage(input.Body);
  await processTranscodeJob(message.transcodeJobId);


  // Reciept Handle: SQS sends message + reciept handle to worker. 
  // After processing the message, the worker must send the reciept handle back to SQS to delete the message from the queue. If the worker fails to send the reciept handle back, SQS will re-queue the message after a visibility timeout.
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: env.AWS_TRANSCODE_QUEUE_URL,
      ReceiptHandle: input.ReceiptHandle,
    }),
  );
}

async function pollOnce() {
  const response = await sqsClient.send(
    new ReceiveMessageCommand({
      QueueUrl: env.AWS_TRANSCODE_QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: env.TRANSCODE_SQS_WAIT_SECONDS,
      VisibilityTimeout: env.TRANSCODE_VISIBILITY_TIMEOUT_SECONDS,
    }),
  );

  const results = await Promise.allSettled(
    (response.Messages|| []).map(processQueueMessage),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      logger('ERROR', 'Transcode message failed', result.reason);
    }
  }
}

// Used to gracefully shutdown the worker when the process/app is terminated. 
// The worker will stop polling for new messages and finish processing any in-flight messages before exiting.
export async function startTranscodeWorker(signal: AbortSignal) {
  while (!signal.aborted) {
    await pollOnce();
  }
}
