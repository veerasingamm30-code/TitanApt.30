import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, notFound, parseBody } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { READINESS_ITEMS } from '../data/readiness.js';

export const readinessRouter = Router();

readinessRouter.use(requireAuth);

readinessRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const completed = await prisma.resourceChecklistProgress.findMany({ where: { userId: req.user!.id } });
    const completedByKey = new Map(completed.map((row) => [row.itemKey, row.completedAt]));
    const items = READINESS_ITEMS.map((item) => ({
      ...item,
      completed: completedByKey.has(item.key),
      completedAt: completedByKey.get(item.key)?.toISOString() ?? null,
    }));
    res.json({
      data: {
        items,
        completedCount: items.filter((item) => item.completed).length,
        totalCount: items.length,
      },
    });
  }),
);

readinessRouter.patch(
  '/:itemKey',
  asyncHandler(async (req, res) => {
    const schema = z.object({ completed: z.boolean() });
    const input = parseBody(schema, req);
    const item = READINESS_ITEMS.find((candidate) => candidate.key === req.params.itemKey);
    if (!item) throw notFound('Checklist item not found.');
    if (input.completed) {
      await prisma.resourceChecklistProgress.upsert({
        where: { userId_itemKey: { userId: req.user!.id, itemKey: item.key } },
        create: { userId: req.user!.id, itemKey: item.key },
        update: {},
      });
    } else {
      await prisma.resourceChecklistProgress.deleteMany({ where: { userId: req.user!.id, itemKey: item.key } });
    }
    res.json({ data: { itemKey: item.key, completed: input.completed } });
  }),
);
