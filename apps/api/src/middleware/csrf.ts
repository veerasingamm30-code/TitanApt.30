import type { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { env, isProduction } from '../env.js';
import { AppError } from '../lib/errors.js';
import { CSRF_COOKIE, safeEqual } from '../lib/session.js';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function cookieOptions() {
  return {
    httpOnly: false,
    secure: env.COOKIE_SECURE || isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function issueCsrfToken(req: Request, res: Response): string {
  const existing = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const token = existing && existing.length >= 32 ? existing : randomBytes(32).toString('base64url');
  res.cookie(CSRF_COOKIE, token, cookieOptions());
  return token;
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (!UNSAFE.has(req.method)) return next();
  if (req.path === '/health/live' || req.path === '/health/ready') return next();
  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const headerToken = req.header('x-csrf-token');
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(new AppError(403, 'CSRF_INVALID', 'Your session token is missing or expired. Refresh the page and try again.'));
  }
  return next();
}

