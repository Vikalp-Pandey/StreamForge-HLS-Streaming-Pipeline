import { Hono } from 'hono';

import {
  assignVideoPartController,
  completeVideoUploadController,
  listVideosController,
  startVideoUploadController,
} from '@/controllers/video/video.controller';
import {
  getVideoManifestController,
  getVideoPlaybackController,
  getVideoVariantManifestController,
} from '@/controllers/video/video-playback.controller';

const videoRoutes = new Hono();

videoRoutes.get('/', listVideosController);
videoRoutes.post('/uploads', startVideoUploadController);
videoRoutes.post('/:id/uploads/part', assignVideoPartController);
videoRoutes.post('/:id/uploads/complete', completeVideoUploadController);
videoRoutes.get('/:id/playback', getVideoPlaybackController);
videoRoutes.get('/:id/playback/index.m3u8', getVideoManifestController);
videoRoutes.get(
  '/:id/playback/:rendition/index.m3u8',
  getVideoVariantManifestController,
);

export default videoRoutes;
