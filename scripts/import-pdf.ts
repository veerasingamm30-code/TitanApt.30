import 'dotenv/config';
import { prisma } from '../apps/api/src/prisma.js';
import { runBoundedPdfImport } from '../apps/api/src/services/pdfImport.js';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const chapter = option('chapter') ?? '1';
  const limit = Number(option('limit') ?? '20');
  const sourcePath = option('source');

  console.log(`[import] Starting bounded import: chapter=${chapter}, limit=${limit}`);
  const result = await runBoundedPdfImport({
    chapter: /^\d+$/.test(chapter) ? Number(chapter) : chapter,
    limit,
    sourcePath,
  });

  console.log(`[import] Job ${result.jobId} completed.`);
  console.log(
    `[import] ${result.chapterTitle}: pages=${result.processedPages}, candidates=${result.candidateCount}, imported PENDING=${result.importedCount}, skipped=${result.skippedCount}`,
  );
  if (result.warnings.length > 0) {
    for (const warning of result.warnings) console.log(`[import] warning: ${warning}`);
  }
  console.log('[import] Imported questions are PENDING and require review in the admin desk.');
}

main()
  .catch((error) => {
    console.error('[import] failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
