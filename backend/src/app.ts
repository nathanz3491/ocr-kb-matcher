import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { optionalAuth } from './middleware/auth';
import { generalLimiter } from './middleware/rateLimit';
import { auditMiddleware } from './middleware/auditLog';
import { pinoHttpMiddleware, logger } from './lib/logger';
import routes from './routes';

// Load environment variables
dotenv.config();

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // Disable X-Powered-By header to avoid framework fingerprinting
  app.disable('x-powered-by');

  // Trust proxy when behind Cloudflare or similar reverse proxy
  if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  // Security headers — must come before CORS and routes
  app.use(helmet());

  // CORS configuration — exact origin match (NOT startsWith)
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, origin?: string | boolean) => void) {
      // Allow requests with no origin (mobile apps, curl, etc.) or from allowed origins
      if (!origin || allowedOrigins.includes(origin) || /\.trycloudflare\.com$/.test(origin)) {
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

  // Apply CORS middleware
  app.use(cors(corsOptions));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Structured request-ID logging (pino-http) — attaches req.id and req.log
  app.use(pinoHttpMiddleware);

  // Request logging middleware (morgan — HTTP access log)
  app.use(loggerMiddleware);

  // Global rate limiter — 300 req/min per IP, skips /health
  app.use(generalLimiter);

  // Attach userId from JWT if token is present (optional — allows guest access)
  app.use(optionalAuth);

  // Audit logging — security-relevant events (401, 403, mutations)
  app.use(auditMiddleware);

  // Mount routes
  app.use('/', routes);

  // 404 handler - must be after all routes
  app.use(notFoundHandler);

  // Global error handler - must be last
  app.use(errorHandler);

  return app;
}

/**
 * Get port from environment variable or use default
 */
export function getPort(): number {
  const port = process.env.PORT;
  if (port) {
    const parsedPort = parseInt(port, 10);
    if (isNaN(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
      logger.warn({ port }, 'Invalid PORT value, using default 3001');
      return 3001;
    }
    return parsedPort;
  }
  return 3001;
}

export default createApp;
