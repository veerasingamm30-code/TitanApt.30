import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:titanapt_local@localhost:55432/titanapt_test?schema=public';
process.env.COOKIE_SECURE = 'false';
