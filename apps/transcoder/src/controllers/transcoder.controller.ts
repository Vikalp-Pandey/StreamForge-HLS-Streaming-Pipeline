import { asyncHandler, sendResponse } from '@packages/httputils';
import mongoose from 'mongoose';

import TranscodeJob from '@repo/media-models/transcode-job';

import { processTranscodeJob } from '@/services/process-transcode-job.service';

export const getTranscodeJobController = asyncHandler(async (c) => {
  const jobId = c.req.param('jobId');
  if (!jobId || !mongoose.isValidObjectId(jobId)) {
    return sendResponse(c, 400, 'A valid transcode job ID is required.');
  }

  const job = await TranscodeJob.findById(jobId).lean();
  return job
    ? sendResponse(c, 200, 'Transcode job retrieved.', job)
    : sendResponse(c, 404, 'Transcode job not found.');
});

export const processTranscodeJobController = asyncHandler(async (c) => {
  const jobId = c.req.param('jobId');
  if (!jobId || !mongoose.isValidObjectId(jobId)) {
    return sendResponse(c, 400, 'A valid transcode job ID is required.');
  }

  await processTranscodeJob(jobId);
  const job = await TranscodeJob.findById(jobId).lean();
  return job
    ? sendResponse(c, 200, 'Transcode processing finished.', job)
    : sendResponse(c, 404, 'Transcode job not found.');
});
