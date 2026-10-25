import { z } from 'zod';

export const ROLES = ['LEARNER', 'REVIEWER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const SUBJECTS = [
  'QUANTITATIVE',
  'LOGICAL',
  'VERBAL',
  'DATA_INTERPRETATION',
  'TECHNICAL',
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS: Record<Subject, string> = {
  QUANTITATIVE: 'Quantitative Aptitude',
  LOGICAL: 'Logical Reasoning',
  VERBAL: 'Verbal Ability',
  DATA_INTERPRETATION: 'Data Interpretation',
  TECHNICAL: 'Technical Aptitude',
};

export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const LESSON_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type LessonLevel = (typeof LESSON_LEVELS)[number];

export const REVIEW_STATUSES = [
  'PENDING',
  'NEEDS_FIX',
  'QUARANTINED',
  'APPROVED',
  'REJECTED',
  'RETIRED',
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export const emailSchema = z
  .string()
  .trim()
  .min(3, 'Enter your email address.')
  .max(254, 'Email address is too long.')
  .email('Enter a valid email address.');

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, 'Password is too long.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

export const signupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters.')
    .max(60, 'Display name is too long.'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(PASSWORD_MAX),
});

export const practiceFiltersSchema = z.object({
  subject: z.enum(SUBJECTS).optional(),
  topicSlug: z.string().trim().min(1).max(120).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  companySlug: z.string().trim().min(1).max(120).optional(),
  unattemptedOnly: z.boolean().optional().default(false),
  count: z.coerce.number().int().min(1).max(30).default(10),
});
export type PracticeFilters = z.infer<typeof practiceFiltersSchema>;

export const practiceAnswerSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  optionId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(140),
  durationMs: z.coerce.number().int().min(0).max(3_600_000).optional(),
});

export const checkpointSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        optionId: z.string().min(1),
      }),
    )
    .min(1)
    .max(10),
  idempotencyKey: z.string().min(8).max(140),
});

export const mockAnswerSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1).nullable(),
});

export const bookmarkSchema = z.object({
  questionId: z.string().min(1),
});

export const flagQuestionSchema = z.object({
  questionId: z.string().min(1),
  note: z.string().trim().min(5, 'Add a short note.').max(600),
});

export const historyQuerySchema = z.object({
  filter: z.enum(['all', 'correct', 'incorrect', 'bookmarked']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const adminQuestionQuerySchema = z.object({
  status: z.enum(REVIEW_STATUSES).optional(),
  topicSlug: z.string().trim().max(120).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const questionUpdateSchema = z.object({
  stem: z.string().trim().min(8, 'The stem is too short.').max(2000).optional(),
  explanation: z.string().trim().max(5000).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  topicSlug: z.string().trim().min(1).max(120).optional(),
  correctOptionId: z.string().min(1).optional(),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().trim().min(1).max(500),
      }),
    )
    .min(2)
    .max(6)
    .optional(),
});

export const reviewDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'NEEDS_FIX', 'QUARANTINED', 'RETIRED']),
  reason: z.string().trim().min(3, 'A reason is required.').max(600),
});

export const importSourceSchema = z.object({
  sourceId: z.string().min(1),
  maxQuestions: z.coerce.number().int().min(1).max(200).default(40),
});

export const mockTestCreateSchema = z.object({
  title: z.string().trim().min(4).max(120),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens.'),
  description: z.string().trim().min(10).max(600),
  durationMinutes: z.coerce.number().int().min(5).max(180),
  topicSlugs: z.array(z.string().trim().min(1)).min(1).max(10),
  questionCount: z.coerce.number().int().min(3).max(50),
});

export const roleUpdateSchema = z.object({
  role: z.enum(ROLES),
});

export const checklistToggleSchema = z.object({
  itemKey: z.string().trim().min(2).max(120),
  completed: z.boolean(),
});

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
};

export type ApiSuccess<T> = {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  timezone: string;
  createdAt: string;
};

export type TopicSummary = {
  id: string;
  slug: string;
  name: string;
  subject: Subject;
  group: string;
  description: string;
  order: number;
  questionCount: number;
  lessonCount: number;
};

export type OptionView = { id: string; label: string; text: string };

export type QuestionView = {
  id: string;
  stem: string;
  statement: string | null;
  difficulty: Difficulty;
  topic: { slug: string; name: string; subject: Subject };
  options: OptionView[];
  sourceDocument: string;
  sourcePage: number;
};

export type AnswerResult = {
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
  reasoning: string | null;
  steps: Array<{ step: number; text: string }>;
  shortcuts: string | null;
};

export type CompanySummary = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  overview: string;
  headquarters: string | null;
  website: string | null;
  topicSlugs: string[];
  questionCount: number;
};

export type DashboardMetrics = {
  attempts: number;
  accuracy: number | null;
  lessonsCompleted: number;
  lessonsStarted: number;
  mockAttempts: number;
  mockAverage: number | null;
  bookmarks: number;
  streak: number;
  studyMinutes: number;
  topics: Array<{
    slug: string;
    name: string;
    subject: Subject;
    attempts: number;
    accuracy: number | null;
    needsPractice: boolean;
  }>;
  recentMocks: Array<{
    id: string;
    title: string;
    submittedAt: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
  recommendations: Array<{
    id: string;
    kind: 'RESUME_LESSON' | 'PRACTICE_WEAK' | 'RETRY_MISTAKES' | 'NEXT_LESSON' | 'MIXED_MOCK';
    title: string;
    reason: string;
    href: string;
  }>;
};
