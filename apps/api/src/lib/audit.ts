import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  target: string;
  summary: string;
  tx?: Prisma.TransactionClient;
}) {
  const client = input.tx ?? prisma;
  return client.adminAuditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      target: input.target,
      summary: input.summary,
    },
  });
}
