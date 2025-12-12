/**
 * Simple Auth Middleware
 *
 * Extracts username from X-Nomad-User header when VITE_SIMPLE_AUTH=true.
 * This is a demo/SAN-mode authentication mechanism - not for production ACN deployments.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: string;
    }
  }
}

/**
 * Middleware that extracts user from X-Nomad-User header when simple auth is enabled.
 * When VITE_SIMPLE_AUTH is not 'true', passes through without modification.
 */
export function simpleAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (process.env.VITE_SIMPLE_AUTH === 'true') {
    const userHeader = req.headers['x-nomad-user'];
    if (typeof userHeader === 'string' && userHeader.trim().length > 0) {
      req.user = userHeader.trim();
    }
  }
  next();
}
