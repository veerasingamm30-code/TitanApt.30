import dotenv from 'dotenv';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startEmbeddedDatabase } from '../../../../scripts/embedded-db.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
dotenv.config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:titanapt_local@localhost:55432/titanapt_test?schema=public';

function run(command, args) {
  execFileSync(command, args, {
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

export default async function setup() {
  const database = await startEmbeddedDatabase({ quiet: true });
  try {
    run('npx', ['prisma', 'migrate', 'deploy']);
    run('npx', ['tsx', 'prisma/seed.ts']);
  } catch (error) {
    await database.stop().catch(() => {});
    throw error;
  }
  return async () => {
    await database.stop().catch(() => {});
  };
}
