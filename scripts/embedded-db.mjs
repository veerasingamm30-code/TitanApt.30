import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import pg from 'pg';

const root = path.resolve(import.meta.dirname, '..');
const dataDir = path.join(root, '.pgdata');
const logDir = path.join(root, '.pglogs');

export const DEFAULT_PORT = Number(process.env.EMBEDDED_PG_PORT ?? 55432);
export const DEFAULT_USER = 'postgres';
export const DEFAULT_PASSWORD = process.env.EMBEDDED_PG_PASSWORD ?? 'titanapt_local';

export function canConnect(port = DEFAULT_PORT) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const done = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(900);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDatabase(name, port, user, password) {
  const client = new pg.Client({ host: '127.0.0.1', port, user, password, database: 'postgres' });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE ${client.escapeIdentifier(name)}`);
      console.log(`[database] created ${name}`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Starts a real PostgreSQL server using bundled binaries when no server is
 * already listening on the configured local port. Returns a stop function.
 */
export async function startEmbeddedDatabase({ quiet = false } = {}) {
  const port = DEFAULT_PORT;
  if (await canConnect(port)) {
    if (!quiet) console.log(`[database] using PostgreSQL already running on localhost:${port}`);
    return {
      started: false,
      port,
      stop: async () => {},
    };
  }

  await fs.mkdir(logDir, { recursive: true });
  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: DEFAULT_USER,
    password: DEFAULT_PASSWORD,
    persistent: true,
    onLog: async (message) => {
      if (process.env.PG_VERBOSE === '1') process.stdout.write(message);
      await fs.appendFile(path.join(logDir, 'postgres.log'), message);
    },
    onError: (error) => console.error('[database] error:', error?.message ?? error),
  });

  if (!(await fileExists(path.join(dataDir, 'PG_VERSION')))) {
    if (!quiet) console.log('[database] initialising local PostgreSQL cluster...');
    await server.initialise();
  }
  await server.start();
  await ensureDatabase('titanapt_dev', port, DEFAULT_USER, DEFAULT_PASSWORD);
  await ensureDatabase('titanapt_test', port, DEFAULT_USER, DEFAULT_PASSWORD);
  if (!quiet) console.log(`[database] PostgreSQL ready on localhost:${port}`);

  return {
    started: true,
    port,
    stop: async () => {
      await server.stop();
      if (!quiet) console.log('[database] PostgreSQL stopped');
    },
  };
}
