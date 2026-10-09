import { Context } from 'hono';
import bcrypt from 'bcryptjs';
import { getCookie } from 'hono/cookie';
import { env } from '@repo/env/server';
import { signjwt } from '@repo/utils/jwt';
import userService from '../../services/user.service';
import { asyncHandler, sendCookie, sendResponse } from '@packages/httputils';

const cookieConfig = {
  isSecure: env.ENVIRONMENT === 'production',
  sameSite: env.ENVIRONMENT === 'production' ? 'None' : 'Lax',
} as const;

export const signin = asyncHandler(async (c: Context) => {
  const { email, password } = await c.req.json();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userService.findUserByEmailWithPassword(normalizedEmail);
  if (!user?.password) {
    return sendResponse(c, 401, 'Invalid email or password');
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return sendResponse(c, 401, 'Invalid email or password');
  }

  const accessToken = getCookie(c, 'accessToken');
  if (!accessToken) {
    const token = await signjwt({
      payload: { id: user.id, email: user.email },
    });
    sendCookie(c, 'accessToken', token, cookieConfig, {
      maxAge: 60 * 60 * 1000,
    });
    return sendResponse(c, 200, 'User logged in successfully');
  }
  return sendResponse(c, 200, 'Already logged in');
});
