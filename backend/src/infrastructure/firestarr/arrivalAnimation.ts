/**
 * Arrival-perimeter animation helpers (refs #236).
 *
 * Builds the list of hourly frames the animation will render. One frame per
 * simulation hour starting at offset 1 (offset 0 is pre-ignition and has no
 * perimeter). Capped at 168 frames (7 days) so long sims stay bounded.
 */

export interface AnimationFrame {
  /** Hours elapsed from simulation start. */
  offsetHours: number;
  /** Wall-clock time of this frame in ISO 8601 (UTC). */
  isoTime: string;
}

export interface AnimationFeatureProperties {
  offsetHours: number;
  isoTime: string;
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: unknown;
}

export interface RawPolygonizedFeature {
  type: 'Feature';
  properties: { DN: number };
  geometry: GeoJSONGeometry;
}

export interface RawPolygonizedFeatureCollection {
  type: 'FeatureCollection';
  features: RawPolygonizedFeature[];
}

export interface AnimationFeature {
  type: 'Feature';
  properties: AnimationFeatureProperties;
  geometry: GeoJSONGeometry;
}

export interface AnimationFeatureCollection {
  type: 'FeatureCollection';
  features: AnimationFeature[];
}

/**
 * Transforms the raw GeoJSON produced by `gdal_polygonize` on the reclassified
 * arrival raster into the animation response shape consumed by the frontend.
 *
 *  - Drops DN=0 features (unburned cells emit a background polygon we don't
 *    want in the animation).
 *  - Renames the DN property to `offsetHours` and adds a wall-clock `isoTime`
 *    derived from the sim start so the slider can label frames without
 *    recomputing time on the client.
 *  - Preserves geometry verbatim; simplification/reprojection happens upstream
 *    in the GDAL pipeline.
 */
export function toAnimationFeatureCollection(
  raw: RawPolygonizedFeatureCollection,
  simStart: Date,
): AnimationFeatureCollection {
  const startMs = simStart.getTime();
  const features: AnimationFeature[] = [];
  for (const feature of raw.features) {
    const dn = feature.properties?.DN;
    if (typeof dn !== 'number' || dn === 0) continue;
    features.push({
      type: 'Feature',
      properties: {
        offsetHours: dn,
        isoTime: new Date(startMs + dn * 3_600_000).toISOString(),
      },
      geometry: feature.geometry,
    });
  }
  return { type: 'FeatureCollection', features };
}

export const DEFAULT_FRAME_CAP = 168;

export interface SimTimeRange {
  simStart: Date;
  durationHours: number;
}

/**
 * Extracts the simulation start and duration (in hours) from a parsed model
 * config. Accepts the `{ timeRange: { start, end } }` shape used by both
 * `output-config.json` and `model.json` on disk. Throws on missing or
 * unparseable fields so callers never silently fall back to 0-hour runs.
 */
export function extractSimTimeRange(config: unknown): SimTimeRange {
  const timeRange = (config as { timeRange?: { start?: string; end?: string } } | undefined)
    ?.timeRange;
  if (!timeRange || typeof timeRange.start !== 'string' || typeof timeRange.end !== 'string') {
    throw new Error('Config is missing timeRange.start or timeRange.end');
  }
  const simStart = new Date(timeRange.start);
  const end = new Date(timeRange.end);
  if (Number.isNaN(simStart.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Invalid timeRange dates: start=${timeRange.start} end=${timeRange.end}`);
  }
  const durationHours = (end.getTime() - simStart.getTime()) / 3_600_000;
  return { simStart, durationHours };
}

export function computeAnimationFrames(
  simStart: Date,
  durationHours: number,
  capHours: number = DEFAULT_FRAME_CAP,
): AnimationFrame[] {
  const count = Math.max(0, Math.min(Math.floor(durationHours), capHours));
  const startMs = simStart.getTime();
  const frames: AnimationFrame[] = [];
  for (let offset = 1; offset <= count; offset++) {
    frames.push({
      offsetHours: offset,
      isoTime: new Date(startMs + offset * 3_600_000).toISOString(),
    });
  }
  return frames;
}
