import { env } from '@repo/env/server';

import { serve } from '@hono/node-server';
import { logger } from '@packages/httputils';

import {
  connectToMongoDB,
  disconnectFromMongoDB,
} from '@repo/database/mongo';

import app from '@/app';
import { startTranscodeWorker } from '@/transcode.worker';

const shutdown = new AbortController();

await connectToMongoDB(env.DATABASE_URL);

const server = serve(
  { fetch: app.fetch, port: env.TRANSCODER_PORT },
  ({ port }) => logger('INFO', `Transcoder is running on port ${port}`),
);

const worker = startTranscodeWorker(shutdown.signal);

async function stop() {
  shutdown.abort();
  await worker;
  server.close(() => void disconnectFromMongoDB());
}

process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
