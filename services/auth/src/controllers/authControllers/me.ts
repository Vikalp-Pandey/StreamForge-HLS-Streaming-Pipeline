import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { verifyjwt } from "@repo/utils/jwt";
import userService from '../../services/user.service';
import { asyncHandler, sendResponse } from '@packages/httputils';

export const me = asyncHandler(async (c: Context) => {
    const accessToken = getCookie(c, 'accessToken');
    if (!accessToken) {
      return sendResponse(c, 401, 'Not authenticated');
    }

    const payload = await verifyjwt(accessToken);
    if (!payload) {
      return sendResponse(c, 401, 'Invalid token');
    }

    // .lean() tells the mongoose to skip the heavy mongoose stuff and return a plain JS object, thereby making the query faster.
    const user = payload.id ? await userService.findUserById(payload.id) : null;
    if (!user) {
      return sendResponse(c, 404, 'User not found');
    }

    return sendResponse(c, 200, 'User Info', {
      id: user.id,
      name: user.name,
      email: user.email,
    });
});
