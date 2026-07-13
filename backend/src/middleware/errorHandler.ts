import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Custom error class with status code
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Interface for error response
 */
interface ErrorResponse {
  status: string;
  message: string;
  stack?: string;
  timestamp: string;
}

/**
 * Global error handler middleware
 * Catches all errors and returns JSON response
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Check if it's an AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  }

  const errorResponse: ErrorResponse = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message: message,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  Sentry.captureException(err);
  if (req.user?.userId) {
    Sentry.setUser({ id: req.user.userId });
  }

  // Log error for debugging
  logger.error({ statusCode, err, reqId: (req as any).id }, `Unhandled error: ${message}`);

  res.status(statusCode).json(errorResponse);
};

/**
 * Async handler wrapper to catch errors from async route handlers
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'fail',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
};
