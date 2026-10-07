import { env } from '@repo/env/server';

import path from 'node:path';

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getCloudFrontSignedUrl } from '@aws-sdk/cloudfront-signer';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';

import { s3Client } from '@repo/clients/s3';

import TranscodeJob from '@/models/transcode-job.model';
import Video from '@/models/video.model';

const TRANSCODED_PREFIX = 'transcoded';
const RENDITION_NAMES = new Set(['360p', '480p', '720p', '1080p']);

function cloudFrontConfig() {
  const values = [
    env.CLOUDFRONT_BASE_URL,
    env.CLOUDFRONT_KEY_PAIR_ID,
    env.CLOUDFRONT_PRIVATE_KEY,
  ];
  const configuredValues = values.filter(Boolean).length;

  if (configuredValues === 0) return null;
  if (configuredValues !== values.length) {
    throw new Error(
      'CloudFront playback requires CLOUDFRONT_BASE_URL, CLOUDFRONT_KEY_PAIR_ID and CLOUDFRONT_PRIVATE_KEY.',
    );
  }

  return {
    baseUrl: env.CLOUDFRONT_BASE_URL!.replace(/\/$/, ''),
    keyPairId: env.CLOUDFRONT_KEY_PAIR_ID!,
    privateKey: env.CLOUDFRONT_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  };
}

async function signPlaybackObject(videoId: string, objectKey: string) {
  const cloudFront = cloudFrontConfig();
  const expiresAt = new Date(Date.now() + env.PLAYBACK_URL_TTL_SECONDS * 1000);

  if (cloudFront) {
    const policy = JSON.stringify({
      Statement: [
        {
          Resource: `${cloudFront.baseUrl}/${TRANSCODED_PREFIX}/${videoId}/*`,
          Condition: {
            DateLessThan: {
              'AWS:EpochTime': Math.floor(expiresAt.getTime() / 1000),
            },
          },
        },
      ],
    });

    return getCloudFrontSignedUrl({
      url: `${cloudFront.baseUrl}/${objectKey}`,
      keyPairId: cloudFront.keyPairId,
      privateKey: cloudFront.privateKey,
      policy,
    });
  }

  return getS3SignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: env.AWS_MEDIA_BUCKET,
      Key: objectKey,
    }),
    { expiresIn: env.PLAYBACK_URL_TTL_SECONDS },
  );
}

export async function getPlaybackState(ownerId: string, videoId: string) {
  const video = await Video.findOne({ _id: videoId, ownerId });
  if (!video) return null;

  const job = await TranscodeJob.findOne({ video: video._id });

  return {
    videoId: video._id.toString(),
    videoStatus: video.status,
    transcodeStatus: job?.status ?? null,
    error: job?.status === 'FAILED' ? job.error : undefined,
    manifestPath:
      job?.status === 'COMPLETED'
        ? `/videos/${video._id.toString()}/playback/index.m3u8`
        : null,
  };
}

export async function createPlaybackManifest(
  ownerId: string,
  videoId: string,
  rendition?: string,
) {
  const state = await getPlaybackState(ownerId, videoId);
  if (!state || state.transcodeStatus !== 'COMPLETED') {
    return { state, manifest: null };
  }
  if (rendition && !RENDITION_NAMES.has(rendition)) {
    return { state, manifest: null };
  }

  const videoPrefix = `${TRANSCODED_PREFIX}/${videoId}/`;
  const playlistPrefix = rendition
    ? `${videoPrefix}${rendition}/`
    : videoPrefix;
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: env.AWS_MEDIA_BUCKET,
      Key: `${playlistPrefix}index.m3u8`,
    }),
  );

  if (!response.Body) throw new Error('The HLS playlist is empty.');
  const sourceManifest = await response.Body.transformToString();
  const lines = await Promise.all(
    sourceManifest.split(/\r?\n/).map(async (line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return line;

      const relativeName = trimmedLine.split(/[?#]/, 1)[0];
      if (!relativeName || /^https?:\/\//i.test(relativeName)) {
        throw new Error('The HLS playlist contains an invalid media URI.');
      }

      if (relativeName.endsWith('.m3u8')) {
        const requestedRendition = relativeName.split('/', 1)[0];
        if (!requestedRendition || !RENDITION_NAMES.has(requestedRendition)) {
          throw new Error(
            'The HLS master playlist contains an invalid variant.',
          );
        }
        return relativeName;
      }

      const objectKey = path.posix.normalize(
        path.posix.join(playlistPrefix, relativeName),
      );
      if (!objectKey.startsWith(playlistPrefix)) {
        throw new Error('The HLS playlist references media outside its video.');
      }

      return signPlaybackObject(videoId, objectKey);
    }),
  );

  return { state, manifest: lines.join('\n') };
}
