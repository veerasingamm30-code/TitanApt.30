import { describe, expect, it } from 'vitest';
import { formatClock, formatDate, formatDateTime, formatPercent, initials } from './format.js';

describe('format helpers', () => {
  it('formats nullable percentages', () => {
    expect(formatPercent(75)).toBe('75%');
    expect(formatPercent(66.7)).toBe('66.7%');
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
  });

  it('formats exam clocks without going negative', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(-10)).toBe('00:00');
    expect(formatClock(3599)).toBe('59:59');
  });

  it('formats dates for the Indian locale', () => {
    expect(formatDate('2026-10-25T12:00:00.000Z')).toBe('25 Oct 2026');
    expect(formatDateTime('2026-10-25T12:00:00.000Z')).toContain('25 Oct');
  });

  it('builds initials without inventing logo artwork', () => {
    expect(initials('Tata Consultancy Services')).toBe('TC');
    expect(initials('Infosys')).toBe('I');
    expect(initials('  accenture   india ')).toBe('AI');
  });
});
