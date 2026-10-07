import { env } from '@repo/env/server';
import {
  DeleteMessageCommand,
  type Message,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { logger } from '@packages/httputils';
import { sqsClient } from '@repo/clients/sqs';
import { processTranscodeJob } from '@/services/process-transcode-job.service';

interface TranscodeMessage {
  transcodeJobId: string;
}

function parseMessage(body: string): TranscodeMessage {
  const value = JSON.parse(body);
  if (typeof value.transcodeJobId !== 'string') {
    throw new Error('Invalid transcode queue message');
  }
  return { transcodeJobId: value.transcodeJobId };
}

async function processQueueMessage(message: Message) {
  if (!message.Body || !message.ReceiptHandle) {
    throw new Error('SQS message body or receipt handle is missing');
  }

  const body = parseMessage(message.Body);
  await processTranscodeJob(body.transcodeJobId);

  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: env.AWS_TRANSCODE_QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle
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
    (response.Messages ?? []).map(processQueueMessage),
  );
  results.forEach((result) => {
    if (result.status === 'rejected') {
      logger('ERROR', 'Transcode message failed', result.reason);
    }
  });
}

export async function startTranscodeWorker(signal: AbortSignal) {
  try {
    while (!signal.aborted) {
      await pollOnce();
    }
  } catch (error: unknown) {
    logger('ERROR', 'Transcode worker stopped', error);
  }
}
