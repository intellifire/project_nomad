/**
 * Tests for the importStatus in-progress classifier (refs #239).
 *
 * ModelList displays importStatus messages for model import, config fetch,
 * and re-run flows. The in-progress ones end with "..." and should render a
 * spinner alongside the text; completion and failure messages should not.
 */

import { describe, it, expect } from 'vitest';
import { isProgressStatus } from '../importStatus.js';

describe('isProgressStatus', () => {
  it('returns true for an in-progress message ending with ellipsis', () => {
    expect(isProgressStatus('Importing...')).toBe(true);
    expect(isProgressStatus('Fetching config for "Fire 42"...')).toBe(true);
    expect(isProgressStatus('Starting model run...')).toBe(true);
  });

  it('returns false for completion and failure messages', () => {
    expect(isProgressStatus('Imported "Fire 42" — 5 files, 2 results')).toBe(false);
    expect(isProgressStatus('Import failed: Something broke')).toBe(false);
    expect(isProgressStatus('No config available — model cannot be re-run')).toBe(false);
  });

  it('returns false for empty/nullish values', () => {
    expect(isProgressStatus(null)).toBe(false);
    expect(isProgressStatus(undefined)).toBe(false);
    expect(isProgressStatus('')).toBe(false);
  });
});
