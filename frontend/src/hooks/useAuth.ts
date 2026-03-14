/**
 * useAuth Hook
 *
 * Wraps Better Auth's useSession for Nomad's auth needs.
 * Provides user info, auth state, and sign-out capability.
 */

import { authClient } from '../services/authClient';

export function useAuth() {
  const session = authClient.useSession();

  return {
    user: session.data?.user ?? null,
    isAuthenticated: !!session.data?.user,
    isLoading: session.isPending,
    signOut: () => authClient.signOut(),
  };
}
