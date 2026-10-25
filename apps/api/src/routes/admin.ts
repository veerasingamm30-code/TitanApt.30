import { Router } from 'express';
import { Prisma, ReviewStatus, QuestionFlagStatus, MockStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, badRequest, notFound, parseBody } from '../lib/errors.js';
import { requireRole } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { questionInclude, toQuestionView } from '../lib/questionView.js';
import { runBoundedPdfImport } from '../services/pdfImport.js';

export const adminRouter = Router();

adminRouter.use(requireRole('ADMIN', 'REVIEWER'));

adminRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [users, pendingQuestions, approvedQuestions, openFlags, imports, audit] = await Promise.all([
      prisma.user.count(),
      prisma.question.count({ where: { reviewStatus: 'PENDING' } }),
      prisma.question.count({ where: { reviewStatus: 'APPROVED' } }),
      prisma.questionFlag.count({ where: { status: 'OPEN' } }),
      prisma.importJob.findMany({ orderBy: { startedAt: 'desc' }, take: 5, include: { source: true } }),
      prisma.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { actor: { select: { emailOriginal: true } } } }),
    ]);
    res.json({
      data: {
        counts: { users, pendingQuestions, approvedQuestions, openFlags },
        imports: imports.map((job) => ({
          id: job.id,
          status: job.status,
          source: job.source.filename,
          candidateCount: job.candidateCount,
          approvedCount: job.approvedCount,
          skippedCount: job.skippedCount,
          startedAt: job.startedAt.toISOString(),
        })),
        audit: audit.map((entry) => ({
          id: entry.id,
          action: entry.action,
          target: entry.target,
          summary: entry.summary,
          actor: entry.actor?.emailOriginal ?? 'system',
          createdAt: entry.createdAt.toISOString(),
        })),
      },
    });
  }),
);

const listSchema = z.object({
  status: z.nativeEnum(ReviewStatus).optional(),
  topic: z.string().trim().optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

adminRouter.get(
  '/questions',
  asyncHandler(async (req, res) => {
    const query = listSchema.parse(req.query);
    const where: Prisma.QuestionWhereInput = {
      ...(query.status ? { reviewStatus: query.status } : {}),
      ...(query.topic ? { topic: { slug: query.topic } } : {}),
      ...(query.search
        ? { OR: [{ stem: { contains: query.search, mode: 'insensitive' } }, { sourceKey: { contains: query.search, mode: 'insensitive' } }] }
        : {}),
    };
    const [total, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        include: { ...questionInclude, options: true, correctOption: true },
        orderBy: [{ reviewStatus: 'asc' }, { sourceKey: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    res.json({
      data: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        questions: questions.map((question) => ({
          ...toQuestionView(question),
          reviewStatus: question.reviewStatus,
          sourceKey: question.sourceKey,
          sourceCheck: question.sourceCheck,
          explanation: question.explanation,
          steps: question.steps,
          correctOptionId: question.correctOptionId,
          reviewNote: null,
        })),
      },
    });
  }),
);

const reviewSchema = z.object({
  reviewStatus: z.nativeEnum(ReviewStatus),
  correctOptionId: z.string().min(1).nullable().optional(),
  note: z.string().trim().max(500).optional(),
});

adminRouter.patch(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const input = parseBody(reviewSchema, req);
    const question = await prisma.question.findUnique({
      where: { id: req.params.id },
      include: { options: true },
    });
    if (!question) throw notFound('Question not found.');
    if (input.correctOptionId) {
      if (!question.options.some((option) => option.id === input.correctOptionId)) {
        throw badRequest('INVALID_OPTION', 'The correct option must belong to this question.');
      }
    }
    const correctOptionId = input.correctOptionId === undefined ? question.correctOptionId : input.correctOptionId;
    if (input.reviewStatus === 'APPROVED') {
      if (!correctOptionId) throw badRequest('MISSING_ANSWER', 'Set a verified correct option before approving.');
      if (!question.explanation.trim()) throw badRequest('MISSING_EXPLANATION', 'Add an explanation before approving.');
      if (question.options.length < 2) throw badRequest('NOT_ENOUGH_OPTIONS', 'A question needs at least two options.');
    }
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.question.update({
        where: { id: question.id },
        data: { reviewStatus: input.reviewStatus, correctOptionId },
      });
      await writeAudit({
        actorId: req.user!.id,
        action: 'QUESTION_REVIEWED',
        target: `question:${question.id}`,
        summary: `${input.reviewStatus}${input.note ? ` — ${input.note}` : ''}`,
        tx,
      });
      return row;
    });
    res.json({ data: { id: updated.id, reviewStatus: updated.reviewStatus, correctOptionId: updated.correctOptionId } });
  }),
);

