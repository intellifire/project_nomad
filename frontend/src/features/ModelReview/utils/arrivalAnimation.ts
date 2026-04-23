/**
 * Frontend helpers for the arrival-perimeter animation (refs #236).
 *
 * The backend returns a FeatureCollection where each feature represents
 * cells that newly ignited in a specific hour (property `offsetHours`).
 * The MapLibre layer does the heavy per-frame filtering via a filter
 * expression on `offsetHours`; these helpers only feed the slider and
 * the legend.
 */

export interface ArrivalPerimeterProperties {
  offsetHours: number;
  isoTime: string;
}

export interface ArrivalPerimeterFeature {
  type: 'Feature';
  properties: ArrivalPerimeterProperties;
  geometry: { type: string; coordinates: unknown };
}

export interface ArrivalPerimeterFeatureCollection {
  type: 'FeatureCollection';
  features: ArrivalPerimeterFeature[];
}

export interface AnimationBounds {
  minOffset: number;
  maxOffset: number;
}

export function computeAnimationBounds(
  fc: ArrivalPerimeterFeatureCollection,
): AnimationBounds | null {
  if (fc.features.length === 0) return null;
  let minOffset = Infinity;
  let maxOffset = -Infinity;
  for (const feature of fc.features) {
    const h = feature.properties.offsetHours;
    if (h < minOffset) minOffset = h;
    if (h > maxOffset) maxOffset = h;
  }
  return { minOffset, maxOffset };
}

/**
 * Returns the wall-clock ISO timestamp of the frame with `offsetHours`
 * equal to `target`, falling back to the nearest frame whose offsetHours
 * is less than or equal to `target` when an exact match is absent (the
 * polygonized arrival grid is sparse — not every hour has cells).
 * Returns null when no frame at or before `target` exists.
 */
export function getFrameIsoTime(
  fc: ArrivalPerimeterFeatureCollection,
  target: number,
): string | null {
  let bestOffset = -Infinity;
  let bestIso: string | null = null;
  for (const feature of fc.features) {
    const h = feature.properties.offsetHours;
    if (h <= target && h > bestOffset) {
      bestOffset = h;
      bestIso = feature.properties.isoTime;
    }
  }
  return bestIso;
}

/**
 * Formats a UTC ISO-8601 timestamp as a human-readable local time string.
 * When `timezone` is provided (e.g. the model's configured
 * `data.temporal.timezone`), the result is rendered in that zone; otherwise
 * the browser's local timezone is used. Zulu/UTC is never surfaced
 * directly — fire analysts work in local time (refs #236).
 */
export function formatLocalTime(isoTime: string, timezone?: string): string {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return isoTime;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
    ...(timezone ? { timeZone: timezone } : {}),
  });
}
