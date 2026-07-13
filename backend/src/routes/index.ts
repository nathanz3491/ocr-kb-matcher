import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import uploadRoutes from './upload';
import testRoutes from './test';
import chatRoutes from './chat';
import jobsRoutes from './jobs';
import localGraphRoutes from './localGraph';
import userProgressRoutes from './userProgress';
import graphRoutes from './graph';
import certificatesRoutes from './certificates';
import knowledgeGraphRoutes from './knowledgeGraph';
import quizRoutes from './quiz';
import exportRoutes from './export';
import studyRoutes from './study';
import flashcardsRoutes from './flashcards';
import searchRoutes from './search';
import analyticsRoutes from './analytics';
import reviewsRoutes from './reviews';
import wrongQuestionReviewRouter from './wrongQuestionReview';
import subjectsRoutes from './subjects';
import recommendationsRoutes from './recommendations';
import knowledgeTreeRoutes from './knowledgeTree';
import kbRoutes from './kb';
import graphEditorRouter from './graphEditor';
import studyPlannerRouter from './studyPlanner';
import authRoutes from './auth';
import adminRoutes from './admin';
import userSettingsRoutes from './userSettings';
import parentMonitorRoutes from './parentMonitor';
import accountRoutes from './account';
import packsRoutes from './packs';
import subscriptionRoutes from './subscriptions';
import webhookRoutes from './webhooks';

const router = Router();

// Mount upload routes
router.use('/api/upload', uploadRoutes);

// Mount test routes (development only)
router.use('/api/test', testRoutes);

router.use('/api/chat', chatRoutes);
router.use('/api/jobs', jobsRoutes);
router.use('/api/local-graph', localGraphRoutes);
router.use('/api/user-progress', userProgressRoutes);
router.use('/api/graph', graphRoutes);
router.use('/api/certificates', certificatesRoutes);
router.use('/api/knowledge-graph', knowledgeGraphRoutes);
router.use('/api/quiz', quizRoutes);
router.use('/api/export', exportRoutes);
router.use('/api/study', studyRoutes);
router.use('/api/flashcards', flashcardsRoutes);
router.use('/api/search', searchRoutes);
router.use('/api/analytics', analyticsRoutes);
router.use('/api/reviews', reviewsRoutes);
router.use('/api/wrong-questions', wrongQuestionReviewRouter);
router.use('/api/subjects', subjectsRoutes);
router.use('/api/recommendations', recommendationsRoutes);
router.use('/api/knowledge-tree', knowledgeTreeRoutes);
router.use('/api/kb', kbRoutes);
router.use('/api/graph-editor', graphEditorRouter);
router.use('/api/study-plan', studyPlannerRouter);
router.use('/api/auth', authRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/user', userSettingsRoutes);
router.use('/api/parent-monitor', parentMonitorRoutes);
router.use('/api/account', accountRoutes);
router.use('/api/packs', packsRoutes);
router.use('/api/subscriptions', subscriptionRoutes);
router.use('/api/webhooks', webhookRoutes);

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ocr-kb-matcher-backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  })
);

/**
 * @route   GET /
 * @desc    API root - returns API info
 * @access  Public
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      name: 'OCR KB Matcher API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'API for OCR-based knowledge base matching',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        upload: '/api/upload',
        chat: '/api/chat',
        jobs: '/api/jobs',
        flashcards: '/api/flashcards',
        quiz: '/api/quiz',
        reviews: '/api/reviews',
        wrongQuestions: '/api/wrong-questions',
        analytics: '/api/analytics',
        study: '/api/study',
        knowledgeGraph: '/api/knowledge-graph',
        knowledgeTree: '/api/knowledge-tree',
        graph: '/api/graph',
        localGraph: '/api/local-graph',
        userProgress: '/api/user-progress',
        certificates: '/api/certificates',
        search: '/api/search',
        export: '/api/export',
        subjects: '/api/subjects',
        recommendations: '/api/recommendations',
        kb: '/api/kb',
        graphEditor: '/api/graph-editor',
        studyPlan: '/api/study-plan',
        account: '/api/account',
        subscriptions: '/api/subscriptions',
        webhooks: '/api/webhooks',
        test: process.env.NODE_ENV === 'production' ? undefined : '/api/test',
      },
    });
  })
);

/**
 * @route   GET /test-error
 * @desc    Test error handling (development only)
 * @access  Public
 */
router.get(
  '/test-error',
  asyncHandler(async (_req: Request, _res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Test endpoint not available in production', 404);
    }
    throw new AppError('This is a test error', 500);
  })
);

/**
 * @route   GET /test-async-error
 * @desc    Test async error handling (development only)
 * @access  Public
 */
router.get(
  '/test-async-error',
  asyncHandler(async (_req: Request, _res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Test endpoint not available in production', 404);
    }
    // Simulate async operation that fails
    await new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Async operation failed')), 10);
    });
  })
);

export default router;
