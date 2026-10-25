import { app } from './app.js';
import { env } from './env.js';
import { prisma } from './prisma.js';

const server = app.listen(env.PORT, () => {
  console.log(`TitanApt API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down.`);
  const force = setTimeout(() => {
    console.error('Shutdown timed out.');
    process.exit(1);
  }, 10_000);
  force.unref();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
