import { createHash } from 'node:crypto';

export type ParsedOption = { label: string; text: string };

export type ParsedQuestion = {
  number: number;
  page: number;
  topicTitle: string;
  stem: string;
  options: ParsedOption[];
  correctLabel: string;
  sourceCheck: string | null;
  explanation: string;
  reasoning: string | null;
  steps: string[];
  shortcuts: string | null;
  warnings: string[];
};

const QUESTION_HEADER = /^Q(\d+)\.\s+(.+?)\s*\|\s*Answer:\s*\(([A-H])\)\s*(.*)$/gm;

function normalizeInline(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractSections(block: string): Record<string, string> {
  const headers = [...block.matchAll(/^([A-H])\.\s+[^\n]*$/gm)];
  const sections: Record<string, string> = {};
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    const next = headers[index + 1];
    const start = (header.index ?? 0) + header[0].length;
    const end = next?.index ?? block.length;
    const content = block.slice(start, end).trim();
    if (content) sections[header[1]] = content;
  }
  return sections;
}

function parseOptions(region: string): ParsedOption[] {
  const options: ParsedOption[] = [];
  let current: { label: string; parts: string[] } | null = null;

  for (const line of region.split('\n')) {
    const match = line.match(/^\s*\(([A-H])\)\s*(.*)$/);
    if (match) {
      if (current) options.push({ label: current.label, text: normalizeInline(current.parts.join(' ')) });
      current = { label: match[1], parts: [match[2]] };
    } else if (current && line.trim() && !line.includes('Source check:')) {
      current.parts.push(line.trim());
    }
  }
  if (current) options.push({ label: current.label, text: normalizeInline(current.parts.join(' ')) });

  return options.filter((option) => option.text.length > 0);
}

export function questionFingerprint(stem: string, options: ParsedOption[]): string {
  const normalized = [
    normalizeInline(stem).toLowerCase(),
    ...options.map((option) => `${option.label.toUpperCase()}:${normalizeInline(option.text).toLowerCase()}`),
  ].join('|');
  return createHash('sha256').update(normalized).digest('hex');
}

export function parseQuestionBlocks(
  text: string,
  pageByQuestion: ReadonlyMap<number, number> = new Map(),
): ParsedQuestion[] {
  const headers = [...text.matchAll(QUESTION_HEADER)];
  const questions: ParsedQuestion[] = [];

  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    const next = headers[index + 1];
    const start = header.index ?? 0;
    const end = next?.index ?? text.length;
    const block = text.slice(start, end);
    const headerEnd = start + header[0].length;
    const body = text.slice(headerEnd, end);

    const firstOption = body.search(/^\s*\([A-H]\)\s+/m);
    if (firstOption === -1) continue;

    const stem = normalizeInline(body.slice(0, firstOption));
    if (!stem) continue;

    const sourceCheckMatch = body.match(/^Source check:\s*(.*)$/m);
    const firstSection = body.search(/^[A-H]\.\s+[^\n]+$/m);
    const optionEnd = sourceCheckMatch?.index ?? (firstSection > -1 ? firstSection : body.length);
    const options = parseOptions(body.slice(firstOption, optionEnd));
    const sections = extractSections(body);
    const number = Number(header[1]);
    const correctLabel = header[3];
    const warnings: string[] = [];

    if (!options.some((option) => option.label === correctLabel)) {
      warnings.push('The stated answer label is not present among the parsed options.');
    }
    if (options.length < 2) warnings.push('Fewer than two options were parsed.');
    if (!sections.E && !sections.H) warnings.push('No explanation section was parsed.');

    const explanation = [sections.E, sections.F, sections.H]
      .filter(Boolean)
      .join('\n\n')
      .trim();
    const steps = (sections.D ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    questions.push({
      number,
      page: pageByQuestion.get(number) ?? 0,
      topicTitle: normalizeInline(header[2]),
      stem,
      options,
      correctLabel,
      sourceCheck: sourceCheckMatch ? normalizeInline(sourceCheckMatch[1]) || null : null,
      explanation: explanation || 'Imported source did not include a usable explanation; reviewer input is required.',
      reasoning: sections.A ? normalizeInline(sections.A) : null,
      steps: steps.length > 0 ? steps : sections.D ? [normalizeInline(sections.D)] : [],
      shortcuts: [sections.G, sections.H].filter(Boolean).map(normalizeInline).join('\n\n') || null,
      warnings,
    });
  }

  return questions;
}
