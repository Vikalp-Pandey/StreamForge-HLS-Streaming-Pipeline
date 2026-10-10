import { Context } from 'hono';
import { env } from '@repo/env/server';
import { signjwt } from '@repo/utils/jwt';
import userService from '../../services/user.service';
import verificationService from '../../services/verification.service';
import { asyncHandler, sendCookie, sendResponse } from '@packages/httputils';

const cookieConfig = {
  isSecure: env.ENVIRONMENT === 'production',
  sameSite: env.ENVIRONMENT === 'production' ? 'None' : 'Lax',
} as const;

export const verifyOtp = asyncHandler(async (c: Context) => {
  const { email, otp } = await c.req.json();
  const normalizedEmail = email.trim().toLowerCase();
  const verification = await verificationService.findOtpVerification(
    normalizedEmail,
    otp,
  );
  if (!verification) {
    return sendResponse(c, 400, 'Invalid OTP');
  }
  const user = await userService.findUserByEmail(normalizedEmail);
  if (!user) {
    return sendResponse(c, 404, 'User not found');
  }
  const token = await signjwt({ payload: { id: user.id, email: user.email } });
  sendCookie(c, 'accessToken', token, cookieConfig, {
    maxAge: 60 * 60 * 1000,
  });
  await verificationService.deleteVerificationById(verification.id);
  return sendResponse(c, 200, 'User logged in successfully');
});
