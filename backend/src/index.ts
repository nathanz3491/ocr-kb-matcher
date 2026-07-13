import * as Sentry from '@sentry/node';
import { createApp, getPort } from './app';
import { getQueueProcessor } from './services/queueProcessor';
import { getKnowledgeGraphStorage } from './services/knowledgeGraphStorage';
import { logger } from './lib/logger';

function main(): void {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    });
    logger.info('Sentry initialized');
  }

  const app = createApp();
  const PORT = getPort();

  const server = app.listen(PORT, async () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started');

    logger.info('Initializing knowledge graph storage');
    try {
      const storage = getKnowledgeGraphStorage();
      await storage.initialize();
      logger.info('Knowledge graph storage initialized');
    } catch (error) {
      logger.warn({ err: error }, 'Failed to initialize knowledge graph storage');
    }

    const queueProcessor = getQueueProcessor();

    const staleCount = await queueProcessor.checkStaleJobs();
    if (staleCount > 0) {
      logger.info({ staleCount }, 'Reset stale jobs from previous session');
    }

    const pollingInterval = parseInt(process.env.QUEUE_POLL_INTERVAL_MS || '', 10) || undefined;
    queueProcessor.startPolling(pollingInterval);

    queueProcessor.on('job:started', (job) => {
      logger.info({ jobId: job.id, fileName: job.fileName }, 'Job started');
    });

    queueProcessor.on('job:completed', (job) => {
      logger.info({ jobId: job.id, fileName: job.fileName }, 'Job completed');
    });

    queueProcessor.on('job:failed', (job, error) => {
      logger.error({ jobId: job.id, err: error }, 'Job failed');
    });

    queueProcessor.on('job:timeout', (job) => {
      logger.warn({ jobId: job.id, fileName: job.fileName }, 'Job timeout');
    });
  });

  const gracefulShutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutting down gracefully');

    const queueProcessor = getQueueProcessor();
    queueProcessor.stopPolling();
    logger.info('Queue processor stopped');

    server.close(() => {
      logger.info('Server closed, process terminated');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err: Error) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ reason }, 'Unhandled rejection');
    process.exit(1);
  });
}

main();
