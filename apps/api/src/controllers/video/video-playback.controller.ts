import { asyncHandler, sendResponse } from '@packages/httputils';

import {
  createPlaybackManifest,
  getPlaybackState,
} from '@/services/video/playback.service';

import type { Context } from 'hono';

function ownerId(c: Context): string {
  return c.get('user')._id.toString();
}

export const getVideoPlaybackController = asyncHandler(async (c: Context) => {
  const videoId = c.req.param('id');
  if (!videoId) return sendResponse(c, 400, 'Video ID is required.');

  const playback = await getPlaybackState(ownerId(c), videoId);
  return playback
    ? sendResponse(c, 200, 'Playback status retrieved.', playback)
    : sendResponse(c, 404, 'Video not found.');
});

export const getVideoManifestController = asyncHandler(async (c: Context) => {
  const videoId = c.req.param('id');
  if (!videoId) return sendResponse(c, 400, 'Video ID is required.');

  const playback = await createPlaybackManifest(ownerId(c), videoId);
  if (!playback.state) return sendResponse(c, 404, 'Video not found.');
  if (!playback.manifest) {
    return sendResponse(c, 409, 'Video is not ready for playback.', {
      transcodeStatus: playback.state.transcodeStatus,
    });
  }

  c.header('Content-Type', 'application/vnd.apple.mpegurl');
  c.header('Cache-Control', 'private, no-store');
  return c.body(playback.manifest);
});

export const getVideoVariantManifestController = asyncHandler(
  async (c: Context) => {
    const videoId = c.req.param('id');
    const rendition = c.req.param('rendition');
    if (!videoId || !rendition) {
      return sendResponse(c, 400, 'Video ID and rendition are required.');
    }

    const playback = await createPlaybackManifest(
      ownerId(c),
      videoId,
      rendition,
    );
    if (!playback.state) return sendResponse(c, 404, 'Video not found.');
    if (!playback.manifest) {
      return sendResponse(c, 404, 'HLS rendition was not found.');
    }

    c.header('Content-Type', 'application/vnd.apple.mpegurl');
    c.header('Cache-Control', 'private, no-store');
    return c.body(playback.manifest);
  },
);
