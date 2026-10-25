import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, conflict, notFound, parseBody } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { parseMarking, parseSections } from '../lib/mock.js';
import { questionInclude, toQuestionView } from '../lib/questionView.js';
import { percentage, scoreAnswers } from '../lib/metrics.js';

export const mockRouter = Router();

mockRouter.use(requireAuth);

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function getAttemptForUser(attemptId: string, userId: string) {
  return prisma.mockTestAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      mockTest: true,
      questions: {
        orderBy: { position: 'asc' },
        include: { question: { include: questionInclude } },
      },
    },
  });
}

type LoadedAttempt = NonNullable<Awaited<ReturnType<typeof getAttemptForUser>>>;

function attemptPayload(attempt: LoadedAttempt, includeResults = false) {
  if (!attempt) throw notFound('Mock attempt not found.');
  const sections = parseSections(attempt.mockTest.sections);
  const marking = parseMarking(attempt.mockTest.marking);
  const now = Date.now();
  const secondsRemaining = Math.max(0, Math.floor((attempt.deadlineAt.getTime() - now) / 1000));
  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    deadlineAt: attempt.deadlineAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    secondsRemaining,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage,
    mock: {
      slug: attempt.mockTest.slug,
      title: attempt.mockTest.title,
      description: attempt.mockTest.description,
      durationMinutes: attempt.mockTest.durationMinutes,
      sections,
      marking,
      sourceNote: attempt.mockTest.sourceNote,
    },
    questions: attempt.questions.map((item) => ({
      ...toQuestionView(item.question),
      position: item.position,
      selectedOptionId: item.selectedOptionId,
      ...(includeResults || attempt.status === 'SUBMITTED'
        ? { correctOptionId: item.question.correctOptionId, explanation: item.question.explanation, steps: item.question.steps }
        : {}),
    })),
  };
}

mockRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const mocks = await prisma.mockTest.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'asc' },
      include: {
        attempts: {
          where: { userId: req.user!.id },
          orderBy: { startedAt: 'desc' },
          select: { id: true, status: true, percentage: true, score: true, maxScore: true, startedAt: true, submittedAt: true },
        },
      },
    });
    res.json({
      data: mocks.map((mock) => ({
        id: mock.id,
        slug: mock.slug,
        title: mock.title,
        description: mock.description,
        durationMinutes: mock.durationMinutes,
        sections: parseSections(mock.sections),
        marking: parseMarking(mock.marking),
        sourceNote: mock.sourceNote,
        attempts: mock.attempts.map((attempt) => ({
          ...attempt,
          startedAt: attempt.startedAt.toISOString(),
          submittedAt: attempt.submittedAt?.toISOString() ?? null,
        })),
      })),
    });
  }),
);

mockRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const mock = await prisma.mockTest.findUnique({ where: { slug: req.params.slug } });
    if (!mock || mock.status !== 'PUBLISHED') throw notFound('Mock test not found.');
    const attempts = await prisma.mockTestAttempt.findMany({
      where: { userId: req.user!.id, mockTestId: mock.id },
      orderBy: { startedAt: 'desc' },
      select: { id: true, status: true, percentage: true, startedAt: true, submittedAt: true },
    });
    res.json({
      data: {
        id: mock.id,
        slug: mock.slug,
        title: mock.title,
        description: mock.description,
        durationMinutes: mock.durationMinutes,
        sections: parseSections(mock.sections),
        marking: parseMarking(mock.marking),
        sourceNote: mock.sourceNote,
        attempts,
      },
    });
  }),
);

mockRouter.post(
  '/:slug/start',
  asyncHandler(async (req, res) => {
    const mock = await prisma.mockTest.findUnique({ where: { slug: req.params.slug } });
    if (!mock || mock.status !== 'PUBLISHED') throw notFound('Mock test not found.');
    const sections = parseSections(mock.sections);

    const active = await prisma.mockTestAttempt.findFirst({
      where: { userId: req.user!.id, mockTestId: mock.id, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
      include: {
        mockTest: true,
        questions: { orderBy: { position: 'asc' }, include: { question: { include: questionInclude } } },
      },
    });
    if (active) {
      if (active.deadlineAt.getTime() <= Date.now()) {
        await prisma.mockTestAttempt.update({ where: { id: active.id }, data: { status: 'EXPIRED' } });
      } else {
        return res.json({ data: { ...attemptPayload(active), resumed: true } });
      }
    }

    const selectedIds: string[] = [];
    for (const section of sections) {
      const available = await prisma.question.findMany({
        where: {
          reviewStatus: 'APPROVED',
          correctOptionId: { not: null },
          topic: { subject: section.subject, isPublished: true },
          ...(section.difficulty ? { difficulty: section.difficulty } : {}),
          id: { notIn: selectedIds },
        },
        select: { id: true },
      });
      if (available.length < section.count) {
        throw conflict('MOCK_POOL_TOO_SMALL', `"${section.name}" needs ${section.count} verified questions but only ${available.length} are available. Add reviewed questions or edit the mock.`);
      }
      selectedIds.push(...shuffle(available).slice(0, section.count).map((row) => row.id));
    }

    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + mock.durationMinutes * 60 * 1000);
    const attempt = await prisma.mockTestAttempt.create({
      data: {
        userId: req.user!.id,
        mockTestId: mock.id,
        startedAt,
        deadlineAt,
        questions: {
          create: selectedIds.map((questionId, index) => ({ questionId, position: index + 1 })),
        },
      },
    });
    const loaded = await prisma.mockTestAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      include: {
        mockTest: true,
        questions: { orderBy: { position: 'asc' }, include: { question: { include: questionInclude } } },
      },
    });
    res.status(201).json({ data: { ...attemptPayload(loaded), resumed: false } });
  }),
);

