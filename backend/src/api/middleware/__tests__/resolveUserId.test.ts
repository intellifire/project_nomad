/**
 * resolveUserId Tests
 *
 * Verifies that user identity is correctly resolved from either
 * SAN (req.user) or ACN (req.acn.user.id) auth context.
 */

import { describe, it, expect } from 'vitest';
import { Request } from 'express';
import { resolveUserId } from '../resolveUserId.js';

function mockRequest(overrides: Partial<Request> = {}): Request {
  return overrides as Request;
}

describe('resolveUserId', () => {
  it('returns composite "name (id)" when ACN context has name', () => {
    const req = mockRequest({
      acn: {
        agency: { id: 'gnwt', keyPrefix: 'abc' },
        user: { id: 'acn-user-123', name: 'Franco', role: 'admin' },
      },
    });
    expect(resolveUserId(req)).toBe('Franco (acn-user-123)');
  });

  it('returns bare id when ACN context has no name', () => {
    const req = mockRequest({
      acn: {
        agency: { id: 'gnwt', keyPrefix: 'abc' },
        user: { id: 'acn-user-123', name: '', role: 'admin' },
      },
    });
    expect(resolveUserId(req)).toBe('acn-user-123');
  });

  it('returns req.user when SAN auth is present', () => {
    const req = mockRequest({ user: 'san-user-456' });
    expect(resolveUserId(req)).toBe('san-user-456');
  });

  it('prefers ACN over SAN when both are present', () => {
    const req = mockRequest({
      user: 'san-user',
      acn: {
        agency: { id: 'gnwt', keyPrefix: 'abc' },
        user: { id: 'acn-user', name: 'Franco', role: 'admin' },
      },
    });
    expect(resolveUserId(req)).toBe('Franco (acn-user)');
  });

  it('returns undefined when neither auth context is present', () => {
    const req = mockRequest({});
    expect(resolveUserId(req)).toBeUndefined();
  });
});
