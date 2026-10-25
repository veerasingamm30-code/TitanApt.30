import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { loginSchema, signupSchema } from '@titanapt/shared';
import { prisma } from '../prisma.js';
import { normalizeEmail } from '../lib/email.js';
import { hashPassword, verifyDummyPassword, verifyPassword } from '../lib/password.js';
import { asyncHandler, badRequest, conflict, unauthorized } from '../lib/errors.js';
import { parseBody } from '../lib/errors.js';
import { serializeUser } from '../lib/serialize.js';
import { createSession, destroySession, hashToken, SESSION_COOKIE } from '../lib/session.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, loginLimiter, signupLimiter } from '../middleware/rateLimits.js';

export const authRouter = Router();

authRouter.get('/csrf', (req, res) => {
  const token = issueCsrfToken(req, res);
  res.json({ data: { csrfToken: token } });
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: { user: serializeUser(req.user!) } });
  }),
);

authRouter.post(
  '/signup',
  signupLimiter,
  asyncHandler(async (req, res) => {
    const input = parseBody(signupSchema, req);
    const emailNormalized = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);

    let user: Prisma.UserGetPayload<{ include: { profile: true } }>;
    try {
      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            emailOriginal: input.email.trim(),
            emailNormalized,
            passwordHash,
            role: 'LEARNER',
            profile: {
              create: {
                displayName: input.displayName.trim(),
                timezone: 'Asia/Kolkata',
                dailyGoal: 10,
              },
            },
          },
          include: { profile: true },
        });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('EMAIL_TAKEN', 'An account with this email already exists. Try signing in instead.');
      }
      throw error;
    }

    const oldToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (oldToken) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(oldToken) } });
    }
    await createSession(user.id, res);
    issueCsrfToken(req, res);
    res.status(201).json({ data: { user: serializeUser(user) } });
  }),
);

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const input = parseBody(loginSchema, req);
    const emailNormalized = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({
      where: { emailNormalized },
      include: { profile: true },
    });

    if (!user) {
      await verifyDummyPassword(input.password);
      throw unauthorized('Email or password is incorrect.');
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      throw unauthorized('Email or password is incorrect.');
    }

    const oldToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (oldToken) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(oldToken) } });
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id, res);
    issueCsrfToken(req, res);
    res.json({ data: { user: serializeUser(user) } });
  }),
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await destroySession(req, res, req.user!.id);
    res.json({ data: { ok: true } });
  }),
);

authRouter.patch(
  '/profile',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      displayName: z.string().trim().min(2).max(60).optional(),
      timezone: z.string().trim().min(1).max(80).optional(),
      dailyGoal: z.coerce.number().int().min(5).max(100).optional(),
    });
    const input = parseBody(schema, req);
    if (input.timezone) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: input.timezone }).format(new Date());
      } catch {
        throw badRequest('INVALID_TIMEZONE', 'Choose a valid timezone.');
      }
    }
    await prisma.userProfile.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        displayName: input.displayName ?? req.user!.profile?.displayName ?? 'Learner',
        timezone: input.timezone ?? 'Asia/Kolkata',
        dailyGoal: input.dailyGoal ?? 10,
      },
      update: {
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
        ...(input.dailyGoal ? { dailyGoal: input.dailyGoal } : {}),
      },
    });
    const fresh = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { profile: true },
    });
    res.json({ data: { user: serializeUser(fresh) } });
  }),
);

