import { Verification } from '@repo/auth/models/verification';

export interface CreateVerificationInput {
  type: 'otp' | 'reset_link';
  email: string;
  otp?: string;
  token?: string;
  resetLink?: string;
}

export const createVerification = (input: CreateVerificationInput) =>
  Verification.create(input);

export const findOtpVerification = (email: string, otp: string) =>
  Verification.findOne({ type: 'otp', email, otp });

export const findResetVerification = (email: string, token: string) =>
  Verification.findOne({ type: 'reset_link', email, token });

export const deleteResetVerifications = (email: string) =>
  Verification.deleteMany({ email, type: 'reset_link' });

export const deleteVerificationById = (id: string) =>
  Verification.deleteOne({ _id: id });

const verificationService = {
  createVerification,
  deleteResetVerifications,
  deleteVerificationById,
  findOtpVerification,
  findResetVerification,
};

export default verificationService;
