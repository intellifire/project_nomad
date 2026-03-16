/**
 * Arrival Time Extractor
 *
 * Converts arrival-time rasters from deterministic FireSTARR runs into
 * fire perimeter polygons. For each day's arrival grid, all pixels with
 * value > 0 (fire arrived) are polygonalized into a GeoJSON boundary.
 *
 * Uses GDAL command-line tools (gdal_calc.py, gdal_polygonize.py, ogr2ogr).
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { Result } from '../../application/common/index.js';
import { ValidationError, NotFoundError } from '../../domain/errors/index.js';
import { isGDALAvailable } from './PerimeterGenerator.js';

/**
 * Extracted info from arrival-time raster filename.
 * Pattern: 000_000001_{julianDay}_arrival.tif
 */
interface ArrivalFileInfo {
  scenario: number;
  julianDay: number;
}

/**
 * Result of extracting a deterministic perimeter from an arrival grid.
 */
export interface DeterministicPerimeter {
  /** Julian day of the simulation */
  julianDay: number;
  /** Date string (YYYY-MM-DD) if derivable from Julian day + start date */
  date: string | null;
  /** GeoJSON polygon representing the fire boundary */
  geojson: Feature<Polygon | MultiPolygon>;
}

/**
 * Result of extracting perimeters from all arrival grids.
 */
export interface DeterministicExtractionResult {
  perimeters: DeterministicPerimeter[];
  totalGrids: number;
  successCount: number;
}

/**
 * Parse arrival-time filename.
 * Pattern: 000_{scenario}_{julianDay}_arrival.tif
 */
function parseArrivalFilename(filename: string): ArrivalFileInfo | null {
  const match = filename.match(/^000_(\d+)_(\d+)_arrival\.tif$/);
  if (!match) return null;
  return {
    scenario: parseInt(match[1], 10),
    julianDay: parseInt(match[2], 10),
  };
}

/**
 * Convert Julian day to date string given a start date.
 */
function julianDayToDate(julianDay: number, startYear: number): string | null {
  try {
    const date = new Date(startYear, 0, julianDay);
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Extract fire perimeter polygons from deterministic arrival-time rasters.
 *
 * For deterministic mode (single simulation, scenario 000001):
 * 1. Find the last day's arrival grid (highest Julian day)
 * 2. Threshold: all pixels with value > 0 → burned area
 * 3. Polygonalize → GeoJSON fire boundary
 * 4. Reproject to WGS84 (EPSG:4326)
 *
 * @param workingDir Directory containing arrival-time TIFFs
 * @param startYear Year of the simulation (for Julian day → date conversion)
 */
export async function extractDeterministicPerimeters(
  workingDir: string,
  startYear?: number,
): Promise<Result<DeterministicExtractionResult, ValidationError | NotFoundError>> {

  if (!existsSync(workingDir)) {
    return Result.fail(new NotFoundError('Working directory', workingDir));
  }

  if (!isGDALAvailable()) {
    return Result.fail(
      new ValidationError('GDAL tools not available', [
        { field: 'gdal', message: 'gdal_calc.py, gdal_polygonize.py, and ogr2ogr must be in PATH' },
      ])
    );
  }

  // Find scenario 1 arrival files (deterministic = single scenario)
  const files = readdirSync(workingDir);
  const arrivalFiles = files
    .filter(f => f.match(/^000_000001_\d+_arrival\.tif$/))
    .map(f => ({ filename: f, info: parseArrivalFilename(f)! }))
    .filter(f => f.info !== null)
    .sort((a, b) => a.info.julianDay - b.info.julianDay);

  if (arrivalFiles.length === 0) {
    return Result.fail(
      new NotFoundError('Arrival-time rasters', workingDir, 'No 000_000001_*_arrival.tif files found')
    );
  }

  console.log(`[ArrivalTimeExtractor] Found ${arrivalFiles.length} arrival grids for scenario 1`);

  const perimeters: DeterministicPerimeter[] = [];
  let successCount = 0;
  const year = startYear ?? new Date().getFullYear();

  for (const { filename, info } of arrivalFiles) {
    const inputPath = join(workingDir, filename);
    const tmpDir = mkdtempSync(join(tmpdir(), 'nomad-arrival-'));

    try {
      // Step 1: Create binary mask (value > 0 → 1, else 0)
      const maskPath = join(tmpDir, 'mask.tif');
      execSync(
        `gdal_calc.py -A "${inputPath}" --outfile="${maskPath}" --calc="(A>0)*1" --type=Byte --NoDataValue=0 --quiet`,
        { stdio: 'pipe', timeout: 30000 }
      );

      // Step 2: Polygonalize the mask
      const vectorPath = join(tmpDir, 'perimeter.geojson');
      execSync(
        `gdal_polygonize.py "${maskPath}" -f GeoJSON "${vectorPath}" perimeter DN`,
        { stdio: 'pipe', timeout: 30000 }
      );

      // Step 3: Reproject to WGS84 and dissolve
      const outputPath = join(tmpDir, 'perimeter_4326.geojson');
      execSync(
        `ogr2ogr -f GeoJSON "${outputPath}" "${vectorPath}" -t_srs EPSG:4326 -dialect sqlite -sql "SELECT ST_Union(geometry) as geometry FROM perimeter WHERE DN=1"`,
        { stdio: 'pipe', timeout: 30000 }
      );

      // Step 4: Read the GeoJSON
      if (existsSync(outputPath)) {
        const geojsonStr = readFileSync(outputPath, 'utf-8');
        const fc = JSON.parse(geojsonStr) as FeatureCollection<Polygon | MultiPolygon>;

        if (fc.features && fc.features.length > 0) {
          perimeters.push({
            julianDay: info.julianDay,
            date: julianDayToDate(info.julianDay, year),
            geojson: fc.features[0],
          });
          successCount++;
          console.log(`[ArrivalTimeExtractor] Extracted perimeter for day ${info.julianDay}`);
        }
      }
    } catch (err) {
      console.warn(`[ArrivalTimeExtractor] Failed to process ${filename}:`, err);
    } finally {
      // Cleanup temp dir
      try {
        execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' });
      } catch { /* best effort */ }
    }
  }

  return Result.ok({
    perimeters,
    totalGrids: arrivalFiles.length,
    successCount,
  });
}