const flagsSchema = z.object({
  status: z.nativeEnum(QuestionFlagStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

adminRouter.get(
  '/flags',
  asyncHandler(async (req, res) => {
    const query = flagsSchema.parse(req.query);
    const where = query.status ? { status: query.status } : {};
    const [total, flags] = await Promise.all([
      prisma.questionFlag.count({ where }),
      prisma.questionFlag.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { emailOriginal: true } },
          question: { select: { id: true, stem: true, sourceKey: true, reviewStatus: true } },
        },
      }),
    ]);
    res.json({
      data: {
        total,
        page: query.page,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        flags: flags.map((flag) => ({
          id: flag.id,
          note: flag.note,
          status: flag.status,
          createdAt: flag.createdAt.toISOString(),
          user: flag.user.emailOriginal,
          question: flag.question,
        })),
      },
    });
  }),
);

adminRouter.patch(
  '/flags/:id',
  asyncHandler(async (req, res) => {
    const input = parseBody(z.object({ status: z.enum(['REVIEWED', 'DISMISSED']) }), req);
    const flag = await prisma.questionFlag.findUnique({ where: { id: req.params.id } });
    if (!flag) throw notFound('Flag not found.');
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.questionFlag.update({
        where: { id: flag.id },
        data: { status: input.status, resolvedAt: new Date() },
      });
      await writeAudit({
        actorId: req.user!.id,
        action: 'FLAG_UPDATED',
        target: `flag:${flag.id}`,
        summary: `Flag marked ${input.status}.`,
        tx,
      });
      return row;
    });
    res.json({ data: { id: updated.id, status: updated.status } });
  }),
);

adminRouter.get(
  '/imports',
  asyncHandler(async (_req, res) => {
    const [sources, jobs] = await Promise.all([
      prisma.importSource.findMany({ orderBy: { filename: 'asc' } }),
      prisma.importJob.findMany({ orderBy: { startedAt: 'desc' }, take: 20, include: { source: true } }),
    ]);
    res.json({
      data: {
        sources,
        jobs: jobs.map((job) => ({
          id: job.id,
          source: job.source.filename,
          status: job.status,
          warnings: job.warnings,
          processedPages: job.processedPages,
          candidateCount: job.candidateCount,
          approvedCount: job.approvedCount,
          skippedCount: job.skippedCount,
          startedAt: job.startedAt.toISOString(),
          finishedAt: job.finishedAt?.toISOString() ?? null,
        })),
      },
    });
  }),
);

adminRouter.post(
  '/imports/run',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({
        chapter: z.coerce.number().int().min(1).max(25).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
      req,
    );
    let result;
    try {
      result = await runBoundedPdfImport({
        chapter: input.chapter,
        limit: input.limit,
        createdById: req.user!.id,
      });
    } catch (error) {
      throw badRequest(
        'IMPORT_FAILED',
        error instanceof Error ? error.message : 'The bounded import could not be completed.',
      );
    }
    await writeAudit({
      actorId: req.user!.id,
      action: 'IMPORT_RUN',
      target: `import:${result.jobId}`,
      summary: `Chapter ${result.chapter} (${result.chapterTitle}); imported ${result.importedCount} pending, skipped ${result.skippedCount}.`,
    });
    res.status(201).json({ data: result });
  }),
);

adminRouter.get(
  '/audit',
  asyncHandler(async (_req, res) => {
    const entries = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: { select: { emailOriginal: true } } },
    });
    res.json({
      data: entries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        target: entry.target,
        summary: entry.summary,
        actor: entry.actor?.emailOriginal ?? 'system',
        createdAt: entry.createdAt.toISOString(),
      })),
    });
  }),
);

adminRouter.get(
  '/mocks',
  asyncHandler(async (_req, res) => {
    const mocks = await prisma.mockTest.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { attempts: true } } },
    });
    res.json({ data: mocks });
  }),
);

adminRouter.patch(
  '/mocks/:id',
  asyncHandler(async (req, res) => {
    const input = parseBody(z.object({ status: z.nativeEnum(MockStatus) }), req);
    const mock = await prisma.mockTest.findUnique({ where: { id: req.params.id } });
    if (!mock) throw notFound('Mock test not found.');
    if (input.status === 'PUBLISHED') {
      const sections = mock.sections as Array<{ count?: unknown }>;
      if (!Array.isArray(sections) || sections.length === 0) throw badRequest('INVALID_SECTIONS', 'The mock has no sections.');
    }
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.mockTest.update({ where: { id: mock.id }, data: { status: input.status } });
      await writeAudit({
        actorId: req.user!.id,
        action: 'MOCK_STATUS_UPDATED',
        target: `mock:${mock.id}`,
        summary: `Mock "${mock.title}" set to ${input.status}.`,
        tx,
      });
      return row;
    });
    res.json({ data: { id: updated.id, status: updated.status } });
  }),
);
