import { execSync } from 'child_process';
import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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
/**
 * Dependencies injected into extractArrivalAnimation so the orchestrator can
 * be unit-tested without spawning real GDAL processes. Production wires
 * these to execSync, mkdtempSync, fs.readFileSync + JSON.parse, rm -rf, and
 * gdalsrsinfo.
 */
export interface AnimationExtractorDeps {
  /** Runs a shell command synchronously; throws on non-zero exit. */
  exec: (command: string) => void;
  /** Creates a unique temp directory with the given prefix; returns path. */
  mkdtemp: (prefix: string) => string;
  /** Reads a JSON file from disk and parses it. */
  readJSON: (path: string) => unknown;
  /** Recursively removes a directory (best-effort cleanup). */
  rmrf: (path: string) => void;
  /** Returns the spatial reference WKT for a raster. */
  getSrsWkt: (rasterPath: string) => string;
  /**
   * Returns the minimum arrival value in the raster's band 1 (decimal Julian
   * day). This is the actual ignition time — FireSTARR writes arrival values
   * from the moment cells first catch fire, which may be earlier than the
   * user-configured timeRange.start in output-config.json.
   */
  getRasterMinValue: (rasterPath: string) => number;
}

export interface ExtractArrivalAnimationParams {
  arrivalPath: string;
  simStart: Date;
  durationHours: number;
  capFrames?: number;
}

/**
 * Orchestrates the GDAL pipeline that turns a FireSTARR arrival-time raster
 * into a FeatureCollection of per-hour perimeter polygons (refs #236):
 *
 *   arrival.tif --(gdal_calc)--> classified.tif
 *                              --(gdal_polygonize)--> frames.gpkg
 *                              --(ogr2ogr)--> frames.geojson (WGS84)
 *
 * Each classified pixel's value is the 1-based frame index (the hour in which
 * the pixel ignited). gdal_polygonize emits one feature per contiguous
 * same-value region, which toAnimationFeatureCollection then tags with
 * offsetHours + isoTime. All temp files land in a single directory that is
 * removed in the `finally` block, even on failure.
 */
export async function extractArrivalAnimation(
  params: ExtractArrivalAnimationParams,
  deps: AnimationExtractorDeps,
): Promise<AnimationFeatureCollection> {
  const capFrames = params.capFrames ?? DEFAULT_FRAME_CAP;
  const tmpDir = deps.mkdtemp('nomad-anim-');
  try {
    const classifiedPath = `${tmpDir}/classified.tif`;
    const vectorPath = `${tmpDir}/frames.gpkg`;
    const geojsonPath = `${tmpDir}/frames.geojson`;

    // Anchor the reclassify to the raster's actual ignition time — the min
    // arrival value — not to params.simStart. FireSTARR's arrival grid begins
    // when cells first catch fire, which can be hours earlier than the
    // user-configured timeRange.start. Using the config value caused the
    // first animation frames to land several km from ignition (refs #236).
    const rasterMin = deps.getRasterMinValue(params.arrivalPath);
    // Shift the anchor down by one hour so the earliest cell (A = rasterMin)
    // cleanly falls into frame 1 instead of getting ceil(0) = 0 and dropping.
    const simStartJulian = rasterMin - 1 / 24;
    const expression = buildReclassifyExpression(simStartJulian, capFrames);

    deps.exec(
      `gdal_calc.py -A "${params.arrivalPath}" --outfile="${classifiedPath}" ` +
        `--calc="${expression}" --type=Int32 --NoDataValue=0 --quiet`,
    );

    deps.exec(
      `gdal_polygonize.py "${classifiedPath}" -f GPKG "${vectorPath}" frames DN`,
    );

    const srsWkt = deps.getSrsWkt(params.arrivalPath);
    deps.exec(
      `ogr2ogr -f GeoJSON "${geojsonPath}" "${vectorPath}" ` +
        `-s_srs "${srsWkt}" -t_srs EPSG:4326`,
    );

    const raw = deps.readJSON(geojsonPath) as RawPolygonizedFeatureCollection;
    // isoTime labels also anchor to the raster's ignition time, using the
    // year from params.simStart to situate the decimal Julian day in calendar
    // time.
    const anchor = julianToDate(simStartJulian, params.simStart.getUTCFullYear());
    return toAnimationFeatureCollection(raw, anchor);
  } finally {
    deps.rmrf(tmpDir);
  }
}

/**
 * Default dependencies backed by the real filesystem and GDAL CLI tools.
 * Used by the HTTP route; unit tests substitute mocks.
 */
export function defaultAnimationExtractorDeps(): AnimationExtractorDeps {
  return {
    exec: (command) => {
      execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    },
    mkdtemp: (prefix) => mkdtempSync(join(tmpdir(), prefix)),
    readJSON: (path) => JSON.parse(readFileSync(path, 'utf-8')),
    rmrf: (path) => {
      try {
        execSync(`rm -rf "${path}"`, { stdio: 'pipe' });
      } catch {
        /* best-effort cleanup */
      }
    },
    getSrsWkt: (rasterPath) =>
      execSync(`gdalsrsinfo -o wkt "${rasterPath}"`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
        .toString()
        .split(/\r?\n/)[0]
        .trim(),
    getRasterMinValue: (rasterPath) => {
      const out = execSync(`gdalinfo -stats "${rasterPath}"`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).toString();
      const match = out.match(/STATISTICS_MINIMUM=([-\d.eE+]+)/);
      if (!match) {
        throw new Error(`Could not parse STATISTICS_MINIMUM from gdalinfo output for ${rasterPath}`);
      }
      const value = parseFloat(match[1]);
      if (!Number.isFinite(value)) {
        throw new Error(`gdalinfo returned a non-finite minimum for ${rasterPath}: ${match[1]}`);
      }
      return value;
    },
  };
}

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

/**
 * Returns the day-of-year (Jan 1 = 1.0) for the given Date, including
 * fractional hours. This matches the convention FireSTARR uses in the
 * arrival-time raster (e.g., `170.464` = day 170 at ~11am UTC).
 */
export function julianDayFromDate(date: Date): number {
  const year = date.getUTCFullYear();
  const yearStartMs = Date.UTC(year, 0, 1, 0, 0, 0, 0);
  return 1 + (date.getTime() - yearStartMs) / 86_400_000;
}

/**
 * Inverse of julianDayFromDate — converts a decimal day-of-year (1.0 = Jan 1
 * 00:00) in the given calendar year back into a UTC Date.
 */
export function julianToDate(julianDay: number, year: number): Date {
  const yearStartMs = Date.UTC(year, 0, 1, 0, 0, 0, 0);
  return new Date(yearStartMs + (julianDay - 1) * 86_400_000);
}

/**
 * Builds the gdal_calc expression that reclassifies an arrival-time raster
 * (band A, decimal Julian days) into a per-pixel frame index (1..capFrames)
 * used by the animation. Cells that never burned (A=0), burned before the
 * sim start, or burned past the cap emit 0 so gdal_polygonize can drop them.
 */
export function buildReclassifyExpression(
  simStartJulian: number,
  capFrames: number,
): string {
  return (
    `((A>0)*(ceil((A-${simStartJulian})*24)>=1)` +
    `*(ceil((A-${simStartJulian})*24)<=${capFrames})` +
    `*ceil((A-${simStartJulian})*24)).astype(int)`
  );
}

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
