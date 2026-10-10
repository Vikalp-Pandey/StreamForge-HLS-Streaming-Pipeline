import { env } from '@repo/env/server';
import axios from 'axios';
import { Context } from 'hono';
import { handleAuthResponse } from '../../handlers/handler';
import { signjwt } from '@repo/utils/jwt';
import userService from '../../services/user.service';
import {
  asyncHandler,
  logger,
  sendCookie,
  sendRedirect,
  sendResponse,
} from '@packages/httputils';

const cookieConfig = {
  isSecure: env.ENVIRONMENT === 'production',
  sameSite: env.ENVIRONMENT === 'production' ? 'None' : 'Lax',
} as const;

export const googleLogin = asyncHandler(async (c: Context) => {
  const rootURL = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = new URLSearchParams({
    redirect_uri: env!.GOOGLE_REDIRECT_URI,
    client_id: env!.GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  }).toString();
  const googleOauthUrl = `${rootURL}?${options}`;
  return sendRedirect(c, googleOauthUrl);
});

export const googleCallback = asyncHandler(async (c: Context) => {
  const { code } = c.req.query();
  if (typeof code != 'string') {
    logger('ERROR', 'Google OAuth code not found');
    return sendResponse(c, 400, 'Invalid code');
  }

  const tokenResponse = await axios.post(
    'https://oauth2.googleapis.com/token',
    {
      client_id: env!.GOOGLE_CLIENT_ID,
      client_secret: env!.GOOGLE_CLIENT_SECRET,
      grant_type: 'authorization_code', //Google’s OAuth 2.0 endpoint requires a grant_type parameter when exchanging a code for a token. If you omit it, the server will reject the request.
      code,
      redirect_uri: env!.GOOGLE_REDIRECT_URI,
    },
    {
      headers: { Accept: 'application/json' },
    },
  );
  const access_token = tokenResponse.data.access_token;
  const userResponse = await axios.get(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: { Authorization: `Bearer ${access_token}` },
    },
  );

  const user = userResponse.data;

  const userData = {
    name: user.name,
    email: user.email,
    accessToken: access_token,
    twoFactorEnabled: false,
  };

  const normalizedEmail = userData.email.trim().toLowerCase();
  let authenticatedUser = await userService.findUserByEmail(normalizedEmail);
  if (!authenticatedUser) {
    authenticatedUser = await userService.createUser({
      name: userData.name,
      email: normalizedEmail,
      picture: user.picture,
    });
  }
  const token = await signjwt({
    payload: {
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      email: authenticatedUser.email,
    },
  });
  sendCookie(c, 'accessToken', token, cookieConfig, {
    maxAge: 60 * 60 * 1000,
  });
  return handleAuthResponse(c);
});
