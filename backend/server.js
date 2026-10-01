import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './database/prisma.js';
import { startDeadlineScheduler, stopDeadlineScheduler } from './services/scheduler.service.js';

const PORT = Number(process.env.PORT) || 12001;

async function bootstrap() {
  await connectDatabase();
  console.info('[db] connected to MongoDB via Prisma');

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.info(`[server] PMS backend listening on http://localhost:${PORT}`);
    console.info(`[server] health check: http://localhost:${PORT}/api/health`);
  });

  startDeadlineScheduler();

  const shutdown = async (signal) => {
    console.info(`\n[server] received ${signal}, shutting down...`);
    stopDeadlineScheduler();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
