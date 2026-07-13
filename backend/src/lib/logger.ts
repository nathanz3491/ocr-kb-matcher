/**
 * Structured JSON logger — pino
 *
 * pino is the fastest Node logger (5-10× faster than winston).
 * This module exports a singleton logger instance.
 *
 * Dev  (NODE_ENV != 'production') → pretty-printed via pino-pretty
 * Prod (NODE_ENV == 'production') → raw JSON lines to stdout
 *
 * Also exports pinoHttp — a drop-in middleware that:
 *   1. Sets req.id from X-Request-Id header (or generates one)
 *   2. Attaches a child logger to req.log
 *   3. Logs request/response at completion
 */

import pino from 'pino';
import { pinoHttp } from 'pino-http';

const isDev = process.env.NODE_ENV !== 'production';

/** The singleton application logger. */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
  base: {
    service: 'ocr-kb-matcher-backend',
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || 'unknown',
  },
});

/**
 * pino-http middleware for Express.
 *
 * Provides:
 *   - req.id   → unique request ID (from X-Request-Id header or auto-generated)
 *   - req.log   → child logger with req_id field pre-populated
 *   - Auto-logs each request/response (method, url, statusCode, responseTime)
 *
 * Usage in app.ts:  app.use(pinoHttpMiddleware);
 */
export const pinoHttpMiddleware = pinoHttp({
  logger,
  // Quiet logging for health checks to avoid noise
  autoLogging: {
    ignore: (req) => (req.url ?? '').startsWith('/health'),
  },
  // Forward request ID from client, or let pino generate one
  genReqId: (req) => (req.headers['x-request-id'] as string) || '',
});
