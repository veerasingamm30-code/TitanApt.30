import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { loadSession } from '../lib/session.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export async function attachSession(req: Request, res: Response, next: NextFunction) {
  try {
    const loaded = await loadSession(req, res);
    if (loaded) {
      req.user = loaded.user;
      req.sessionId = loaded.sessionId;
      req.sessionTokenHash = loaded.tokenHash;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  return next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}
