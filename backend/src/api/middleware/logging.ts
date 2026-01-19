import { Request, Response, NextFunction, RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../../infrastructure/logging/index.js';

/**
 * Request logging middleware with file persistence.
 *
 * Logs request start and completion with timing.
 * Adds correlation ID to request headers if not present.
 * All logs are persisted to rotating log files.
 */
export const requestLogger: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Ensure correlation ID exists
  if (!req.headers['x-correlation-id']) {
    req.headers['x-correlation-id'] = randomUUID();
  }
  const correlationId = req.headers['x-correlation-id'] as string;

  // Log request start
  logger.apiStart(req.method, req.path, correlationId);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.api(req.method, req.path, res.statusCode, duration, correlationId);
  });

  next();
};
