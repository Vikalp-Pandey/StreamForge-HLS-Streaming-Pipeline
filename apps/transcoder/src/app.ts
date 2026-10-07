import { notFound, onError } from '@packages/httputils';
import { Hono } from 'hono';

import transcoderRoutes from '@/routes/transcoder.routes';

const app = new Hono();

app.route('/', transcoderRoutes);
app.notFound(notFound);
app.onError(onError);

export default app;
