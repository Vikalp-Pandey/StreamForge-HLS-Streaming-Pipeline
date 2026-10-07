import mongoose, { type InferSchemaType } from 'mongoose';

const uploadedPartSchema = new mongoose.Schema(
  {
    partNumber: { type: Number, required: true, min: 1 },
    etag: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    fingerprint: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const videoSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: { type: String, required: true, trim: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    fingerprint: { type: String, required: true, index: true },
    s3Key: { type: String, required: true, unique: true, index: true },
    uploadId: { type: String, required: true },
    uploadedParts: { type: [uploadedPartSchema], default: [] },
    status: {
      type: String,
      enum: ['UPLOADING', 'UPLOADED', 'FAILED'],
      required: true,
      default: 'UPLOADING',
      index: true,
    },
    activeTranscodeJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TranscodeJob',
      default: null,
    },
    error: { type: String },
    uploadedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

videoSchema.index({ ownerId: 1, status: 1, updatedAt: -1 });
videoSchema.index({ ownerId: 1, fingerprint: 1 }, { unique: true });

export type VideoDocument = InferSchemaType<typeof videoSchema>;

const Video = mongoose.model<VideoDocument>('Video', videoSchema);

export default Video;
