/**
 * Resolve User Identity
 *
 * Returns the current user ID regardless of deployment mode.
 * ACN mode: reads from req.acn.user.id
 * SAN mode: reads from req.user
 */

import { Request } from 'express';

/**
 * Resolve the authenticated user ID from the request.
 * ACN context takes precedence over SAN simple auth.
 * ACN mode returns composite "name (uuid)" for readable display + traceability.
 */
export function resolveUserId(req: Request): string | undefined {
  if (req.acn) {
    const { id, name } = req.acn.user;
    return name ? `${name} (${id})` : id;
  }
  return req.user;
}
