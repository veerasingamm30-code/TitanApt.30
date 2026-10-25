import type { Prisma, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: Prisma.UserGetPayload<{ include: { profile: true } }>;
      sessionId?: string;
      sessionTokenHash?: string;
    }
  }
}

export type UserWithProfile = Prisma.UserGetPayload<{ include: { profile: true } }>;

