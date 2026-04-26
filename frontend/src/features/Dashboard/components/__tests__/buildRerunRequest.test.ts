/**
 * Re-run request builder — pure logic
 *
 * The Dashboard re-run handler builds a /models/run body from the stored
 * config. This unit covers the exact shape, including timezone forwarding
 * (regression: re-run was 400'ing on the new fail-fast `Timezone required`
 * validation because the handler dropped the field).
 */

import { describe, it, expect } from 'vitest';
import { buildRerunRequest } from '../rerunRequest.js';

const fullConfig = {
  ignition: { type: 'point', coordinates: [-115.7, 60.82] },
  timeRange: { start: '2023-06-19T19:00:00Z', end: '2023-06-22T19:00:00Z' },
  weather: { source: 'firestarr_csv' },
  timezone: 'America/Edmonton',
  scenarios: 1,
  modelMode: 'deterministic' as const,
  engineType: 'firestarr' as const,
};

const model = { id: 'm1', name: 'Hay River', engine: 'firestarr', outputMode: 'deterministic' as const };

describe('buildRerunRequest', () => {
  it('forwards timezone from config into runBody', () => {
    const result = buildRerunRequest(model, fullConfig);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.timezone).toBe('America/Edmonton');
  });

  it('strips trailing " (imported)" suffix and adds " (re-run)" to the name', () => {
    const result = buildRerunRequest({ ...model, name: 'Hay River (imported)' }, fullConfig);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.name).toBe('Hay River (re-run)');
  });

  it('returns reason="incomplete" when ignition is missing', () => {
    const result = buildRerunRequest(model, { ...fullConfig, ignition: undefined });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('incomplete');
  });

  it('returns reason="missing-timezone" when timezone is absent (older export)', () => {
    const result = buildRerunRequest(model, { ...fullConfig, timezone: undefined });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('missing-timezone');
  });

  it('returns reason="missing-timezone" when timezone is empty string', () => {
    const result = buildRerunRequest(model, { ...fullConfig, timezone: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('missing-timezone');
  });

  it('falls back to model.engine when config.engineType is absent', () => {
    const result = buildRerunRequest(model, { ...fullConfig, engineType: undefined });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.engineType).toBe('firestarr');
  });
});
