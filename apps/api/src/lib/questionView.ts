import type { Prisma } from '@prisma/client';
import type { QuestionView } from '@titanapt/shared';

type QuestionWithOptions = Prisma.QuestionGetPayload<{
  include: { options: true; topic: true };
}>;

export function toQuestionView(question: QuestionWithOptions): QuestionView {
  return {
    id: question.id,
    stem: question.stem,
    statement: question.statement,
    difficulty: question.difficulty,
    topic: {
      slug: question.topic.slug,
      name: question.topic.name,
      subject: question.topic.subject,
    },
    options: [...question.options]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((option) => ({ id: option.id, label: option.label, text: option.text })),
    sourceDocument: question.sourceDocument,
    sourcePage: question.sourcePage,
  };
}

export const questionInclude = {
  options: true,
  topic: true,
} satisfies Prisma.QuestionInclude;
