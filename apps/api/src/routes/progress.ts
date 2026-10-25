import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, badRequest, notFound, parseBody } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { questionInclude, toQuestionView } from '../lib/questionView.js';

export const progressRouter = Router();

progressRouter.use(requireAuth);

const checkpointSchema = z.object({
  submissionKey: z.string().trim().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/),
  answers: z
    .array(z.object({ questionId: z.string().min(1), optionId: z.string().min(1) }))
    .min(1)
    .max(10),
});

progressRouter.post(
  '/lessons/:lessonId/checkpoint',
  asyncHandler(async (req, res) => {
    const input = parseBody(checkpointSchema, req);
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.lessonId },
      include: {
        checkpoints: {
          orderBy: { position: 'asc' },
          include: { question: { include: { options: true, topic: true } } },
        },
      },
    });
    if (!lesson || lesson.status !== 'APPROVED') throw notFound('That lesson is not available.');

    const checkpointQuestions = lesson.checkpoints
      .map((cp) => cp.question)
      .filter((q) => q.reviewStatus === 'APPROVED' && q.correctOptionId);
    if (checkpointQuestions.length === 0) throw notFound('This lesson has no verified checkpoint questions.');

    const answerMap = new Map<string, string>();
    for (const answer of input.answers) {
      if (answerMap.has(answer.questionId)) throw badRequest('DUPLICATE_ANSWER', 'Each checkpoint question can be answered once.');
      answerMap.set(answer.questionId, answer.optionId);
    }
    for (const question of checkpointQuestions) {
      if (!answerMap.has(question.id)) throw badRequest('INCOMPLETE_CHECKPOINT', 'Answer every checkpoint question before submitting.');
      const option = question.options.find((o) => o.id === answerMap.get(question.id));
      if (!option) throw badRequest('INVALID_OPTION', 'One of the selected options does not belong to its question.');
    }
    if (answerMap.size !== checkpointQuestions.length) {
      throw badRequest('UNEXPECTED_QUESTION', 'The submission contains a question outside this checkpoint.');
    }

    const existing = await prisma.questionAttempt.findMany({
      where: {
        userId: req.user!.id,
        idempotencyKey: { startsWith: `cp:${input.submissionKey}:` },
      },
    });
    if (existing.length === checkpointQuestions.length) {
      const storedByQuestion = new Map(existing.map((attempt) => [attempt.questionId, attempt.selectedOptionId]));
      return res.json(buildCheckpointResponse(checkpointQuestions, storedByQuestion, true));
    }
    if (existing.length > 0) throw badRequest('SUBMISSION_INCOMPLETE', 'This checkpoint submission was already partially recorded. Start a new submission.');

    const results = checkpointQuestions.map((question) => ({
      question,
      selectedOptionId: answerMap.get(question.id)!,
      isCorrect: answerMap.get(question.id) === question.correctOptionId,
    }));
    const correctCount = results.filter((r) => r.isCorrect).length;
    const total = checkpointQuestions.length;
    const passed = correctCount >= Math.ceil(total * 2 / 3);

    await prisma.$transaction(async (tx) => {
      await tx.questionAttempt.createMany({
        data: results.map((result) => ({
          userId: req.user!.id,
          questionId: result.question.id,
          selectedOptionId: result.selectedOptionId,
          isCorrect: result.isCorrect,
          idempotencyKey: `cp:${input.submissionKey}:${result.question.id}`,
          mode: 'CHECKPOINT' as const,
        })),
      });
      const progress = await tx.userProgress.findUnique({
        where: { userId_lessonId: { userId: req.user!.id, lessonId: lesson.id } },
      });
      await tx.userProgress.upsert({
        where: { userId_lessonId: { userId: req.user!.id, lessonId: lesson.id } },
        create: {
          userId: req.user!.id,
          lessonId: lesson.id,
          status: passed ? 'COMPLETED' : 'IN_PROGRESS',
          bestScore: correctCount,
          attemptsCount: 1,
        },
        update: {
          status: passed || progress?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
          bestScore: Math.max(progress?.bestScore ?? 0, correctCount),
          attemptsCount: { increment: 1 },
        },
      });
    });

    const storedByQuestion = new Map(results.map((r) => [r.question.id, r.selectedOptionId]));
    return res.status(201).json(buildCheckpointResponse(checkpointQuestions, storedByQuestion, false));
  }),
);

