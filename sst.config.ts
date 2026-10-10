export default $config({
  app(input) {
    const isProduction = input?.stage === 'prod';
    return {
      name: 'streamforge',
      home: 'aws',
      protect: isProduction,
      removal: isProduction ? 'retain' : 'remove',
      providers: {
        aws: {
          region: 'eu-north-1',
        },
        cloudflare: '6.22.0',
      },
    };
  },
  async run() {
    const isProduction = $app.stage === 'prod';
    const domainDns = sst.cloudflare.dns({
      proxy: false,
    });
    const frontendDomain = isProduction
      ? 'streamforge.vikalpdev.store'
      : 'dev.streamforge.vikalpdev.store';
    const apiDomain = isProduction
      ? 'api.vikalpdev.store'
      : 'api.dev.vikalpdev.store';
    const mediaDomain = isProduction
      ? 'media.vikalpdev.store'
      : 'media.dev.vikalpdev.store';
    const frontendUrl = `https://${frontendDomain}`;
    const apiUrl = `https://${apiDomain}`;
    const mediaBucket = sst.aws.Bucket.get(
      'MediaBucket',
      'hls-stream-pipline-bucket',
    );

    new aws.s3.BucketCorsConfigurationV2('MediaBucketCors', {
      bucket: mediaBucket.name,
      corsRules: [
        {
          allowedHeaders: ['*'],
          allowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
          allowedOrigins: ['https://streamforge.vikalpdev.store'],
          exposeHeaders: ['ETag', 'Content-Length', 'Content-Range'],
          maxAgeSeconds: 3600,
        },
      ],
    });
    const mediaCachePolicy = new aws.cloudfront.CachePolicy(
      'MediaCachePolicy',
      {
        comment: 'Cache StreamForge HLS objects',
        defaultTtl: 0,
        maxTtl: 365 * 24 * 60 * 60,
        minTtl: 0,
        parametersInCacheKeyAndForwardedToOrigin: {
          cookiesConfig: { cookieBehavior: 'none' },
          headersConfig: { headerBehavior: 'none' },
          queryStringsConfig: { queryStringBehavior: 'none' },
          enableAcceptEncodingBrotli: true,
          enableAcceptEncodingGzip: true,
        },
      },
    );
    const mediaResponseHeadersPolicy = new aws.cloudfront.ResponseHeadersPolicy(
      'MediaResponseHeadersPolicy',
      {
        comment: 'CORS for keyless StreamForge HLS playback',
        corsConfig: {
          accessControlAllowCredentials: false,
          accessControlAllowHeaders: { items: ['Range'] },
          accessControlAllowMethods: { items: ['GET', 'HEAD', 'OPTIONS'] },
          accessControlAllowOrigins: {
            items: [frontendUrl],
          },
          accessControlExposeHeaders: {
            items: ['Accept-Ranges', 'Content-Length', 'Content-Range'],
          },
          accessControlMaxAgeSec: 3600,
          originOverride: true,
        },
      },
    );
    const mediaRouter = new sst.aws.Router('MediaRouter', {
      domain: {
        name: mediaDomain,
        dns: domainDns,
      },
      routes: {
        '/*': {
          bucket: mediaBucket,
          cachePolicy: mediaCachePolicy.id,
        },
      },
      transform: {
        cdn(args) {
          args.defaultCacheBehavior = $resolve(args.defaultCacheBehavior).apply(
            (behavior) => ({
              ...behavior,
              responseHeadersPolicyId: mediaResponseHeadersPolicy.id,
            }),
          );
        },
      },
    });
    new aws.s3.BucketPolicy('MediaBucketCloudFrontPolicy', {
      bucket: mediaBucket.name,
      policy: $jsonStringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowCloudFrontReadTranscodedMedia',
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
            Action: 's3:GetObject',
            Resource: $interpolate`${mediaBucket.arn}/transcoded/*`,
            Condition: {
              StringEquals: {
                'AWS:SourceArn': mediaRouter._distributionArn,
              },
            },
          },
        ],
      }),
    });
    const transcodeQueue = sst.aws.Queue.get(
      'TranscodeQueue',
      'https://sqs.eu-north-1.amazonaws.com/322694471338/HLS_Stream_Transcode_Queue',
    );
    const databaseUrl = new sst.Secret('DatabaseUrl');
    const jwtSecret = new sst.Secret('JwtSecret');
    const githubClientId = new sst.Secret('GithubClientId');
    const githubClientSecret = new sst.Secret('GithubClientSecret');
    const googleClientId = new sst.Secret('GoogleClientId');
    const googleClientSecret = new sst.Secret('GoogleClientSecret');
    const smtpHost = new sst.Secret('SmtpHost');
    const smtpPort = new sst.Secret('SmtpPort');
    const smtpUsername = new sst.Secret('SmtpUsername');
    const smtpPassword = new sst.Secret('SmtpPassword');
    const smtpName = new sst.Secret('SmtpName');
    const smtpMail = new sst.Secret('SmtpMail');
    const smtpReplyTo = new sst.Secret('SmtpReplyTo');
    const transcoderInternalKey = new sst.Secret('TranscoderInternalKey');

    const awsAccessKeyId = new sst.Secret('AwsAccessKeyId');
    const awsSecretAccessKey = new sst.Secret('AwsSecretAccessKey');

    const applicationEnvironment = {
      ENVIRONMENT: 'production',
      DATABASE_URL: databaseUrl.value,
      AWS_MEDIA_BUCKET: mediaBucket.name,
      AWS_TRANSCODE_QUEUE_URL: transcodeQueue.url,
      FFMPEG_PATH: 'ffmpeg',
      STALE_PROCESSING_MS: String(30 * 60 * 1000),
      TRANSCODE_SQS_WAIT_SECONDS: '20',
      TRANSCODE_VISIBILITY_TIMEOUT_SECONDS: String(2 * 60 * 60),
      TRANSCODER_PORT: '8080',
      TRANSCODER_INTERNAL_KEY: transcoderInternalKey.value,
      PLAYBACK_URL_TTL_SECONDS: String(30 * 60),
      SMTP_HOST: smtpHost.value,
      SMTP_PORT: smtpPort.value,
      SMTP_USERNAME: smtpUsername.value,
      SMTP_PASSWORD: smtpPassword.value,
      SMTP_NAME: smtpName.value,
      SMTP_MAIL: smtpMail.value,
      SMTP_REPLY_TO: smtpReplyTo.value,
      ALLOWED_ORIGINS: frontendUrl,
      JWT_SECRET: jwtSecret.value,
      GITHUB_CLIENT_ID: githubClientId.value,
      GITHUB_CLIENT_SECRET: githubClientSecret.value,
      GITHUB_REDIRECT_URI: `${apiUrl}/api/auth/callback/github`,
      GOOGLE_CLIENT_ID: googleClientId.value,
      GOOGLE_CLIENT_SECRET: googleClientSecret.value,
      GOOGLE_REDIRECT_URI: `${apiUrl}/api/auth/callback/google`,
    };
    const apiEnvironment = {
      ...applicationEnvironment,
      CLOUDFRONT_BASE_URL: mediaRouter.url,
    };

    const transcoderEnvironment = {
      ...applicationEnvironment,
      AWS_REGION: 'eu-north-1',
      AWS_ACCESS_KEY_ID: awsAccessKeyId.value,
      AWS_SECRET_ACCESS_KEY: awsSecretAccessKey.value,
    };
    const vpc = new sst.aws.Vpc('TranscoderVpc');
    const cluster = new sst.aws.Cluster('TranscoderCluster', { vpc });
    const transcoder = new sst.aws.Service('Transcoder', {
      cluster,
      image:
        process.env.TRANSCODER_IMAGE ??
        '322694471338.dkr.ecr.eu-north-1.amazonaws.com/sst-asset:Transcoder',
      cpu: '2 vCPU',
      memory: '4 GB',
      storage: '50 GB',
      environment: transcoderEnvironment,
      permissions: [
        {
          actions: ['s3:GetObject'],
          resources: ['arn:aws:s3:::hls-stream-pipline-bucket/uploads/*'],
        },
        {
          actions: ['s3:PutObject', 's3:AbortMultipartUpload'],
          resources: ['arn:aws:s3:::hls-stream-pipline-bucket/transcoded/*'],
        },
        {
          actions: [
            'sqs:ReceiveMessage',
            'sqs:DeleteMessage',
            'sqs:ChangeMessageVisibility',
            'sqs:GetQueueAttributes',
          ],
          resources: [transcodeQueue.arn],
        },
      ],
      scaling: {
        min: 1,
        max: 4,
        cpuUtilization: 70,
        memoryUtilization: 75,
      },
    });

    const api = new sst.aws.ApiGatewayV2('Api', {
      domain: {
        name: apiDomain,
        dns: domainDns,
      },
      cors: {
        allowOrigins: [
          frontendUrl,
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ],
        allowHeaders: ['content-type', 'authorization'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowCredentials: true,
      },
    });
    api.route('$default', {
      handler: 'apps/api/src/lambda.handler',
      runtime: 'nodejs22.x',
      memory: '1024 MB',
      timeout: '30 seconds',
      storage: '1 GB',
      environment: apiEnvironment,
      nodejs: {
        sourcemap: true,
        install: [
          '@aws-sdk/client-s3',
          '@aws-sdk/client-sqs',
          '@aws-sdk/s3-request-presigner',
          '@react-email/components',
          '@react-email/render',
          'axios',
          'bcryptjs',
          'jsonwebtoken',
          'mongoose',
          'nodemailer',
          'react',
          'react-dom',
        ],
      },
      permissions: [
        {
          actions: [
            's3:PutObject',
            's3:GetObject',
            's3:AbortMultipartUpload',
            's3:ListMultipartUploadParts',
          ],
          resources: ['arn:aws:s3:::hls-stream-pipline-bucket/uploads/*'],
        },
        {
          actions: ['s3:GetObject'],
          resources: ['arn:aws:s3:::hls-stream-pipline-bucket/transcoded/*'],
        },
        {
          actions: ['sqs:SendMessage', 'sqs:GetQueueAttributes'],
          resources: [transcodeQueue.arn],
        },
      ],
    });
    const frontend = new sst.aws.StaticSite('StreamForgeFrontend', {
      path: 'apps/ui',
      domain: {
        name: frontendDomain,
        dns: domainDns,
      },
      build: {
        command: 'pnpm run build',
        output: 'dist',
      },
      environment: {
        VITE_API_URL: `${apiUrl}/api`,
      },
      errorPage: 'index.html',
      invalidation: {
        paths: 'all',
        wait: true,
      },
    });
    return {
      stage: $app.stage,
      frontendUrl: frontend.url,
      apiUrl: api.url,
      mediaUrl: mediaRouter.url,
      mediaDistributionId: mediaRouter.distributionID,
      mediaBucket: mediaBucket.name,
      transcodeQueueUrl: transcodeQueue.url,
      transcoderCloudMapService: transcoder.service,
    };
  },
});
