import { env } from '@repo/env/server';

import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: env.AWS_REGION,
});
