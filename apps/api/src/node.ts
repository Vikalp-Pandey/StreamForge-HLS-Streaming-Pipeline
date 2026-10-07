import { serve } from '@hono/node-server';
import { logger } from '@packages/httputils';

import app from '@/app';

const server = serve({ fetch: app.fetch, port: 8000 }, (info) => {
  logger('INFO', `Server is running on port ${info.port}`);
});

const stopServer = () => server.close();

process.once('SIGINT', stopServer);
process.once('SIGTERM', stopServer);
