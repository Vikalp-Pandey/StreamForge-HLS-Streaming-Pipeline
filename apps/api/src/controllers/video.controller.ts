import { asyncHandler, sendResponse } from '@packages/httputils';

import {
  finishVideoUpload,
  recordUploadedVideoPart,
  signVideoPart,
  startVideoUpload,
} from '@/services/video/video.service';

import type { Context } from 'hono';

function ownerId(c: Context): string {
  return c.get('user')._id.toString();
}

export const startVideoUploadController = asyncHandler(async (c: Context) => {
  const body = await c.req.json<{
    originalName?: string;
    contentType?: string;
    fingerprint?: string;
    size?: number;
  }>();
  const { contentType, fingerprint, originalName, size } = body;

  if (
    !originalName ||
    !contentType?.startsWith('video/') ||
    typeof size !== 'number' ||
    !fingerprint
  ) {
    return sendResponse(
      c,
      400,
      'Valid video name, type, size and SHA-256 fingerprint are required.',
    );
  }

  const upload = await startVideoUpload({
    ownerId: ownerId(c),
    originalName,
    contentType,
    size,
    fingerprint: fingerprint.toLowerCase(),
  });

  return sendResponse(
    c,
    upload.alreadyUploaded || upload.resumed ? 200 : 201,
    upload.alreadyUploaded
      ? 'This video is already uploaded to S3.'
      : upload.resumed
        ? 'Video upload resumed.'
        : 'Video upload created.',
    upload,
  );
});

export const assignVideoPartController = asyncHandler(async (c: Context) => {
  const body = await c.req.json<{
    partNumber?: number;
    etag?: string;
    size?: number;
    fingerprint?: string;
  }>();
  const { etag, fingerprint, partNumber, size } = body;

  if (
    typeof partNumber !== 'number' ||
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > 10_000
  ) {
    return sendResponse(c, 400, 'partNumber must be between 1 and 10000.');
  }

  const videoId = c.req.param('id');
  if (!videoId) return sendResponse(c, 400, 'Video ID is required.');

  if (etag !== undefined || size !== undefined || fingerprint !== undefined) {
    if (
      !etag ||
      typeof size !== 'number' ||
      !Number.isInteger(size) ||
      size <= 0 ||
      !fingerprint ||
      !/^[a-f\d]{64}$/i.test(fingerprint)
    ) {
      return sendResponse(c, 400, 'Valid part metadata is required.');
    }

    const recordedPart = await recordUploadedVideoPart({
      ownerId: ownerId(c),
      videoId,
      partNumber,
      etag,
      size,
      fingerprint: fingerprint.toLowerCase(),
    });

    if (!recordedPart) {
      return sendResponse(c, 404, 'Active upload not found.');
    }
    if (!recordedPart.verified) {
      return sendResponse(
        c,
        409,
        'The uploaded part could not be verified in S3.',
      );
    }
    return sendResponse(c, 200, 'Uploaded part verified.', recordedPart);
  }

  const result = await signVideoPart({
    ownerId: ownerId(c),
    videoId,
    partNumber,
  });

  return result
    ? sendResponse(c, 200, 'Part upload status retrieved.', result)
    : sendResponse(c, 404, 'Active upload not found.');
});

export const completeVideoUploadController = asyncHandler(async (c: Context) => {
  const videoId = c.req.param('id');
  if (!videoId) return sendResponse(c, 400, 'Video ID is required.');

  const result = await finishVideoUpload({
    ownerId: ownerId(c),
    videoId,
  });

  if (!result) return sendResponse(c, 404, 'Active upload not found.');
  if (!result.completed) {
    return sendResponse(
      c,
      409,
      'Some video parts are still missing.',
      { missingParts: result.missingParts },
    );
  }
  return sendResponse(c, 202, 'Video upload completed.', result);
});
