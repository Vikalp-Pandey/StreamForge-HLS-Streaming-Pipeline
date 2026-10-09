import { Context } from 'hono';
import bcrypt from 'bcryptjs';
import userService from '../../services/user.service';
import verificationService from '../../services/verification.service';
import { asyncHandler, sendResponse } from '@packages/httputils';

export const resetPassword = asyncHandler(async (c: Context) => {
  const { email, password } = await c.req.json();
  const token = c.req.query('token');

  if (!email || !password || !token) {
    return sendResponse(c, 400, 'Email, password, and token are required');
  }
  const normalizedEmail = email.trim().toLowerCase();

  const isValidToken = await verificationService.findResetVerification(
    normalizedEmail,
    token,
  );

  if (!isValidToken) {
    return sendResponse(c, 400, 'Invalid or expired token');
  }

  const user = await userService.findUserByEmail(normalizedEmail);
  if (!user) {
    return sendResponse(c, 404, 'User with this email does not exist');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await userService.updateUserPasswordHash(user.id, passwordHash);
  await verificationService.deleteVerificationById(isValidToken.id);
  return sendResponse(c, 200, 'Password reset successfully');
});
