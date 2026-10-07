import mongoose, { type InferSchemaType } from 'mongoose';

const transcodeJobSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      required: true,
      default: 'PENDING',
      index: true,
    },
    sourceKey: { type: String, required: true },
    error: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

export type TranscodeJobDocument = InferSchemaType<
  typeof transcodeJobSchema
>;

const TranscodeJob = mongoose.model<TranscodeJobDocument>(
  'TranscodeJob',
  transcodeJobSchema,
);

export default TranscodeJob;
