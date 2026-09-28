import {
  type InferSchemaType,
  type Model,
  model,
  Schema,
} from 'mongoose';

const transcodeJobSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
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

export type TranscodeJobDocument = InferSchemaType<typeof transcodeJobSchema>;

const TranscodeJob = (model('TranscodeJob', transcodeJobSchema)) as Model<TranscodeJobDocument>;

export default TranscodeJob;
