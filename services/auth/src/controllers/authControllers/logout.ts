import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { env } from '@repo/env/server';
import { asyncHandler, sendCookie, sendResponse } from '@packages/httputils';

const cookieConfig = {
  isSecure: env.ENVIRONMENT === 'production',
  sameSite: env.ENVIRONMENT === 'production' ? 'None' : 'Lax',
} as const;

export const logout = asyncHandler(async (c:Context)=>{
    const access_token = getCookie(c,'accessToken');
    if(access_token){
        sendCookie(c, 'accessToken', '', cookieConfig, { expires: new Date(0) });
        return sendResponse(c, 200, 'User Logged out Successfully');
    }
    return sendResponse(c, 200, 'User is not logged in');
});
