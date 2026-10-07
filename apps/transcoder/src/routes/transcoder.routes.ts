import { Hono } from 'hono';

import {
  getTranscodeJobController,
  processTranscodeJobController,
} from '@/controllers/transcoder.controller';
import { validateInternalKey } from '@/middleware/internal-auth.middleware';

const transcoderRoutes = new Hono();

transcoderRoutes.use('/internal/*', validateInternalKey);
transcoderRoutes.get('/internal/jobs/:jobId', getTranscodeJobController);
transcoderRoutes.post('/internal/jobs/:jobId/process',processTranscodeJobController);

export default transcoderRoutes;
