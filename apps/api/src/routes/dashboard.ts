import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { accuracy, calculateLongestStreak, calculateStreak, dayKey, shiftDayKey } from '../lib/metrics.js';
import { env } from '../env.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const timezone = req.user!.profile?.timezone ?? 'Asia/Kolkata';
    const now = new Date();

    const [attempts, progress, mockAttempts, mocks, topics, recent, bookmarks] = await Promise.all([
      prisma.questionAttempt.findMany({
        where: { userId },
        select: {
          isCorrect: true,
          answeredAt: true,
          question: { select: { topicId: true, topic: { select: { subject: true, slug: true, name: true } } } },
        },
      }),
      prisma.userProgress.findMany({
        where: { userId },
        select: { status: true, updatedAt: true, lesson: { select: { id: true, topicId: true, topic: { select: { subject: true } } } } },
      }),
      prisma.mockTestAttempt.findMany({
        where: { userId, status: 'SUBMITTED' },
        select: { id: true, submittedAt: true, percentage: true, score: true, maxScore: true, mockTest: { select: { title: true, slug: true } } },
        orderBy: { submittedAt: 'desc' },
        take: 5,
      }),
      prisma.mockTest.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, slug: true, title: true, description: true, durationMinutes: true },
        orderBy: { createdAt: 'asc' },
        take: 3,
      }),
      prisma.topic.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          name: true,
          subject: true,
          order: true,
          lessons: { where: { status: 'APPROVED' }, select: { id: true } },
        },
        orderBy: [{ subject: 'asc' }, { order: 'asc' }],
      }),
      prisma.questionAttempt.findMany({
        where: { userId },
        include: { question: { select: { id: true, topic: { select: { name: true, slug: true } } } } },
        orderBy: { answeredAt: 'desc' },
        take: 5,
      }),
      prisma.bookmark.count({ where: { userId } }),
    ]);

    const completedLessons = progress.filter((p) => p.status === 'COMPLETED');
    const totalCorrect = attempts.filter((a) => a.isCorrect).length;
    const today = dayKey(now, timezone);
    const dailyCompleted = attempts.filter((a) => dayKey(a.answeredAt, timezone) === today).length;
    const dailyGoal = req.user!.profile?.dailyGoal ?? 10;

    const activityDates = [
      ...attempts.map((a) => a.answeredAt),
      ...progress.map((p) => p.updatedAt),
      ...mockAttempts.flatMap((m) => (m.submittedAt ? [m.submittedAt] : [])),
    ];
    const currentStreak = calculateStreak(activityDates, timezone, now);
    const longestStreak = calculateLongestStreak(activityDates, timezone);

    const topicStats = new Map<string, { attempts: number; correct: number }>();
    for (const attempt of attempts) {
      const entry = topicStats.get(attempt.question.topicId) ?? { attempts: 0, correct: 0 };
      entry.attempts += 1;
      if (attempt.isCorrect) entry.correct += 1;
      topicStats.set(attempt.question.topicId, entry);
    }
    const lessonTopicsCompleted = new Set(completedLessons.map((p) => p.lesson.topicId));

    const subjectStats = new Map<string, { attempts: number; correct: number; topics: number; lessons: number; completed: number }>();
    for (const topic of topics) {
      const subject = subjectStats.get(topic.subject) ?? { attempts: 0, correct: 0, topics: 0, lessons: 0, completed: 0 };
      subject.topics += 1;
      subject.lessons += topic.lessons.length;
      const stats = topicStats.get(topic.id);
      if (stats) {
        subject.attempts += stats.attempts;
        subject.correct += stats.correct;
      }
      if (progress.some((p) => p.status === 'COMPLETED' && p.lesson.topicId === topic.id)) subject.completed += 1;
      subjectStats.set(topic.subject, subject);
    }

    const weakAreas = topics
      .map((topic) => {
        const stats = topicStats.get(topic.id) ?? { attempts: 0, correct: 0 };
        return {
          slug: topic.slug,
          name: topic.name,
          subject: topic.subject,
          attempts: stats.attempts,
          accuracy: accuracy(stats.correct, stats.attempts),
        };
      })
      .filter(
        (topic) =>
          topic.attempts >= env.WEAK_AREA_MIN_ATTEMPTS &&
          topic.accuracy !== null &&
          topic.accuracy < env.WEAK_AREA_THRESHOLD,
      )
      .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
      .slice(0, 3);

    const completedLessonIds = new Set(progress.filter((p) => p.status === 'COMPLETED').map((p) => p.lesson.id));
    const allLessons = await prisma.lesson.findMany({
      where: { status: 'APPROVED', topic: { isPublished: true } },
      include: { topic: { select: { slug: true, name: true, subject: true, order: true } } },
      orderBy: [{ topic: { subject: 'asc' } }, { topic: { order: 'asc' } }, { order: 'asc' }],
    });
    const recommendation = allLessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? allLessons[0] ?? null;

    const activity = Array.from({ length: 14 }, (_, index) => {
      const day = shiftDayKey(today, index - 13);
      const count = activityDates.filter((date) => dayKey(date, timezone) === day).length;
      return { date: day, count };
    });
    const weeklySolved = attempts.filter((a) => {
      const key = dayKey(a.answeredAt, timezone);
      return key >= shiftDayKey(today, -6) && key <= today;
    }).length;

    res.json({
      data: {
        user: {
          displayName: req.user!.profile?.displayName ?? 'Learner',
          email: req.user!.emailOriginal,
          timezone,
          dailyGoal,
          targetExam: req.user!.profile?.targetExam ?? null,
        },
        stats: {
          totalAttempts: attempts.length,
          correctAttempts: totalCorrect,
          accuracy: accuracy(totalCorrect, attempts.length),
          lessonsCompleted: completedLessons.length,
          lessonsTotal: allLessons.length,
          topicsCompleted: lessonTopicsCompleted.size,
          topicsTotal: topics.length,
          mockAttempts: mockAttempts.length,
          bookmarks,
          weeklySolved,
        },
        dailyGoal: { date: today, completed: dailyCompleted, goal: dailyGoal },
        streak: { current: currentStreak, longest: longestStreak, rule: 'Consecutive local calendar days with at least one answered question, checkpoint or submitted mock. Today counts; if today is empty, yesterday can continue the streak.' },
        activity,
        subjects: [...subjectStats.entries()].map(([subject, stats]) => ({
          subject,
          topics: stats.topics,
          lessons: stats.lessons,
          completedTopics: stats.completed,
          attempts: stats.attempts,
          accuracy: accuracy(stats.correct, stats.attempts),
        })),
        weakAreas,
        recommendation: recommendation
          ? {
              lessonId: recommendation.id,
              title: recommendation.title,
              level: recommendation.level,
              topic: recommendation.topic,
            }
          : null,
        focusTopics: topics.slice(0, 6).map((topic) => ({
          slug: topic.slug,
          name: topic.name,
          subject: topic.subject,
          attempts: topicStats.get(topic.id)?.attempts ?? 0,
          accuracy: accuracy(topicStats.get(topic.id)?.correct ?? 0, topicStats.get(topic.id)?.attempts ?? 0),
        })),
        recentAttempts: recent.map((attempt) => ({
          questionId: attempt.question.id,
          isCorrect: attempt.isCorrect,
          answeredAt: attempt.answeredAt.toISOString(),
          topic: attempt.question.topic,
        })),
        mockHistory: mockAttempts.map((attempt) => ({
          id: attempt.id,
          title: attempt.mockTest.title,
          slug: attempt.mockTest.slug,
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage: attempt.percentage,
          submittedAt: attempt.submittedAt?.toISOString() ?? null,
        })),
        availableMocks: mocks,
      },
    });
  }),
);

