import axios from 'axios';
import {env} from '@repo/env/client';

const baseURL = env.VITE_API_URL;
console.log(baseURL);
export const api = axios.create({
  baseURL,
  withCredentials: true,
});
