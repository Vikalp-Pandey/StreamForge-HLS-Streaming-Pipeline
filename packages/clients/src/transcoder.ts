import { env } from '@repo/env/server';

import axios, { type AxiosRequestConfig } from 'axios';

export function sendTranscoderRequest<T = unknown>(
  path: string,
  config?: AxiosRequestConfig,
) {
  if (!env.TRANSCODER_URL || !env.TRANSCODER_INTERNAL_KEY) {
    throw new Error('Transcoder URL and internal key must be configured.');
  }

  return axios.request<T>({
    ...config,
    baseURL: env.TRANSCODER_URL,
    url: path,
    headers: {
      ...config?.headers,
      'x-transcoder-key': env.TRANSCODER_INTERNAL_KEY,
    },
  });
}
