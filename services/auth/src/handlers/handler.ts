import { env } from '@repo/env/server';
import { sendRedirect } from '@packages/httputils';
import type { Context } from 'hono';

export const handleAuthResponse = (c: Context) => {
  return sendRedirect(c, `${env.ALLOWED_ORIGINS[0]}/upload`);
};
