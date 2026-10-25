import { spawn } from 'node:child_process';
import path from 'node:path';
import { startEmbeddedDatabase } from './embedded-db.mjs';

const root = path.resolve(import.meta.dirname, '..');
const command = process.argv.slice(2);
if (command.length === 0) {
  console.error('Usage: node scripts/with-db.mjs <command> [args...]');
  process.exit(1);
}

const db = await startEmbeddedDatabase();

let child;
let stopping = false;

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  if (child && !child.killed) {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
  await db.stop().catch((error) => console.error('[database] stop failed:', error));
  process.exit(code);
}

process.on('SIGINT', () => void shutdown(130));
process.on('SIGTERM', () => void shutdown(143));

child = spawn(command[0], command.slice(1), {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) void shutdown(1);
  else void shutdown(code ?? 0);
});
child.on('error', (error) => {
  console.error('[run] failed to start command:', error.message);
  void shutdown(1);
});
