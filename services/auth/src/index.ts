import { Hono } from 'hono';
import { signup } from './controllers/authControllers/signup';
import { verifyOtp } from './controllers/authControllers/verifyOtp';
import { signin } from './controllers/authControllers/signin';
import { logout } from './controllers/authControllers/logout';
import { resetPassword } from './controllers/authControllers/resetPassword';
import { forgotPassword } from './controllers/authControllers/forgotPassword';
import {
  githubCallback,
  githubLogin,
} from './controllers/oauthControllers/github';
import {
  googleLogin,
  googleCallback,
} from './controllers/oauthControllers/google';
import { me } from './controllers/authControllers/me';

export const createAuth = () => {
  const authApp = new Hono();

  authApp.get('/me', me);
  authApp.post('/signup', signup);
  authApp.post('/signin', signin);
  authApp.post('/forgot-password', forgotPassword);
  authApp.post('/reset-password', resetPassword);
  authApp.post('/logout', logout);
  authApp.post('/verify-otp', verifyOtp);

  authApp.get('/github', githubLogin);
  authApp.get('/callback/github', githubCallback);

  authApp.get('/google', googleLogin);
  authApp.get('/callback/google', googleCallback);

  return authApp;
};

export default createAuth;
