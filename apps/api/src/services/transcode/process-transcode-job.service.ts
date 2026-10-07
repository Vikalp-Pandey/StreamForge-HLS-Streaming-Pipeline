import { env } from '@repo/env/server';

import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { downloadSource } from './download-source.service';
import { createHlsOutput } from './ffmpeg-hls.service';
import { uploadHlsDirectory } from './upload-hls.service';

import TranscodeJob from '@/models/transcode-job.model';
import Video from '@/models/video.model';

export async function processTranscodeJob(transcodeJobId: string) {
  
  const staleBefore = new Date(Date.now() - env.STALE_PROCESSING_MS);

  // The service can then safely claim that stale job and retry it. Without this logic, a job stuck in PROCESSING could remain stuck forever
  const job = await TranscodeJob.findOneAndUpdate(
    {
      _id: transcodeJobId,
      $or: [
        { status: { $in: ['PENDING', 'FAILED'] } },
        {
          status: 'PROCESSING',
          startedAt: { $lt: staleBefore },
        },
      ],
    },
    {
      $set: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
      $unset: {
        error: 1,
        completedAt: 1,
      },
    },
    { new: true },
  );

  if (!job) return;

  let workDirectory: string | undefined;

  try {
    const video = await Video.findById(job.video);

    if (!video) {
      throw new Error('Video metadata was not found');
    }

    if (video.s3Key !== job.sourceKey) {
      throw new Error('Job source does not match Video source');
    }

    workDirectory = await mkdtemp(
      path.join(tmpdir(), `streamforge-${video._id}-`),
    );

    const sourcePath = path.join(workDirectory, 'source-video');
    const outputDirectory = path.join(workDirectory, 'hls');
    await mkdir(outputDirectory, { recursive: true });

    await downloadSource(job.sourceKey, sourcePath);
    await createHlsOutput(sourcePath, outputDirectory);
    await uploadHlsDirectory(video._id.toString(), outputDirectory);

    await TranscodeJob.updateOne(
      { _id: job._id, status: 'PROCESSING' },
      {
        $set: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        $unset: { error: 1 },
      },
    );
  } catch (error: unknown) {
    await TranscodeJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: 'FAILED',
          error:
            error instanceof Error ? error.message : 'Unknown transcode error',
        },
      },
    );

    throw error;
  } finally {
    if (workDirectory) {
      await rm(workDirectory, { recursive: true, force: true });
    }
  }
}
