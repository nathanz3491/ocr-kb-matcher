import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { optionalAuth } from './middleware/auth';
import routes from './routes';
import kbRoutes from './routes/kb';
import uploadRoutes from './routes/upload';
import graphRoutes from './routes/graph';
import jobRoutes from './routes/jobs';
import localGraphRoutes from './routes/localGraph';
import knowledgeTreeRoutes from './routes/knowledgeTree';
import userProgressRoutes from './routes/userProgress';
import analyticsRoutes from './routes/analytics';
import recommendationsRoutes from './routes/recommendations';
import exportRoutes from './routes/export';
import subjectsRoutes from './routes/subjects';
import reviewsRoutes from './routes/reviews';
import quizRoutes from './routes/quiz';
import knowledgeGraphRoutes from './routes/knowledgeGraph';
import searchRoutes from './routes/search';
import flashcardRoutes from './routes/flashcards';
import studyRoutes from './routes/study';
import studyPlannerRoutes from './routes/studyPlanner';
import chatRoutes from './routes/chat';
import certificateRoutes from './routes/certificates';
import authRoutes from './routes/auth';
import userSettingsRoutes from './routes/userSettings';
import parentMonitorRoutes from './routes/parentMonitor';

dotenv.config({ override: true });

export function createApp(): Application {
  const app = express();

  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, origin?: string | boolean) => void) {
      if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed)) || /\.trycloudflare\.com$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-upload-multiple', 'Accept', 'Cache-Control', 'Pragma'],
    credentials: true,
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(loggerMiddleware);
  app.use(optionalAuth);

  app.use('/', routes);
  app.use('/api/kb', kbRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/graph', graphRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/local-graph', localGraphRoutes);
  app.use('/api/knowledge-tree', knowledgeTreeRoutes);
  app.use('/api/user-progress', userProgressRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/recommendations', recommendationsRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/subjects', subjectsRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/quiz', quizRoutes);
  app.use('/api/knowledge-graph', knowledgeGraphRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/flashcards', flashcardRoutes);
  app.use('/api/study', studyRoutes);
  app.use('/api/study-plan', studyPlannerRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/certificates', certificateRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userSettingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export function getPort(): number {
  const port = process.env.PORT;
  if (port) {
    const parsedPort = parseInt(port, 10);
    if (isNaN(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
      console.warn(`Invalid PORT value: ${port}, using default 3001`);
      return 3001;
    }
    return parsedPort;
  }
  return 3001;
}

export default createApp;
