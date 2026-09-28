import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // Environment
    ENVIRONMENT: z.enum(['development', 'staging', 'production']),

    // Database
    DATABASE_URL: z.url(),

    // HLS media storage
    AWS_REGION: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().min(16),
    AWS_SECRET_ACCESS_KEY: z.string().min(20),
    AWS_MEDIA_BUCKET: z.string().min(3),
    AWS_TRANSCODE_QUEUE_URL: z.url(),

    // Email
    SMTP_HOST: z.string(),
    SMTP_PORT: z.string().transform((val) => parseInt(val, 10)),
    SMTP_USERNAME: z.string(),
    SMTP_PASSWORD: z.string(),
    SMTP_NAME: z.string(),
    SMTP_MAIL: z.string(),
    SMTP_REPLY_TO: z.string(),

    // API
    /** Auth */
    ALLOWED_ORIGINS: z
      .string()
      .transform((val) => val.split(',').map((origin) => origin.trim())),
    
    // COOKIE_DOMAIN: z.string(),
    /** App URLs */
    JWT_SECRET:z.string(),
    GITHUB_CLIENT_ID:z.string(),
    GITHUB_CLIENT_SECRET:z.string(),
    GITHUB_REDIRECT_URI:z.string(),
    GOOGLE_CLIENT_ID:z.string(),
    GOOGLE_CLIENT_SECRET:z.string(),
    GOOGLE_REDIRECT_URI:z.string(),
  },

  runtimeEnv: process.env,
});
