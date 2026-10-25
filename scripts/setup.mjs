import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { startEmbeddedDatabase } from './embedded-db.mjs';

const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);

if (!fs.existsSync(path.join(root, '.env'))) {
  console.error('[setup] No .env found. Copy .env.example to .env and fill in your own values first.');
  process.exit(1);
}

function run(command, args) {
  console.log(`\n[setup] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`[setup] command failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

const db = await startEmbeddedDatabase();
try {
  run('npx', ['prisma', 'generate']);
  run('npx', ['prisma', 'migrate', 'deploy']);
  run('npx', ['tsx', 'prisma/seed.ts']);
  console.log('\n[setup] complete. Start the app with: npm run dev');
} finally {
  await db.stop();
}
