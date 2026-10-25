import { Router } from 'express';
import { asyncHandler, notFound } from '../lib/errors.js';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { questionInclude, toQuestionView } from '../lib/questionView.js';

export const contentRouter = Router();

contentRouter.use(requireAuth);

contentRouter.get(
  '/topics',
  asyncHandler(async (req, res) => {
    const subject = typeof req.query.subject === 'string' ? req.query.subject : undefined;
    const topics = await prisma.topic.findMany({
      where: {
        isPublished: true,
        ...(subject ? { subject: subject as never } : {}),
      },
      orderBy: [{ subject: 'asc' }, { order: 'asc' }],
      include: {
        questions: {
          where: { reviewStatus: 'APPROVED', correctOptionId: { not: null } },
          select: { id: true },
        },
        lessons: {
          where: { status: 'APPROVED' },
          select: { id: true, title: true, level: true },
        },
      },
    });
    const progress = await prisma.userProgress.findMany({
      where: { userId: req.user!.id, status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
    });
    const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));
    res.json({
      data: topics.map((topic) => ({
        id: topic.id,
        slug: topic.slug,
        name: topic.name,
        subject: topic.subject,
        group: topic.group,
        description: topic.description,
        order: topic.order,
        questionCount: topic.questions.length,
        lessonCount: topic.lessons.length,
        lessons: topic.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          level: lesson.level,
          status: progressByLesson.get(lesson.id)?.status ?? 'NOT_STARTED',
          bestScore: progressByLesson.get(lesson.id)?.bestScore ?? 0,
        })),
      })),
    });
  }),
);

contentRouter.get(
  '/topics/:slug',
  asyncHandler(async (req, res) => {
    const topic = await prisma.topic.findUnique({
      where: { slug: req.params.slug },
      include: {
        questions: {
          where: { reviewStatus: 'APPROVED', correctOptionId: { not: null } },
          select: { id: true },
        },
        lessons: {
          where: { status: 'APPROVED' },
          select: { id: true, title: true, level: true, order: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!topic || !topic.isPublished) throw notFound('That topic is not available.');
    const progress = await prisma.userProgress.findMany({
      where: { userId: req.user!.id, lessonId: { in: topic.lessons.map((l) => l.id) } },
    });
    const map = new Map(progress.map((p) => [p.lessonId, p]));
    res.json({
      data: {
        id: topic.id,
        slug: topic.slug,
        name: topic.name,
        subject: topic.subject,
        group: topic.group,
        description: topic.description,
        sourceNote: topic.sourceNote,
        questionCount: topic.questions.length,
        lessons: topic.lessons.map((lesson) => ({
          ...lesson,
          progress: map.get(lesson.id)
            ? {
                status: map.get(lesson.id)!.status,
                bestScore: map.get(lesson.id)!.bestScore,
                attemptsCount: map.get(lesson.id)!.attemptsCount,
              }
            : null,
        })),
      },
    });
  }),
);

contentRouter.get(
  '/lessons/:id',
  asyncHandler(async (req, res) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: {
        topic: true,
        checkpoints: {
          orderBy: { position: 'asc' },
          include: { question: { include: questionInclude } },
        },
      },
    });
    if (!lesson || lesson.status !== 'APPROVED' || !lesson.topic.isPublished) {
      throw notFound('That lesson is not available.');
    }
    const progress = await prisma.userProgress.findUnique({
      where: { userId_lessonId: { userId: req.user!.id, lessonId: lesson.id } },
    });
    const checkpointQuestions = lesson.checkpoints
      .filter((cp) => cp.question.reviewStatus === 'APPROVED' && cp.question.correctOptionId)
      .map((cp) => toQuestionView(cp.question));

    res.json({
      data: {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        level: lesson.level,
        order: lesson.order,
        objective: lesson.objective,
        explanation: lesson.explanation,
        analogy: lesson.analogy,
        workedExamples: lesson.workedExamples,
        rule: lesson.rule,
        mistakes: lesson.mistakes,
        memoryTip: lesson.memoryTip,
        practice: lesson.practice,
        sourceRef: lesson.sourceRef,
        reviewer: lesson.reviewer,
        topic: {
          id: lesson.topic.id,
          slug: lesson.topic.slug,
          name: lesson.topic.name,
          subject: lesson.topic.subject,
          description: lesson.topic.description,
        },
        checkpointQuestions,
        progress: progress
          ? { status: progress.status, bestScore: progress.bestScore, attemptsCount: progress.attemptsCount }
          : null,
      },
    });
  }),
);

contentRouter.get(
  '/lessons/:id/next',
  asyncHandler(async (req, res) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: { topic: true },
    });
    if (!lesson) throw notFound('Lesson not found.');
    const next = await prisma.lesson.findFirst({
      where: {
        status: 'APPROVED',
        OR: [
          { topic: { order: { gt: lesson.topic.order }, subject: lesson.topic.subject } },
          { topicId: { not: lesson.topicId } },
        ],
      },
      orderBy: [{ topic: { subject: 'asc' } }, { topic: { order: 'asc' } }, { order: 'asc' }],
      include: { topic: true },
    });
    res.json({
      data: next
        ? { id: next.id, title: next.title, topic: { slug: next.topic.slug, name: next.topic.name } }
        : null,
    });
  }),
);
