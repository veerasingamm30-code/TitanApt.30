import type { Request, Response } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { User, UserProfile } from '@prisma/client';
import { prisma } from '../prisma.js';
import { env, isProduction } from '../env.js';

export const SESSION_COOKIE = 'ta_session';
export const CSRF_COOKIE = 'ta_csrf';
const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MS,
  };
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE || isProduction });
}

export async function createSession(userId: string, res: Response) {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MS);
  const session = await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
    },
  });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  return session;
}

export async function destroySession(req: Request, res: Response, userId: string) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) {
    await prisma.session.deleteMany({ where: { userId, tokenHash: hashToken(token) } });
  }
  clearSessionCookie(res);
}

export type LoadedSession = { user: User & { profile: UserProfile | null }; sessionId: string; tokenHash: string };

export async function loadSession(req: Request, res: Response): Promise<LoadedSession | null> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token || token.length < 20) return null;
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { include: { profile: true } } },
  });
  if (!session) {
    clearSessionCookie(res);
    return null;
  }
  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    clearSessionCookie(res);
    return null;
  }
  const halfLife = SESSION_MS / 2;
  if (now - session.lastSeenAt.getTime() > 60 * 60 * 1000) {
    await prisma.session.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date(now),
        expiresAt: new Date(now + SESSION_MS),
      },
    });
  } else if (session.expiresAt.getTime() - now < halfLife) {
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date(now + SESSION_MS) } });
  }
  return { user: session.user, sessionId: session.id, tokenHash };
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
