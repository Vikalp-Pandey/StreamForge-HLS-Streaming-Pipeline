import { logger } from '@packages/httputils';

import { connectToMongoDB } from '@repo/database/mongo';

export const connectToMongoDb = (mongoUri: string) =>
  connectToMongoDB(mongoUri)
    .then((connection) => {
      logger('INFO', 'MongoDB connected successfully');
      return connection;
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Unknown MongoDB error';
      logger('ERROR', `DbConnectionError: ${message}`);
      throw error;
    });
