import { createApp, getPort } from './app';
import { getQueueProcessor } from './services/queueProcessor';
import { getKnowledgeGraphStorage } from './services/knowledgeGraphStorage';

/**
 * Main entry point for the OCR KB Matcher backend
 */
function main(): void {
  const app = createApp();
  const PORT = getPort();

  const server = app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);

    // Initialize knowledge graph storage
    console.log('🔄 Initializing knowledge graph storage...');
    try {
      const storage = getKnowledgeGraphStorage();
      await storage.initialize();
      console.log('✅ Knowledge graph storage initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize knowledge graph storage:', error);
    }

    // Start queue processor
    const queueProcessor = getQueueProcessor();

    // Check for stale jobs (in case server crashed while processing)
    const staleCount = await queueProcessor.checkStaleJobs();
    if (staleCount > 0) {
      console.log(`🔄 Reset ${staleCount} stale jobs from previous session`);
    }

    // Start polling for new jobs (default 5 second interval)
    const pollingInterval = parseInt(process.env.QUEUE_POLL_INTERVAL_MS || '', 10) || undefined;
    queueProcessor.startPolling(pollingInterval);

    // Log processor events
    queueProcessor.on('job:started', (job) => {
      console.log(`▶️ Job started: ${job.id} (${job.fileName})`);
    });

    queueProcessor.on('job:completed', (job) => {
      console.log(`✅ Job completed: ${job.id} (${job.fileName})`);
    });

    queueProcessor.on('job:failed', (job, error) => {
      console.log(`❌ Job failed: ${job.id} - ${error.message}`);
    });

    queueProcessor.on('job:timeout', (job) => {
      console.log(`⏱️ Job timeout: ${job.id} (${job.fileName})`);
    });
  });

  // Graceful shutdown
  const gracefulShutdown = (signal: string): void => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    // Stop queue processor
    const queueProcessor = getQueueProcessor();
    queueProcessor.stopPolling();
    console.log('⏹️ Queue processor stopped');

    server.close(() => {
      console.log('Server closed. Process terminated.');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (err: Error) => {
    console.error('Uncaught Exception:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
  });
}

main();
