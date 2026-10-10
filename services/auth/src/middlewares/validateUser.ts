import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyjwt } from '@repo/utils/jwt';
import userService from '../services/user.service';
import { sendResponse } from '@packages/httputils';

export const validateUser = async (c: Context, next: Next) => {
  const accessToken = getCookie(c, 'accessToken');

  if (!accessToken) {
    return sendResponse(c, 401, 'UnAuthenticated User');
  }

  const payload = await verifyjwt(accessToken);
  if (!payload) {
    return sendResponse(c, 401, 'Invalid Token');
  }
  const user = payload.id
    ? await userService.findUserById(payload.id)
    : payload.email
      ? await userService.findUserByEmail(payload.email)
      : null;
  if (!user) {
    return sendResponse(c, 404, 'User not found');
  }
  c.set('user', user);

  // console.log(user);
  return next();
};
