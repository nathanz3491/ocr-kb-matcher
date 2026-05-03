import morgan from 'morgan';
import { Request, Response } from 'express';

/**
 * Custom morgan token for request ID (useful for tracing)
 */
morgan.token('requestId', (req: Request) => {
  return (req.headers['x-request-id'] as string) || '-';
});

/**
 * Custom morgan token for user agent short version
 */
morgan.token('shortUserAgent', (req: Request) => {
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.includes('Postman')) return 'Postman';
  if (userAgent.includes('curl')) return 'curl';
  if (userAgent.includes('Mozilla')) return 'Browser';
  return 'Unknown';
});

/**
 * Custom format string for logging
 * Output: [timestamp] METHOD /url STATUS - responseTime ms - UserAgent
 */
const customFormat = ':date[iso] :method :url :status :res[content-length] - :response-time ms - :shortUserAgent';

/**
 * Morgan logging middleware configuration
 * 
 * In development: detailed colored output
 * In production: concise output
 */
export const loggerMiddleware = morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : customFormat,
  {
    // Skip logging health check endpoints to reduce noise
    skip: (req: Request) => {
      return req.url === '/health' || req.url === '/health/';
    },
  }
);

/**
 * Stream interface for morgan to write logs
 * Can be extended to write to files or external services
 */
export const logStream = {
  write: (message: string): void => {
    console.log(message.trim());
  },
};

/**
 * Development logger with colors
 */
export const devLogger = morgan('dev', {
  skip: (req: Request) => {
    return req.url === '/health' || req.url === '/health/';
  },
});

export default loggerMiddleware;
