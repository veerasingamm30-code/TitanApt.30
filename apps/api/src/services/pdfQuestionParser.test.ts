import { describe, expect, it } from 'vitest';
import { parseQuestionBlocks, questionFingerprint } from './pdfQuestionParser.js';

const sample = `TitanApt | 1. Number System | Bigger ELI10 Solutions
Page 2

Q1.  Number System  |  Answer: (B) 1
What is the remainder when 100 is divided by 3?
 (A) 5
(B) 1
(C) 3
(D) 2
Source check: answer matches the uploaded key.
A. What is the question asking?
 Divide 100 into equal groups of 3.
B. What do we know?
 - Dividend = 100.
C. Which idea or formula should we use?
 Division rule.
D. Solve step by step
 1. Divide 100 by 3.
2. Keep the remainder.
E. Why is this answer correct?
 The correct option is B) 1.
F. Why are the other options incorrect?
 Option A is not the remainder.
G. Is there a shortcut or alternative method?
 For divisor 3, add the digits.
H. Remember this
 Remainder is what remains.

Q2.  Number System  |  Answer: (D) 7
What is the remainder when 137 is divided by 10?
 (A) 8
(B) 9
(C) 18
(D) 7
Source check: answer matches the uploaded key.
A. What is the question asking?
 Divide 137 into groups of 10.
B. What do we know?
 - Dividend = 137.
C. Which idea or formula should we use?
 Division rule.
D. Solve step by step
 1. Divide 137 by 10.
2. Keep the remainder.
E. Why is this answer correct?
 The correct option is D) 7.
F. Why are the other options incorrect?
 Option A is incorrect.
G. Is there a shortcut or alternative method?
 Look at the last digit.
H. Remember this
 Remainder is what remains.
`;

describe('PDF question parser', () => {
  it('extracts question, options, answer and explanation sections', () => {
    const pages = new Map([
      [1, 2],
      [2, 3],
    ]);
    const questions = parseQuestionBlocks(sample, pages);
    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({
      number: 1,
      page: 2,
      topicTitle: 'Number System',
      stem: 'What is the remainder when 100 is divided by 3?',
      correctLabel: 'B',
      sourceCheck: 'answer matches the uploaded key.',
    });
    expect(questions[0].options).toEqual([
      { label: 'A', text: '5' },
      { label: 'B', text: '1' },
      { label: 'C', text: '3' },
      { label: 'D', text: '2' },
    ]);
    expect(questions[0].steps).toEqual(['1. Divide 100 by 3.', '2. Keep the remainder.']);
    expect(questions[0].explanation).toContain('The correct option is B) 1.');
    expect(questions[0].shortcuts).toContain('For divisor 3');
    expect(questions[0].warnings).toEqual([]);
  });

  it('keeps incomplete blocks out when no option is present', () => {
    const questions = parseQuestionBlocks('Q9.  Algebra  |  Answer: (A) 1\nIncomplete stem\n');
    expect(questions).toEqual([]);
  });

  it('flags a missing answer label', () => {
    const broken = sample.replace('(B) 1', '(E) 1').split('Q2.')[0];
    const [question] = parseQuestionBlocks(broken);
    expect(question.warnings).toContain(
      'The stated answer label is not present among the parsed options.',
    );
  });

  it('creates stable fingerprints independent of spacing and case', () => {
    const first = questionFingerprint('What is 2 + 2?', [
      { label: 'A', text: '3' },
      { label: 'B', text: '4' },
    ]);
    const second = questionFingerprint(' what is  2 + 2? ', [
      { label: 'a', text: ' 3 ' },
      { label: 'b', text: '4' },
    ]);
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });
});
