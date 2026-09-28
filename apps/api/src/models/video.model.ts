import {
  type InferSchemaType,
  type Model,
  model,
  Schema,
} from 'mongoose';

const uploadedPartSchema = new Schema(
  {
    partNumber: { type: Number, required: true, min: 1 },
    etag: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    fingerprint: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const videoSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: 'TranscodeJob',
      default: null,
    },
    error: { type: String },
    uploadedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

videoSchema.index({ ownerId: 1, status: 1, updatedAt: -1 });
videoSchema.index(
  { ownerId: 1, fingerprint: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'UPLOADING',
      fingerprint: { $type: 'string' },
    },
  },
);

export type VideoDocument = InferSchemaType<typeof videoSchema>;

const Video = (model('Video', videoSchema)) as Model<VideoDocument>;

export default Video;
