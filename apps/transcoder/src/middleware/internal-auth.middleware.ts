import { env } from '@repo/env/server';

import { sendResponse } from '@packages/httputils';
import { createMiddleware } from 'hono/factory';

export const validateInternalKey = createMiddleware(async (c, next) => {
  if (!env.TRANSCODER_INTERNAL_KEY) {
    return sendResponse(c, 503, 'Transcoder internal key is not configured.');
  }

  const key = c.req.header('x-transcoder-key');
  if (key !== env.TRANSCODER_INTERNAL_KEY) {
    return sendResponse(c, 401, 'Invalid transcoder key.');
  }

  await next();
});
