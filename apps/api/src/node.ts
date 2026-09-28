import { serve } from '@hono/node-server';
import { env } from '@repo/env/server';

import app from '@/app';



serve({ fetch: app.fetch, port: 8000 }, (info) => {
  console.info(`Server is running on port ${info.port}`);
});
