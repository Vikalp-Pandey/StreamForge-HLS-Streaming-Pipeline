import { setCookie } from 'hono/cookie';

import type { Context, Handler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const asyncHandler = (fn: Handler): Handler => {
  return async (c, next) => fn(c, next);
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  detail?: string;
  data?: T;
}

export const sendResponse = <T>(
  c: Context,
  statusCode: ContentfulStatusCode,
  detail?: string,
  data?: T,
) =>
  c.json(
    {
      success: statusCode < 400,
      statusCode,
      ...(detail !== undefined && { detail }),
      ...(data !== undefined && { data }),
    } satisfies ApiResponse<T>,
    statusCode,
  );

interface RedirectOptions {
  statusCode?: 301 | 302;
  queryParams?: Record<string, string | number>;
}

export const sendRedirect = (
  c: Context,
  url: string,
  options?: RedirectOptions,
) => {
  const statusCode = options?.statusCode ?? 302;
  let redirectUrl = url;

  if (options?.queryParams) {
    const params = new URLSearchParams(
      Object.entries(options.queryParams).map(([key, value]) => [
        key,
        String(value),
      ]),
    ).toString();
    redirectUrl += url.includes('?') ? `&${params}` : `?${params}`;
  }

  return c.redirect(redirectUrl, statusCode);
};

export interface CookieConfig {
  isSecure: boolean;
  sameSite: 'Lax' | 'None' | 'Strict';
}

export const sendCookie = (
  c: Context,
  label: string,
  token: string,
  config: CookieConfig,
  options: {
    maxAge?: number;
    expires?: Date;
    sameSite?: 'Lax' | 'None' | 'Strict';
  } = {},
) => {
  setCookie(c, label, token, {
    httpOnly: true,
    path: '/',
    secure: config.isSecure,
    sameSite: options.sameSite ?? config.sameSite,
    ...(options.maxAge !== undefined && {
      maxAge: Math.floor(options.maxAge / 1000),
    }),
    ...(options.expires !== undefined && { expires: options.expires }),
  });
};

export const logger = (
  messageInfo: 'INFO' | 'ERROR',
  detail: string,
  message?: unknown,
) => {
  // eslint-disable-next-line no-console -- shared application logger
  console.log(`${messageInfo}: ${detail}`);
  // eslint-disable-next-line no-console -- optional diagnostic context
  if (message !== undefined) console.log(message);
};

export enum ErrorType {
  NOT_FOUND = 'Resource Not Found',
  FORBIDDEN = 'Access Denied',
  UNAUTHORIZED = 'Authentication Required',
  BAD_REQUEST = 'Invalid Request',
  VALIDATION = 'Invalid Input',
  CONFLICT = 'Resource Already Exists',
  INTERNAL_SERVER = 'Something Went Wrong',
  VALIDATION_ERROR = 'Validation Error',
}


export class ApiError extends Error {
  errorType: ErrorType;
  statusCode: ContentfulStatusCode;

  constructor(
    statusCode: ContentfulStatusCode,
    message: string,
    errorType: ErrorType = ErrorType.INTERNAL_SERVER,
      ) {
    super(message);
    this.name = 'ApiError';
    this.errorType = errorType;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toResponseJSON() {
    return {
      success: false,
      error: this.errorType,
      message: this.message,
      stack: this.stack,
    };
  }
}

export const onError = (error: Error, ctx: Context) => {
  logger('ERROR', error.message, error.stack);

  if (error instanceof ApiError) {
    const response = error.toResponseJSON();
    return sendResponse(ctx, error.statusCode, error.message, {
      error: response.error,
      stack: response.stack,
    });
  }

  return sendResponse(ctx, 500, 'Something went wrong', {
    error: ErrorType.INTERNAL_SERVER,
    stack: error.stack,
  });
};

export const notFound = (c: Context) =>
  sendResponse(c, 404, `Route ${c.req.path} not found`, {
    error: ErrorType.NOT_FOUND,
  });
