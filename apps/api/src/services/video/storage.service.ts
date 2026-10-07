import { env } from '@repo/env/server';

import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListPartsCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { s3Client } from '@repo/clients/s3';

export const UPLOAD_PART_SIZE = 10 * 1024 * 1024;

export interface UploadedPart {
  partNumber: number;
  etag: string;
  size: number;
}

export async function createMultipartUpload(
  key: string,
  contentType: string,
): Promise<string> {
  const result = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: env.AWS_MEDIA_BUCKET,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    }),
  );

  if (!result.UploadId) throw new Error('S3 did not return an upload ID.');
  return result.UploadId;
}

export async function createPartUploadUrl(input: {
  key: string;
  uploadId: string;
  partNumber: number;
}): Promise<string> {
  return getSignedUrl(
    s3Client,
    new UploadPartCommand({
      Bucket: env.AWS_MEDIA_BUCKET,
      Key: input.key,
      UploadId: input.uploadId,
      PartNumber: input.partNumber,
    }),
    { expiresIn: 15 * 60 },
  );
}

export async function listUploadedParts(input: {
  key: string;
  uploadId: string;
}): Promise<UploadedPart[]> {
  const uploadedParts: UploadedPart[] = [];
  let partNumberMarker: string | undefined;

  do {
    const result = await s3Client.send(
      new ListPartsCommand({
        Bucket: env.AWS_MEDIA_BUCKET,
        Key: input.key,
        UploadId: input.uploadId,
        PartNumberMarker: partNumberMarker,
      }),
    );

    for (const part of result.Parts ?? []) {
      if (part.PartNumber === undefined || !part.ETag) continue;
      uploadedParts.push({
        partNumber: part.PartNumber,
        etag: part.ETag,
        size: part.Size ?? 0,
      });
    }

    partNumberMarker = result.IsTruncated
      ? result.NextPartNumberMarker
      : undefined;
  } while (partNumberMarker);

  return uploadedParts.sort(
    (left, right) => left.partNumber - right.partNumber,
  );
}

export async function completeMultipartUpload(input: {
  key: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}): Promise<void> {
  await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: env.AWS_MEDIA_BUCKET,
      Key: input.key,
      UploadId: input.uploadId,
      MultipartUpload: {
        Parts: [...input.parts]
          .sort((left, right) => left.partNumber - right.partNumber)
          .map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.etag,
          })),
      },
    }),
  );
}
