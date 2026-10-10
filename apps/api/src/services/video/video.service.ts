import { createHash, randomUUID } from 'node:crypto';

import {
  completeMultipartUpload,
  createMultipartUpload,
  createPartUploadUrl,
  listUploadedParts,
  UPLOAD_PART_SIZE,
  type UploadedPart as S3UploadedPart,
} from './storage.service';
import { enqueueTranscodeJob } from './transcode-queue.service';

import TranscodeJob from '@/models/transcode-job.model';
import Video from '@/models/video.model';

interface PersistedPart {
  partNumber: number;
  etag: string;
  size: number;
  fingerprint: string;
  uploadedAt: Date;
}

const normalizeEtag = (etag: string) => etag.replaceAll('"', '').trim();

const createRecoveredPartFingerprint = (
  uploadId: string,
  part: S3UploadedPart,
) =>
  createHash('sha256')
    .update(
      `${uploadId}:${part.partNumber}:${normalizeEtag(part.etag)}:${part.size}`,
    )
    .digest('hex');

async function findOwnedUpload(ownerId: string, videoId: string) {
  return Video.findOne({
    _id: videoId,
    ownerId,
    status: 'UPLOADING',
  });
}

async function reconcileUploadedParts(video: {
  _id: unknown;
  s3Key: string;
  uploadId: string;
  uploadedParts: PersistedPart[];
}) {
  const s3Parts = await listUploadedParts({
    key: video.s3Key,
    uploadId: video.uploadId,
  });
  const persistedByPartNumber = new Map(
    video.uploadedParts.map((part) => [part.partNumber, part]),
  );

  const reconciledParts = s3Parts.map((part): PersistedPart => {
    const persisted = persistedByPartNumber.get(part.partNumber);
    const sameEtag =
      persisted && normalizeEtag(persisted.etag) === normalizeEtag(part.etag);

    return {
      partNumber: part.partNumber,
      etag: part.etag,
      size: part.size,
      fingerprint: sameEtag
        ? persisted.fingerprint
        : createRecoveredPartFingerprint(video.uploadId, part),
      uploadedAt: sameEtag ? persisted.uploadedAt : new Date(),
    };
  });

  await Video.updateOne(
    { _id: video._id },
    { $set: { uploadedParts: reconciledParts } },
  );
  return reconciledParts;
}

export async function startVideoUpload(input: {
  ownerId: string;
  originalName: string;
  contentType: string;
  size: number;
  fingerprint: string;
}) {
  const existingVideo = await Video.findOne({
    ownerId: input.ownerId,
    fingerprint: input.fingerprint,
  });

  if (existingVideo?.status === 'UPLOADING') {
    const uploadedParts = await reconcileUploadedParts(existingVideo);

    return {
      videoId: existingVideo._id.toString(),
      uploadId: existingVideo.uploadId,
      partSize: UPLOAD_PART_SIZE,
      fingerprint: existingVideo.fingerprint,
      parts: uploadedParts,
      resumed: true as const,
      alreadyUploaded: false as const,
    };
  }

  if (existingVideo) {
    const transcodeJob = await TranscodeJob.findOne({
      video: existingVideo._id,
    });

    return {
      videoId: existingVideo._id.toString(),
      fingerprint: existingVideo.fingerprint,
      fingerprintMatched: true as const,
      alreadyUploaded: true as const,
      videoStatus: existingVideo.status,
      transcodeJobId: transcodeJob?._id.toString(),
      transcodeStatus: transcodeJob?.status,
    };
  }

  const uploadKey = randomUUID();
  const s3Key = `uploads/${uploadKey}/original`;
  const uploadId = await createMultipartUpload(s3Key, input.contentType);

  const video = await Video.create({
    ownerId: input.ownerId,
    originalName: input.originalName,
    contentType: input.contentType,
    size: input.size,
    fingerprint: input.fingerprint,
    s3Key,
    uploadId,
    uploadedParts: [],
    status: 'UPLOADING',
  });

  return {
    videoId: video._id.toString(),
    uploadId,
    partSize: UPLOAD_PART_SIZE,
    fingerprint: input.fingerprint,
    parts: [],
    resumed: false,
    alreadyUploaded: false as const,
  };
}

