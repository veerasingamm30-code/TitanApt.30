import { describe, expect, it } from 'vitest';
import {
  accuracy,
  calculateLongestStreak,
  calculateStreak,
  dayKey,
  isWeakArea,
  lowerDifficulty,
  percentage,
  roundOne,
  scoreAnswers,
  shiftDayKey,
} from './metrics.js';

describe('metrics', () => {
  it('rounds percentages to one decimal place', () => {
    expect(roundOne(12.349)).toBe(12.3);
    expect(roundOne(12.35)).toBe(12.4);
    expect(accuracy(2, 3)).toBe(66.7);
    expect(accuracy(0, 0)).toBeNull();
    expect(percentage(3, 4)).toBe(75);
    expect(percentage(0, 0)).toBe(0);
  });

  it('scores correct, incorrect and unanswered answers with negative marking', () => {
    const result = scoreAnswers(
      [
        { selectedOptionId: 'a', correctOptionId: 'a' },
        { selectedOptionId: 'b', correctOptionId: 'a' },
        { selectedOptionId: null, correctOptionId: 'a' },
        { selectedOptionId: 'a', correctOptionId: null },
      ],
      { correct: 1, incorrect: -0.25, unanswered: 0 },
    );
    expect(result).toMatchObject({
      correct: 1,
      incorrect: 2,
      unanswered: 1,
      score: 1,
      maxScore: 4,
      percentage: 25,
    });
  });

  it('never returns a negative score', () => {
    const result = scoreAnswers(
      [
        { selectedOptionId: 'b', correctOptionId: 'a' },
        { selectedOptionId: 'b', correctOptionId: 'a' },
      ],
      { correct: 1, incorrect: -2, unanswered: 0 },
    );
    expect(result.score).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('uses local calendar days for activity keys and shifts', () => {
    const instant = new Date('2026-10-24T20:00:00.000Z');
    expect(dayKey(instant, 'Asia/Kolkata')).toBe('2026-10-25');
    expect(shiftDayKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDayKey('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('counts today or yesterday as a current streak', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    const dates = [
      new Date('2026-10-23T12:00:00.000Z'),
      new Date('2026-10-24T12:00:00.000Z'),
      new Date('2026-10-25T08:00:00.000Z'),
    ];
    expect(calculateStreak(dates, 'UTC', now)).toBe(3);
    expect(calculateStreak(dates.slice(0, 2), 'UTC', now)).toBe(2);
    expect(calculateStreak([new Date('2026-10-22T12:00:00.000Z')], 'UTC', now)).toBe(0);
    expect(calculateStreak([], 'UTC', now)).toBe(0);
  });

  it('finds the longest streak across gaps', () => {
    const dates = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-25', '2026-10-26'].map(
      (day) => new Date(`${day}T12:00:00.000Z`),
    );
    expect(calculateLongestStreak(dates, 'UTC')).toBe(3);
  });

  it('classifies weak areas only after the minimum attempt count', () => {
    expect(isWeakArea(10, 59.9, 10, 60)).toBe(true);
    expect(isWeakArea(9, 10, 10, 60)).toBe(false);
    expect(isWeakArea(20, null, 10, 60)).toBe(false);
    expect(isWeakArea(20, 60, 10, 60)).toBe(false);
  });

  it('reduces difficulty when recent questions are mostly easy', () => {
    expect(lowerDifficulty(['EASY', 'EASY', 'MEDIUM'])).toBe('EASY');
    expect(lowerDifficulty(['HARD', 'HARD', 'EASY'])).toBe('MEDIUM');
    expect(lowerDifficulty(['MEDIUM', 'MEDIUM'])).toBe('EASY');
  });
});
