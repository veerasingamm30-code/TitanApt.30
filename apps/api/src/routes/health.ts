import { Router } from 'express';
import { prisma } from '../prisma.js';

export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      service: 'titanapt-api',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

healthRouter.get('/ready', async (_req, res) => {
  const started = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    const latencyMs = Math.round((performance.now() - started) * 10) / 10;
    const [users, topics, questions, lessons, mocks] = await Promise.all([
      prisma.user.count(),
      prisma.topic.count(),
      prisma.question.count({ where: { reviewStatus: 'APPROVED' } }),
      prisma.lesson.count({ where: { status: 'APPROVED' } }),
      prisma.mockTest.count({ where: { status: 'PUBLISHED' } }),
    ]);
    res.json({
      data: {
        status: 'ok',
        database: { connected: true, latencyMs },
        content: { users, topics, approvedQuestions: questions, approvedLessons: lessons, publishedMocks: mocks },
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    res.status(503).json({
      error: {
        code: 'NOT_READY',
        message: 'The database is not reachable.',
        requestId: res.locals.requestId ?? undefined,
      },
    });
  }
});
