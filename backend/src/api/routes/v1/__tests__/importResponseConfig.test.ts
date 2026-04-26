/**
 * Import response config cherry-pick — defense-in-depth test.
 *
 * Re-run reads /models/:id/config (which sources from model.json) so this
 * cherry-pick isn't on the critical path. But any UI consuming the import
 * response config directly would inherit whichever fields we forward here.
 * Keeping `timezone` in the list so future consumers don't repeat the
 * regression that broke the Dashboard re-run handler.
 */

import { describe, it, expect } from 'vitest';
import { pickImportResponseConfig } from '../importResponseConfig.js';

describe('pickImportResponseConfig', () => {
  it('forwards timezone alongside other re-runnable fields', () => {
    const result = pickImportResponseConfig({
      ignition: { type: 'point', coordinates: [-115.7, 60.82] },
      timeRange: { start: '2023-06-19T19:00:00Z', end: '2023-06-22T19:00:00Z' },
      weather: { source: 'firestarr_csv' },
      timezone: 'America/Edmonton',
      scenarios: 1,
      modelMode: 'deterministic',
      // unrelated noise that shouldn't be forwarded
      internalState: 'should-not-leak',
    });

    expect(result.timezone).toBe('America/Edmonton');
    expect(result.modelMode).toBe('deterministic');
    expect((result as Record<string, unknown>).internalState).toBeUndefined();
  });

  it('returns timezone undefined when source config lacks it (older models)', () => {
    const result = pickImportResponseConfig({
      ignition: { type: 'point', coordinates: [0, 0] },
      timeRange: { start: 'a', end: 'b' },
      weather: { source: 'firestarr_csv' },
    });
    expect(result.timezone).toBeUndefined();
  });
});
