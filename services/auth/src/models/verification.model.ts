import mongoose, { type InferSchemaType } from 'mongoose';

const verificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['otp', 'reset_link'],
      required: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    otp: { type: String },
    resetLink: { type: String },
    token: { type: String },
    createdAt: { type: Date, default: Date.now, expires: 300 },
  },
  { timestamps: true },
);

verificationSchema.index({ email: 1, type: 1 });

export type VerificationDocument = InferSchemaType<typeof verificationSchema>;

export const Verification = mongoose.model<VerificationDocument>(
  'Verification',
  verificationSchema,
);
