/**
 * Pure cherry-pick used by POST /api/v1/import to build the response `config`
 * field. Kept tiny and exported so re-runnable fields stay in one place —
 * adding a new field here flows to any consumer that reads the import
 * response directly.
 */

export interface ImportResponseConfig {
  ignition?: unknown;
  timeRange?: unknown;
  weather?: unknown;
  scenarios?: number;
  modelMode?: 'probabilistic' | 'deterministic';
  timezone?: string;
}

export function pickImportResponseConfig(
  source: Record<string, unknown>,
): ImportResponseConfig {
  return {
    ignition: source.ignition,
    timeRange: source.timeRange,
    weather: source.weather,
    scenarios: source.scenarios as number | undefined,
    modelMode: source.modelMode as 'probabilistic' | 'deterministic' | undefined,
    timezone: source.timezone as string | undefined,
  };
}
