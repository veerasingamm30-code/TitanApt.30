import type { Subject } from '@titanapt/shared';

export const subjectLabel: Record<Subject, string> = {
  QUANTITATIVE: 'Quantitative',
  LOGICAL: 'Logical reasoning',
  VERBAL: 'Verbal ability',
  DATA_INTERPRETATION: 'Data interpretation',
  TECHNICAL: 'Technical',
};

export const subjectShort: Record<Subject, string> = {
  QUANTITATIVE: 'QA',
  LOGICAL: 'LR',
  VERBAL: 'VA',
  DATA_INTERPRETATION: 'DI',
  TECHNICAL: 'TA',
};

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1).replace('.0', '')}%`;
}

export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

export function formatDateTime(value: string | Date): string {
  return formatDate(value, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
