import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../env.js';

function handler(_req: Request, res: Response) {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait and try again.',
      requestId: res.locals.requestId ?? undefined,
    },
  });
}

const base = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler,
};

export const generalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
});

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

export const signupLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

export const writeLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 120,
});

export function attachRequestIdLocals(_req: Request, res: Response, next: NextFunction) {
  res.locals.requestId = _req.requestId;
  next();
}