export async function signVideoPart(input: {
  ownerId: string;
  videoId: string;
  partNumber: number;
}) {
  const video = await findOwnedUpload(input.ownerId, input.videoId);
  if (!video) return null;

  const uploadedPart = video.uploadedParts.find(
    (part) => part.partNumber === input.partNumber,
  );
  if (uploadedPart) {
    return {
      status: 'uploaded' as const,
      part: uploadedPart.toObject(),
    };
  }

  const url = await createPartUploadUrl({
    key: video.s3Key,
    uploadId: video.uploadId,
    partNumber: input.partNumber,
  });

  return { status: 'signed' as const, url };
}

export async function recordUploadedVideoPart(input: {
  ownerId: string;
  videoId: string;
  partNumber: number;
  etag: string;
  size: number;
  fingerprint: string;
}) {
  const video = await findOwnedUpload(input.ownerId, input.videoId);
  if (!video) return null;

  const s3Parts = await listUploadedParts({
    key: video.s3Key,
    uploadId: video.uploadId,
  });
  const s3Part = s3Parts.find(
    (part) =>
      part.partNumber === input.partNumber &&
      normalizeEtag(part.etag) === normalizeEtag(input.etag),
  );
  if (!s3Part) return { verified: false as const };

  const storedPart: PersistedPart = {
    partNumber: input.partNumber,
    etag: s3Part.etag,
    size: s3Part.size,
    fingerprint: input.fingerprint,
    uploadedAt: new Date(),
  };
  const uploadedParts = [
    ...video.uploadedParts.filter(
      (part) => part.partNumber !== input.partNumber,
    ),
    storedPart,
  ].sort((left, right) => left.partNumber - right.partNumber);
  video.set('uploadedParts', uploadedParts);
  await video.save();

  return {
    verified: true as const,
    part: storedPart,
  };
}

export async function finishVideoUpload(input: {
  ownerId: string;
  videoId: string;
}) {
  const video = await findOwnedUpload(input.ownerId, input.videoId);
  if (!video) return null;

  const parts = await reconcileUploadedParts(video);
  const expectedPartCount = Math.ceil(video.size / UPLOAD_PART_SIZE);
  const uploadedPartNumbers = new Set(parts.map((part) => part.partNumber));
  const missingParts = Array.from(
    { length: expectedPartCount },
    (_, index) => index + 1,
  ).filter((partNumber) => !uploadedPartNumbers.has(partNumber));

  if (missingParts.length > 0) {
    return { completed: false as const, missingParts };
  }

  await completeMultipartUpload({
    key: video.s3Key,
    uploadId: video.uploadId,
    parts,
  });

  const transcodeJob = await TranscodeJob.findOneAndUpdate(
    { video: video._id },
    {
      $setOnInsert: {
        video: video._id,
        sourceKey: video.s3Key,
        status: 'PENDING',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await enqueueTranscodeJob(transcodeJob._id.toString());

  await Video.updateOne(
    { _id: video._id, status: 'UPLOADING' },
    {
      $set: {
        status: 'UPLOADED',
        uploadedAt: new Date(),
        uploadedParts: parts,
        activeTranscodeJobId: transcodeJob._id,
      },
      $unset: { error: 1 },
    },
  );

  return {
    completed: true as const,
    videoId: video._id.toString(),
    transcodeJobId: transcodeJob._id.toString(),
    status: transcodeJob.status,
  };
}

export async function listOwnerVideos(ownerId: string) {
  const videos = await Video.find({ ownerId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  const jobs = await TranscodeJob.find({
    video: { $in: videos.map((video) => video._id) },
  }).lean();
  const jobsByVideo = new Map(jobs.map((job) => [job.video.toString(), job]));

  return videos.map((video) => {
    const job = jobsByVideo.get(video._id.toString());
    const uploadedBytes = video.uploadedParts.reduce(
      (total, part) => total + part.size,
      0,
    );
    const uploadProgress =
      video.status === 'UPLOADED'
        ? 100
        : Math.min(99, Math.round((uploadedBytes / video.size) * 100));

    return {
      id: video._id.toString(),
      originalName: video.originalName,
      contentType: video.contentType,
      size: video.size,
      status: video.status,
      uploadProgress,
      createdAt: video.createdAt,
      uploadedAt: video.uploadedAt ?? null,
      transcodeJob: job
        ? {
            id: job._id.toString(),
            status: job.status,
            error: job.error ?? null,
            startedAt: job.startedAt ?? null,
            completedAt: job.completedAt ?? null,
          }
        : null,
      playbackReady: job?.status === 'COMPLETED',
    };
  });
}