mockRouter.get(
  '/attempts/:attemptId',
  asyncHandler(async (req, res) => {
    const attempt = await getAttemptForUser(req.params.attemptId, req.user!.id);
    if (!attempt) throw notFound('Mock attempt not found.');
    if (attempt.status === 'IN_PROGRESS' && attempt.deadlineAt.getTime() <= Date.now()) {
      await prisma.mockTestAttempt.update({ where: { id: attempt.id }, data: { status: 'EXPIRED' } });
      attempt.status = 'EXPIRED';
    }
    res.json({ data: attemptPayload(attempt) });
  }),
);

const answerSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1).nullable(),
});

mockRouter.patch(
  '/attempts/:attemptId/answer',
  asyncHandler(async (req, res) => {
    const input = parseBody(answerSchema, req);
    const attempt = await prisma.mockTestAttempt.findFirst({
      where: { id: req.params.attemptId, userId: req.user!.id },
      include: { questions: { where: { questionId: input.questionId }, include: { question: { include: { options: true } } } } },
    });
    if (!attempt) throw notFound('Mock attempt not found.');
    if (attempt.status !== 'IN_PROGRESS') throw conflict('ATTEMPT_CLOSED', 'This attempt is no longer accepting answers.');
    if (attempt.deadlineAt.getTime() <= Date.now()) {
      await prisma.mockTestAttempt.update({ where: { id: attempt.id }, data: { status: 'EXPIRED' } });
      throw conflict('TIME_EXPIRED', 'Time is up. Submit the attempt to see your score.');
    }
    const item = attempt.questions[0];
    if (!item) throw notFound('That question is not part of this attempt.');
    if (input.optionId && !item.question.options.some((option) => option.id === input.optionId)) {
      throw conflict('INVALID_OPTION', 'That option does not belong to this question.');
    }
    await prisma.mockAttemptQuestion.update({
      where: { id: item.id },
      data: {
        selectedOptionId: input.optionId,
        answeredAt: input.optionId ? new Date() : null,
      },
    });
    res.json({
      data: {
        savedAt: new Date().toISOString(),
        secondsRemaining: Math.max(0, Math.floor((attempt.deadlineAt.getTime() - Date.now()) / 1000)),
      },
    });
  }),
);

mockRouter.post(
  '/attempts/:attemptId/submit',
  asyncHandler(async (req, res) => {
    const attempt = await getAttemptForUser(req.params.attemptId, req.user!.id);
    if (!attempt) throw notFound('Mock attempt not found.');
    if (attempt.status === 'SUBMITTED') {
      return res.json({ data: { ...attemptPayload(attempt), idempotent: true } });
    }
    const marking = parseMarking(attempt.mockTest.marking);
    const scored = scoreAnswers(
      attempt.questions.map((item) => ({
        selectedOptionId: item.selectedOptionId,
        correctOptionId: item.question.correctOptionId,
      })),
      marking,
    );
    const submittedAt = new Date();
    await prisma.mockTestAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'SUBMITTED',
        score: scored.score,
        maxScore: scored.maxScore,
        percentage: scored.percentage,
        submittedAt,
      },
    });
    const updated = await getAttemptForUser(attempt.id, req.user!.id);
    if (!updated) throw notFound('Mock attempt not found after submission.');
    const payload = attemptPayload(updated, true);
    res.status(201).json({
      data: {
        ...payload,
        correct: scored.correct,
        incorrect: scored.incorrect,
        unanswered: scored.unanswered,
        percentage: percentage(scored.score, scored.maxScore),
      },
    });
  }),
);

