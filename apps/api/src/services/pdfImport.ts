import { createHash } from 'node:crypto';
import { readFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { prisma } from '../prisma.js';
import { parseQuestionBlocks, questionFingerprint } from './pdfQuestionParser.js';

export type ImportOptions = {
  chapter?: number | string;
  limit?: number;
  sourcePath?: string;
  createdById?: string;
};

export type ImportResult = {
  jobId: string;
  chapter: number;
  chapterTitle: string;
  topicSlug: string;
  processedPages: number;
  candidateCount: number;
  importedCount: number;
  skippedCount: number;
  warnings: string[];
};

type ChapterRange = {
  number: number;
  title: string;
  startPage: number;
  endPage: number;
};

const DEFAULT_SOURCE = 'Aptitude&Mock.pdf/TitanApt_10000.pdf';
const MAX_LIMIT = 400;

function standardFontPath(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    return `${path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts')}${path.sep}`;
  } catch {
    return undefined;
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function projectRoot(): Promise<string> {
  let directory = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    if (await exists(path.join(directory, 'prisma', 'schema.prisma'))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return process.cwd();
}

async function resolveSourcePath(customPath?: string): Promise<{ absolute: string; root: string }> {
  const root = await projectRoot();
  const candidates = customPath
    ? [path.resolve(process.cwd(), customPath), path.resolve(root, customPath)]
    : [path.join(root, DEFAULT_SOURCE), path.resolve(process.cwd(), DEFAULT_SOURCE)];
  for (const candidate of candidates) {
    if (await exists(candidate)) return { absolute: candidate, root };
  }
  throw new Error(`Source PDF not found. Tried: ${candidates.join(', ')}`);
}

function flattenOutline(items: unknown[]): Array<{ title: string; dest: unknown }> {
  const output: Array<{ title: string; dest: unknown }> = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as { title?: unknown; dest?: unknown; items?: unknown };
    if (typeof item.title === 'string') output.push({ title: item.title, dest: item.dest });
    if (Array.isArray(item.items)) output.push(...flattenOutline(item.items));
  }
  return output;
}

async function resolveChapters(document: PDFDocumentProxy): Promise<ChapterRange[]> {
  const outline = await document.getOutline();
  if (!outline) return [];
  const starts: Array<{ number: number; title: string; startPage: number }> = [];

  for (const item of flattenOutline(outline)) {
    const match = item.title.match(/^(\d+)\.\s+(.+?)\s+\(Q\d+-Q?\d+\)/);
    if (!match) continue;
    let destination = item.dest;
    if (typeof destination === 'string') destination = await document.getDestination(destination);
    if (!Array.isArray(destination) || !destination[0]) continue;
    const ref = destination[0];
    if (typeof ref !== 'object' || !('num' in ref)) continue;
    const pageIndex = await document.getPageIndex(ref as { num: number; gen: number });
    starts.push({
      number: Number(match[1]),
      title: match[2],
      startPage: pageIndex,
    });
  }

  starts.sort((a, b) => a.startPage - b.startPage);
  return starts.map((entry, index) => ({
    ...entry,
    endPage: index + 1 < starts.length ? starts[index + 1].startPage - 1 : document.numPages - 1,
  }));
}

function selectChapter(chapters: ChapterRange[], requested: number | string): ChapterRange {
  if (chapters.length === 0) {
    if (String(requested) !== '1') {
      throw new Error('This PDF has no outline; only chapter 1 can be selected.');
    }
    return { number: 1, title: 'Number System', startPage: 0, endPage: -1 };
  }
  if (typeof requested === 'number' || /^\d+$/.test(requested)) {
    const number = Number(requested);
    const match = chapters.find((chapter) => chapter.number === number);
    if (!match) throw new Error(`Chapter ${number} was not found in the PDF outline.`);
    return match;
  }
  const search = String(requested).toLowerCase();
  const match = chapters.find((chapter) => chapter.title.toLowerCase().includes(search));
  if (!match) throw new Error(`No chapter title matched "${requested}".`);
  return match;
}

async function pageText(document: PDFDocumentProxy, pageIndex: number): Promise<string> {
  const page = await document.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  let text = '';
  for (const item of content.items) {
    if (!('str' in item)) continue;
    text += item.str;
    text += item.hasEOL ? '\n' : ' ';
  }
  return text;
}

async function sourceRecord(filePath: string, root: string, checksum: string, pageCount: number) {
  const filename = path.basename(filePath);
  const existing = await prisma.importSource.findFirst({ where: { filename } });
  if (existing) return existing;
  return prisma.importSource.create({
    data: {
      filename,
      relativePath: path.relative(root, filePath).replaceAll('\\', '/'),
      checksum,
      pageCount,
      extractionStatus: 'TEXT_LAYER',
      licensingNote:
        'Provided local source material. Imported candidates require human review and are never automatically approved.',
      importStatus: 'registered',
    },
  });
}

export async function runBoundedPdfImport(options: ImportOptions = {}): Promise<ImportResult> {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 50), 1), MAX_LIMIT);
  const { absolute: sourcePath, root } = await resolveSourcePath(options.sourcePath);
  const data = new Uint8Array(await readFile(sourcePath));
  const checksum = createHash('sha256').update(data).digest('hex').toUpperCase();
  const document = await getDocument({
    data,
    isEvalSupported: false,
    useWorkerFetch: false,
    standardFontDataUrl: standardFontPath(),
  }).promise;

  try {
    const chapters = await resolveChapters(document);
    const chapter = selectChapter(chapters, options.chapter ?? 1);
    const endPage = chapter.endPage < chapter.startPage ? document.numPages - 1 : chapter.endPage;
    const topic = await prisma.topic.findFirst({ where: { order: chapter.number } });
    if (!topic) throw new Error(`No topic is mapped to chapter ${chapter.number}.`);
    const source = await sourceRecord(sourcePath, root, checksum, document.numPages);
    const job = await prisma.importJob.create({
      data: {
        sourceId: source.id,
        status: 'RUNNING',
        warnings: [],
        createdById: options.createdById,
      },
    });

    try {
      const pageByQuestion = new Map<number, number>();
      let combined = '';
      let processedPages = 0;

      for (let pageIndex = chapter.startPage; pageIndex <= endPage; pageIndex += 1) {
        const text = await pageText(document, pageIndex);
        combined += `\n${text}\n`;
        processedPages += 1;
        await prisma.rawPage.upsert({
          where: { sourceId_pageNumber: { sourceId: source.id, pageNumber: pageIndex + 1 } },
          create: { sourceId: source.id, pageNumber: pageIndex + 1, rawText: text },
          update: { rawText: text },
        });
        for (const match of text.matchAll(/^Q(\d+)\./gm)) {
          pageByQuestion.set(Number(match[1]), pageIndex + 1);
        }
        const headers = (combined.match(/^Q\d+\./gm) ?? []).length;
        if (headers > limit) break;
      }

      const parsed = parseQuestionBlocks(combined, pageByQuestion).slice(0, limit);
      const existing = await prisma.question.findMany({
        select: { id: true, sourceKey: true, fingerprint: true },
      });
      const bySourceKey = new Map(existing.map((question) => [question.sourceKey, question.id]));
      const byFingerprint = new Map(existing.map((question) => [question.fingerprint, question.id]));
      let importedCount = 0;
      let skippedCount = 0;
      const warnings: string[] = [];

      for (const question of parsed) {
        const sourceKey = `TA10K-${String(chapter.number).padStart(2, '0')}-Q${question.number}`;
        const fingerprint = questionFingerprint(question.stem, question.options);
        const duplicateSource = bySourceKey.get(sourceKey);
        const duplicateFingerprint = byFingerprint.get(fingerprint);
        const candidateWarnings = [...question.warnings];

        if (duplicateSource) {
          skippedCount += 1;
          await prisma.candidateQuestion.create({
            data: {
              jobId: job.id,
              sourceId: source.id,
              sourcePage: question.page,
              sourceKey,
              stem: question.stem,
              options: question.options,
              correctLabel: question.correctLabel,
              explanation: question.explanation,
              status: 'duplicate',
              warnings: [...candidateWarnings, 'Source key already exists; no question was created.'],
              fingerprint,
              questionId: duplicateSource,
            },
          });
          continue;
        }

        if (duplicateFingerprint) {
          skippedCount += 1;
          await prisma.candidateQuestion.create({
            data: {
              jobId: job.id,
              sourceId: source.id,
              sourcePage: question.page,
              sourceKey,
              stem: question.stem,
              options: question.options,
              correctLabel: question.correctLabel,
              explanation: question.explanation,
              status: 'possible_duplicate',
              warnings: [...candidateWarnings, 'A question with the same fingerprint already exists.'],
              fingerprint,
              questionId: duplicateFingerprint,
            },
          });
          continue;
        }

        const canCreate =
          question.options.length >= 2 &&
          question.options.some((option) => option.label === question.correctLabel);
        if (!canCreate) {
          skippedCount += 1;
          await prisma.candidateQuestion.create({
            data: {
              jobId: job.id,
              sourceId: source.id,
              sourcePage: question.page,
              sourceKey,
              stem: question.stem,
              options: question.options,
              correctLabel: question.correctLabel,
              explanation: question.explanation,
              status: 'needs_review',
              warnings: candidateWarnings,
              fingerprint,
            },
          });
          continue;
        }

        const created = await prisma.question.create({
          data: {
            topicId: topic.id,
            stem: question.stem,
            statement: null,
            explanation: question.explanation,
            reasoning: question.reasoning,
            steps: question.steps,
            shortcuts: question.shortcuts,
            difficulty: 'MEDIUM',
            difficultyBasis: 'Assigned at import time; difficulty has not been independently calibrated.',
            reviewStatus: 'PENDING',
            fingerprint,
            sourceDocument: path.basename(sourcePath),
            sourcePage: question.page,
            sourceKey,
            sourceCheck: question.sourceCheck,
            options: { create: question.options },
          },
          include: { options: true },
        });
        const correct = created.options.find((option) => option.label === question.correctLabel);
        if (correct) {
          await prisma.question.update({
            where: { id: created.id },
            data: { correctOptionId: correct.id },
          });
        }
        bySourceKey.set(sourceKey, created.id);
        byFingerprint.set(fingerprint, created.id);
        importedCount += 1;
        await prisma.candidateQuestion.create({
          data: {
            jobId: job.id,
            sourceId: source.id,
            sourcePage: question.page,
            sourceKey,
            stem: question.stem,
            options: question.options,
            correctLabel: question.correctLabel,
            explanation: question.explanation,
            status: 'imported_pending',
            warnings: candidateWarnings,
            fingerprint,
            questionId: created.id,
          },
        });
      }

      if (parsed.length === 0) warnings.push('No complete question blocks were found on the selected pages.');
      if (skippedCount > 0) warnings.push(`${skippedCount} question(s) were skipped as duplicates or invalid.`);

      await prisma.$transaction([
        prisma.importJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            finishedAt: new Date(),
            processedPages,
            candidateCount: parsed.length,
            approvedCount: 0,
            skippedCount,
            warnings: {
              chapter: chapter.number,
              chapterTitle: chapter.title,
              importedCount,
              skippedCount,
              messages: warnings,
              note: 'Imported questions are PENDING and require human review before use.',
            },
          },
        }),
        prisma.importSource.update({
          where: { id: source.id },
          data: { lastImportedAt: new Date(), importStatus: 'bounded_import_available' },
        }),
      ]);

      return {
        jobId: job.id,
        chapter: chapter.number,
        chapterTitle: chapter.title,
        topicSlug: topic.slug,
        processedPages,
        candidateCount: parsed.length,
        importedCount,
        skippedCount,
        warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown import failure';
      await prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          warnings: { message },
        },
      });
      throw error;
    }
  } finally {
    await document.destroy();
  }
}
