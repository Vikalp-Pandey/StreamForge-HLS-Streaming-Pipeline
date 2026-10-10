import { Context } from 'hono';
import { emailService } from '../../services/email.service';
import { generateResetLink } from '@repo/utils/jwt';
import userService from '../../services/user.service';
import verificationService from '../../services/verification.service';
import { asyncHandler, sendResponse } from '@packages/httputils';

export const forgotPassword = asyncHandler(async (c: Context) => {
  const { email } = await c.req.json();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userService.findUserByEmail(normalizedEmail);
  if (!user) {
    return sendResponse(c, 404, 'User with this email was not found');
  }

  const { token, reset_link } = await generateResetLink(normalizedEmail);
  await emailService.sendEmail({
    to: normalizedEmail,
    subject: 'Forgot Password',
    template: {
      type: 'resetPassword',
      data: {
        name: user.name,
        url: reset_link,
      },
    },
  });

  await verificationService.deleteResetVerifications(normalizedEmail);
  await verificationService.createVerification({
    type: 'reset_link',
    email: normalizedEmail,
    token,
    resetLink: reset_link,
  });

  return sendResponse(c, 200, 'A reset password link was sent to your email.');
});
