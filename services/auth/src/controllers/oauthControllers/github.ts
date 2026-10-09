import { env } from "@repo/env/server";
import axios from "axios";
import { Context } from "hono";
import { handleAuthResponse } from "../../handlers/handler";
import { signjwt } from "@repo/utils/jwt";
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

export const githubLogin = asyncHandler(async (c:Context)=>{
        const githubURL = 'https://github.com/login/oauth/authorize';
        const params = new URLSearchParams({
            client_id: env!.GITHUB_CLIENT_ID,
            redirect_uri: env!.GITHUB_REDIRECT_URI,
            scope: 'user:email',
        }).toString();
        return sendRedirect(c, `${githubURL}?${params}`);
});

export const githubCallback = asyncHandler(async (c:Context)=>{
        const { code }= c.req.query();
        if(typeof code !== 'string'){
            logger('ERROR', 'GitHub OAuth code not found');
            return sendResponse(c, 400, 'Code not found');
        }
        const response = await axios.post('https://github.com/login/oauth/access_token',{
            client_id: env!.GITHUB_CLIENT_ID,
            client_secret: env!.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: env!.GITHUB_REDIRECT_URI,
        }, {
            headers: {
                Accept: 'application/json'
            }
        })

        const accessToken = response.data.access_token;

        if(!accessToken || typeof accessToken !== 'string'){
            logger('ERROR', 'GitHub access token was not returned');
            return sendResponse(c, 400, 'Token not found or Invalid Token');
        }

        const userResponse = await axios.get(`https://api.github.com/user`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const user = userResponse.data;

        const emailResponse = await axios.get('https://api.github.com/user/emails', {
            headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'Stripe-App',
            },
        });

        const email = emailResponse.data.find(
            (email: any) => email.primary && email.verified,
        ).email;

        const userData = {
            name: user.name,
            email: email,
            accessToken,
            twoFactorEnabled: false,
        };

        const normalizedEmail = userData.email.trim().toLowerCase();
        let authenticatedUser = await userService.findUserByEmail(normalizedEmail);
        if (!authenticatedUser) {
            authenticatedUser = await userService.createUser({
                name: userData.name,
                email: normalizedEmail,
            });
        }
        const token = await signjwt({
            payload: { id: authenticatedUser.id, name: authenticatedUser.name, email: authenticatedUser.email }
        });
        sendCookie(c, 'accessToken', token, cookieConfig, {
            maxAge: 60 * 60 * 1000,
        });

       return handleAuthResponse(c);
});

