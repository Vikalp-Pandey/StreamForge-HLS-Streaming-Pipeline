import { Hono } from 'hono';

import {
  assignVideoPartController,
  completeVideoUploadController,
  startVideoUploadController,
} from '@/controllers/video.controller';

const videoRoutes = new Hono();

videoRoutes.post('/uploads', startVideoUploadController);
videoRoutes.post('/:id/uploads/part', assignVideoPartController);
videoRoutes.post('/:id/uploads/complete', completeVideoUploadController);

export default videoRoutes;