function buildCheckpointResponse(
  questions: Array<{
    id: string;
    correctOptionId: string | null;
    explanation: string;
    steps: unknown;
    shortcuts: string | null;
    reasoning: string | null;
    options: Array<{ id: string; label: string; text: string }>;
    topic: { slug: string; name: string; subject: string };
    stem: string;
    statement: string | null;
    difficulty: string;
    sourceDocument: string;
    sourcePage: number;
  }>,
  selectedByQuestion: Map<string, string>,
  idempotent: boolean,
) {
  const results = questions.map((question) => {
    const selectedOptionId = selectedByQuestion.get(question.id) ?? null;
    return {
      questionId: question.id,
      selectedOptionId,
      correctOptionId: question.correctOptionId,
      isCorrect: selectedOptionId !== null && selectedOptionId === question.correctOptionId,
      explanation: question.explanation,
      reasoning: question.reasoning,
      steps: question.steps,
      shortcuts: question.shortcuts,
    };
  });
  const correct = results.filter((r) => r.isCorrect).length;
  const total = questions.length;
  return {
    data: {
      correct,
      total,
      passed: correct >= Math.ceil(total * 2 / 3),
      idempotent,
      results,
      questions: questions.map((q) => ({
        id: q.id,
        stem: q.stem,
        statement: q.statement,
        difficulty: q.difficulty,
        topic: q.topic,
        options: [...q.options].sort((a, b) => a.label.localeCompare(b.label)),
        sourceDocument: q.sourceDocument,
        sourcePage: q.sourcePage,
      })),
    },
  };
}

progressRouter.get(
  '/progress',
  asyncHandler(async (req, res) => {
    const rows = await prisma.userProgress.findMany({
      where: { userId: req.user!.id },
      include: { lesson: { include: { topic: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({
      data: rows.map((row) => ({
        status: row.status,
        bestScore: row.bestScore,
        attemptsCount: row.attemptsCount,
        updatedAt: row.updatedAt.toISOString(),
        lesson: { id: row.lesson.id, title: row.lesson.title, level: row.lesson.level },
        topic: { slug: row.lesson.topic.slug, name: row.lesson.topic.name, subject: row.lesson.topic.subject },
      })),
    });
  }),
);

progressRouter.get(
  '/bookmarks',
  asyncHandler(async (req, res) => {
    const rows = await prisma.bookmark.findMany({
      where: { userId: req.user!.id },
      include: { question: { include: questionInclude } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: rows.map((row) => ({ id: row.id, createdAt: row.createdAt.toISOString(), question: toQuestionView(row.question) })) });
  }),
);

progressRouter.post(
  '/bookmarks/:questionId',
  asyncHandler(async (req, res) => {
    const question = await prisma.question.findUnique({ where: { id: req.params.questionId } });
    if (!question || question.reviewStatus !== 'APPROVED') throw notFound('Question not found.');
    const bookmark = await prisma.bookmark.upsert({
      where: { userId_questionId: { userId: req.user!.id, questionId: question.id } },
      create: { userId: req.user!.id, questionId: question.id },
      update: {},
    });
    res.status(201).json({ data: { id: bookmark.id } });
  }),
);

progressRouter.delete(
  '/bookmarks/:questionId',
  asyncHandler(async (req, res) => {
    await prisma.bookmark.deleteMany({ where: { userId: req.user!.id, questionId: req.params.questionId } });
    res.json({ data: { ok: true } });
  }),
);

progressRouter.post(
  '/questions/:questionId/flags',
  asyncHandler(async (req, res) => {
    const input = parseBody(z.object({ note: z.string().trim().min(10).max(500) }), req);
    const question = await prisma.question.findUnique({ where: { id: req.params.questionId } });
    if (!question || question.reviewStatus === 'RETIRED') throw notFound('Question not found.');
    const open = await prisma.questionFlag.findFirst({
      where: { userId: req.user!.id, questionId: question.id, status: 'OPEN' },
    });
    if (open) throw badRequest('FLAG_ALREADY_OPEN', 'You already have an open report for this question.');
    const flag = await prisma.questionFlag.create({
      data: { userId: req.user!.id, questionId: question.id, note: input.note },
    });
    res.status(201).json({ data: { id: flag.id, status: flag.status } });
  }),
);

