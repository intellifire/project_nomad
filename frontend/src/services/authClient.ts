/**
 * Better Auth Client
 *
 * Client-side auth instance for OAuth social login.
 * Only used when VITE_AUTH_MODE=oauth.
 */

import { createAuthClient } from 'better-auth/react';

const baseURL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

export const authClient = createAuthClient({
  baseURL,
});
