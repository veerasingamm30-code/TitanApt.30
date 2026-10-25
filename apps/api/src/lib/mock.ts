import { Difficulty, Subject } from '@prisma/client';
import { z } from 'zod';

export const mockMarkingSchema = z.object({
  correct: z.coerce.number().min(0.25).max(10),
  incorrect: z.coerce.number().max(0).min(-5),
  unanswered: z.coerce.number().max(0).min(-5).default(0),
});

export const mockSectionSchema = z.object({
  name: z.string().trim().min(1).max(60),
  subject: z.nativeEnum(Subject),
  count: z.coerce.number().int().min(1).max(100),
  difficulty: z.nativeEnum(Difficulty).optional(),
});

export type MockMarking = z.infer<typeof mockMarkingSchema>;
export type MockSection = z.infer<typeof mockSectionSchema>;

export function parseMarking(value: unknown): MockMarking {
  return mockMarkingSchema.parse(value);
}

export function parseSections(value: unknown): MockSection[] {
  return z.array(mockSectionSchema).min(1).max(8).parse(value);
}
