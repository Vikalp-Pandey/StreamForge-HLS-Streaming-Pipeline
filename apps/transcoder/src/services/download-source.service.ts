import { env } from '@repo/env/server';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@repo/clients/s3';



export async function downloadSource(
  sourceKey: string,
  destinationPath: string,
) {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: env.AWS_MEDIA_BUCKET,
      Key: sourceKey,
    }),
  );

  if (!response.Body) {
    throw new Error('S3 returned an empty source body');
  }

  await pipeline(
    response.Body as NodeJS.ReadableStream,
    createWriteStream(destinationPath),
  );
}
