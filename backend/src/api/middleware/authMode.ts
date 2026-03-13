/**
 * Auth Mode Resolution
 *
 * Resolves the SAN authentication mode from environment variables.
 * Supports the new NOMAD_AUTH_MODE enum with legacy VITE_SIMPLE_AUTH fallback.
 */

import { logger } from '../../infrastructure/logging/index.js';

export type AuthMode = 'none' | 'simple' | 'oauth';

const VALID_MODES: AuthMode[] = ['none', 'simple', 'oauth'];

/**
 * Resolve the authentication mode for SAN deployments.
 *
 * Priority:
 * 1. NOMAD_AUTH_MODE (new enum: none | simple | oauth)
 * 2. VITE_SIMPLE_AUTH (legacy boolean: true → simple, false/unset → none)
 * 3. Default: 'none'
 */
export function resolveAuthMode(): AuthMode {
  const authMode = process.env.NOMAD_AUTH_MODE;

  if (authMode) {
    const normalized = authMode.trim().toLowerCase();
    if (!VALID_MODES.includes(normalized as AuthMode)) {
      throw new Error(
        `Invalid NOMAD_AUTH_MODE="${authMode}". Must be one of: ${VALID_MODES.join(', ')}`
      );
    }
    return normalized as AuthMode;
  }

  // Legacy fallback
  const legacyAuth = process.env.VITE_SIMPLE_AUTH;
  if (legacyAuth !== undefined) {
    const mode: AuthMode = legacyAuth === 'true' ? 'simple' : 'none';
    logger.warn(
      `VITE_SIMPLE_AUTH is deprecated. Use NOMAD_AUTH_MODE=${mode} instead.`,
      'Auth'
    );
    return mode;
  }

  return 'none';
}
