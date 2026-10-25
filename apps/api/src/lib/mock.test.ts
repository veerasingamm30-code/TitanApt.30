import { describe, expect, it } from 'vitest';
import { parseMarking, parseSections } from './mock.js';

describe('mock configuration parsing', () => {
  it('parses a marking scheme and defaults unanswered to zero', () => {
    expect(parseMarking({ correct: 1, incorrect: -0.25 })).toEqual({
      correct: 1,
      incorrect: -0.25,
      unanswered: 0,
    });
  });

  it('rejects incorrect positive marking', () => {
    expect(() => parseMarking({ correct: 1, incorrect: 0.5 })).toThrow();
    expect(() => parseMarking({ correct: 0, incorrect: -0.25 })).toThrow();
  });

  it('parses sections with optional difficulty', () => {
    expect(
      parseSections([
        { name: 'Quantitative', subject: 'QUANTITATIVE', count: 20 },
        { name: 'Hard logical', subject: 'LOGICAL', count: 8, difficulty: 'HARD' },
      ]),
    ).toEqual([
      { name: 'Quantitative', subject: 'QUANTITATIVE', count: 20 },
      { name: 'Hard logical', subject: 'LOGICAL', count: 8, difficulty: 'HARD' },
    ]);
  });

  it('rejects empty or oversized section lists', () => {
    expect(() => parseSections([])).toThrow();
    expect(() =>
      parseSections(
        Array.from({ length: 9 }, (_, index) => ({
          name: `Section ${index}`,
          subject: 'QUANTITATIVE',
          count: 1,
        })),
      ),
    ).toThrow();
  });
});
