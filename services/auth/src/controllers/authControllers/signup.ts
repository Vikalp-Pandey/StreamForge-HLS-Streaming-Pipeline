import { Context } from "hono";
import bcrypt from 'bcrypt';
import { emailService } from "../../services/email.service";
import type { MailTemplate } from "@services/email/types";
import { generateOTP } from "@repo/utils/otp";
import userService from '../../services/user.service';
import verificationService from '../../services/verification.service';
import { asyncHandler, sendResponse } from '@packages/httputils';


export const signup = asyncHandler(async (c: Context) => {
    // Now 'c' is the first argument passed by Hono otherwise while destructuring c.req.json() would have thrown an error of undefined while reading properties.
    const { name, email, password } = await c.req.json();
    const normalizedEmail = email.trim().toLowerCase();

    const isExisting = await userService.findUserByEmail(normalizedEmail);
    if (isExisting) {
      return sendResponse(c, 400, 'User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOTP(6);
    await userService.createUser({ name, email: normalizedEmail, password: passwordHash });
    await verificationService.createVerification({
      type: 'otp',
      email: normalizedEmail,
      otp,
    });
   
    await emailService.sendEmail({
      to: normalizedEmail,
      subject: "Email Verification for Signup",
      template: {
        type: 'emailVerification',
        data: {
          name,
          otp
        }
      } as MailTemplate
    });
    return sendResponse(c, 200, 'An OTP was sent for email verification');
});



