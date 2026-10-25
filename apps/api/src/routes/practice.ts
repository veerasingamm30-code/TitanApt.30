import { Router } from 'express';
import { Difficulty, Subject } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, conflict, notFound, parseBody } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { questionInclude, toQuestionView } from '../lib/questionView.js';
import { env } from '../env.js';

export const practiceRouter = Router();

practiceRouter.use(requireAuth);

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const createSchema = z.object({
  topicSlug: z.string().trim().min(1).max(100).optional(),
  subject: z.nativeEnum(Subject).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  companySlug: z.string().trim().min(1).max(100).optional(),
  count: z.coerce.number().int().min(5).max(20).default(10),
});

practiceRouter.post(
  '/sessions',
  asyncHandler(async (req, res) => {
    const input = parseBody(createSchema, req);
    let topicId: string | undefined;
    if (input.topicSlug) {
      const topic = await prisma.topic.findUnique({ where: { slug: input.topicSlug } });
      if (!topic || !topic.isPublished) throw notFound('That topic is not available.');
      topicId = topic.id;
    }
    let companyTopicSlugs: string[] | undefined;
    if (input.companySlug) {
      const company = await prisma.company.findUnique({ where: { slug: input.companySlug } });
      if (!company) throw notFound('That company profile is not available.');
      if (company.topicSlugs.length === 0) {
        throw conflict('NO_QUESTIONS', 'This company profile does not have mapped learning topics yet.');
      }
      companyTopicSlugs = company.topicSlugs;
    }

    const topicFilter = {
      isPublished: true,
      ...(input.subject ? { subject: input.subject } : {}),
      ...(companyTopicSlugs ? { slug: { in: companyTopicSlugs } } : {}),
    };

    const candidates = await prisma.question.findMany({
      where: {
        reviewStatus: 'APPROVED',
        correctOptionId: { not: null },
        ...(topicId ? { topicId } : {}),
        ...(input.difficulty ? { difficulty: input.difficulty } : {}),
        topic: topicFilter,
      },
      select: { id: true },
    });
    if (candidates.length === 0) {
      throw conflict('NO_QUESTIONS', 'No verified questions match those filters yet. Try another topic or difficulty.');
    }

    const cutoff = new Date(Date.now() - env.NO_REPEAT_DAYS * 24 * 60 * 60 * 1000);
    const recent = await prisma.questionAttempt.findMany({
      where: { userId: req.user!.id, answeredAt: { gte: cutoff } },
      select: { questionId: true },
      distinct: ['questionId'],
    });
    const recentIds = new Set(recent.map((row) => row.questionId));
    const fresh = candidates.filter((row) => !recentIds.has(row.id));
    const repeated = candidates.filter((row) => recentIds.has(row.id));
    const selectedIds = [...shuffle(fresh), ...shuffle(repeated)]
      .slice(0, input.count)
      .map((row) => row.id);
    const session = await prisma.practiceSession.create({
      data: {
        userId: req.user!.id,
        filters: input,
        questionCount: selectedIds.length,
        questions: {
          create: selectedIds.map((questionId, index) => ({ questionId, position: index + 1 })),
        },
      },
    });
    const questions = await prisma.question.findMany({
      where: { id: { in: selectedIds } },
      include: questionInclude,
    });
    const byId = new Map(questions.map((q) => [q.id, q]));
    res.status(201).json({
      data: {
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        filters: input,
        questions: selectedIds.map((id) => toQuestionView(byId.get(id)!)),
      },
    });
  }),
);

practiceRouter.get(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const session = await prisma.practiceSession.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: { question: { include: { options: true, topic: true } } },
        },
      },
    });
    if (!session) throw notFound('Practice session not found.');
    res.json({
      data: {
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
        filters: session.filters,
        answeredCount: session.questions.filter((q) => q.answeredAt).length,
        questionCount: session.questionCount,
        questions: session.questions.map((item) => ({
          ...toQuestionView(item.question),
          selectedOptionId: item.selectedOptionId,
          answeredAt: item.answeredAt?.toISOString() ?? null,
        })),
      },
    });
  }),
);

const answerSchema = z.object({
  optionId: z.string().min(1),
  durationMs: z.coerce.number().int().min(0).max(60 * 60 * 1000).optional(),
  idempotencyKey: z.string().trim().min(8).max(100).regex(/^[A-Za-z0-9_-]+$/),
});

practiceRouter.post(
  '/sessions/:sessionId/questions/:questionId/answer',
  asyncHandler(async (req, res) => {
    const input = parseBody(answerSchema, req);
    const userId = req.user!.id;
    const session = await prisma.practiceSession.findFirst({
      where: { id: req.params.sessionId, userId },
      include: { questions: { where: { questionId: req.params.questionId } } },
    });
    if (!session) throw notFound('Practice session not found.');
    const item = session.questions[0];
    if (!item) throw notFound('That question is not part of this session.');

    const existing = await prisma.questionAttempt.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
    });
    if (existing) {
      const question = await prisma.question.findUniqueOrThrow({ where: { id: existing.questionId }, include: { options: true } });
      return res.json({ data: feedbackFor(question, existing.selectedOptionId, true) });
    }
    if (item.answeredAt) throw conflict('ALREADY_ANSWERED', 'This question is already answered.');

    const question = await prisma.question.findUnique({
      where: { id: req.params.questionId },
      include: { options: true },
    });
    if (!question || question.reviewStatus !== 'APPROVED' || !question.correctOptionId) throw notFound('Question not found.');
    if (!question.options.some((option) => option.id === input.optionId)) {
      throw conflict('INVALID_OPTION', 'That option does not belong to this question.');
    }
    const isCorrect = question.correctOptionId === input.optionId;

    await prisma.$transaction(async (tx) => {
      await tx.practiceSessionQuestion.update({
        where: { id: item.id },
        data: { selectedOptionId: input.optionId, answeredAt: new Date() },
      });
      await tx.questionAttempt.create({
        data: {
          userId,
          questionId: question.id,
          selectedOptionId: input.optionId,
          isCorrect,
          durationMs: input.durationMs,
          idempotencyKey: input.idempotencyKey,
          mode: 'PRACTICE',
          practiceSessionId: session.id,
        },
      });
      const remaining = await tx.practiceSessionQuestion.count({
        where: { sessionId: session.id, answeredAt: null },
      });
      if (remaining === 0) {
        await tx.practiceSession.update({ where: { id: session.id }, data: { completedAt: new Date() } });
      }
    });

    res.status(201).json({ data: feedbackFor(question, input.optionId, false) });
  }),
);

function feedbackFor(
  question: {
    id: string;
    correctOptionId: string | null;
    explanation: string;
    reasoning: string | null;
    steps: unknown;
    shortcuts: string | null;
    options: Array<{ id: string; label: string; text: string }>;
  },
  selectedOptionId: string,
  idempotent: boolean,
) {
  return {
    questionId: question.id,
    selectedOptionId,
    correctOptionId: question.correctOptionId,
    isCorrect: selectedOptionId === question.correctOptionId,
    explanation: question.explanation,
    reasoning: question.reasoning,
    steps: question.steps,
    shortcuts: question.shortcuts,
    correctOption: question.options.find((option) => option.id === question.correctOptionId) ?? null,
    idempotent,
  };
}
