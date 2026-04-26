/**
 * Pure builder for the /models/run request body used by the Dashboard re-run
 * action. Extracted from ModelList.handleRerun so the wiring (and the timezone
 * fail-fast) is testable in isolation.
 */

export interface RerunModel {
  id: string;
  name: string;
  engine?: string;
  outputMode?: 'probabilistic' | 'deterministic' | string | null;
}

export interface RerunConfig {
  engineType?: string;
  ignition?: unknown;
  timeRange?: unknown;
  weather?: unknown;
  scenarios?: number;
  modelMode?: 'probabilistic' | 'deterministic';
  timezone?: string;
}

export type RerunResult =
  | { ok: true; body: RerunRequestBody }
  | { ok: false; reason: 'incomplete' | 'missing-timezone' };

export interface RerunRequestBody {
  name: string;
  engineType: string;
  ignition: unknown;
  timeRange: unknown;
  weather: unknown;
  scenarios?: number;
  modelMode: 'probabilistic' | 'deterministic';
  timezone: string;
}

export function buildRerunRequest(model: RerunModel, config: RerunConfig): RerunResult {
  if (!config.ignition || !config.timeRange || !config.weather) {
    return { ok: false, reason: 'incomplete' };
  }
  if (typeof config.timezone !== 'string' || config.timezone.length === 0) {
    return { ok: false, reason: 'missing-timezone' };
  }

  return {
    ok: true,
    body: {
      name: `${model.name.replace(/ \(imported\)$/, '')} (re-run)`,
      engineType: config.engineType || model.engine || 'firestarr',
      ignition: config.ignition,
      timeRange: config.timeRange,
      weather: config.weather,
      scenarios: config.scenarios,
      modelMode: config.modelMode
        || (model.outputMode === 'deterministic' ? 'deterministic' : 'probabilistic'),
      timezone: config.timezone,
    },
  };
}
