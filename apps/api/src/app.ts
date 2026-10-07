import { env } from '@repo/env/server';
import { connectToMongoDb } from '@/db/connection';

import { notFound, onError } from '@packages/httputils';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import createAuth from '@repo/auth';
import { validateUser } from '@repo/auth/middleware';

import videoRoutes from '@/routes/video.routes';

declare module 'hono' {
  interface ContextVariableMap {
    user: {
      _id: { toString(): string };
    };
  }
}

const app = new Hono();

await connectToMongoDb(env.DATABASE_URL);
const auth = createAuth();

app.use(
  '/api/*',
  cors({
    origin: env.ALLOWED_ORIGINS,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }),
);

// Auth routes (public — login, signup, etc.)
app.route('/api/auth', auth);

app.use('/api/videos/*', validateUser);
app.route('/api/videos', videoRoutes);

app.get('/', (c) => {
  return c.text('HLStream API server is running');
});

app.notFound(notFound);
app.onError(onError);

export default app;
