import mongoose from 'mongoose';

export function connectToMongoDB(uri: string) {
  return mongoose.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 10_000,
  });
}

export function disconnectFromMongoDB() {
  return mongoose.disconnect();
}
