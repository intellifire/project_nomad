/**
 * Export Manifest Route
 *
 * Scans a model's simulation directory and returns all available files
 * organized by category for the Export All panel.
 */

import { Router } from 'express';
import { readdirSync, existsSync } from 'fs';
import { asyncHandler } from '../../middleware/index.js';
import { getModelRepository } from '../../../infrastructure/database/index.js';
import { createFireModelId } from '../../../domain/entities/FireModel.js';
import { NotFoundError } from '../../../domain/errors/index.js';
import { resolveResultFilePath } from '../../../infrastructure/firestarr/FireSTARRInputGenerator.js';
import { getResultRepository } from '../../../infrastructure/database/index.js';

const router = Router();

interface ExportFile {
  filename: string;
  category: 'inputs' | 'aggregated' | 'final';
  label: string;
  format: string;
  /** Relative path within sim directory */
  path: string;
}

/**
 * Categorize a file from the simulation directory.
 * Returns null if the file should not be included in exports.
 */
function categorizeFile(filename: string, lastJulianDay: number | null): ExportFile | null {
  // Inputs
  if (filename === 'ignition.geojson') {
    return { filename, category: 'inputs', label: 'Ignition Geometry', format: 'geojson', path: filename };
  }
  if (filename === 'weather.csv') {
    return { filename, category: 'inputs', label: 'Weather Data', format: 'csv', path: filename };
  }
  if (filename === 'fuel.tif') {
    return { filename, category: 'inputs', label: 'Fuel Grid', format: 'geotiff', path: filename };
  }
  if (filename === 'dem.tif') {
    return { filename, category: 'inputs', label: 'Digital Elevation Model', format: 'geotiff', path: filename };
  }
  if (filename === 'aspect.tif') {
    return { filename, category: 'inputs', label: 'Aspect Grid', format: 'geotiff', path: filename };
  }
  if (filename === 'slope.tif') {
    return { filename, category: 'inputs', label: 'Slope Grid', format: 'geotiff', path: filename };
  }

  // Aggregated
  const probMatch = filename.match(/^probability_(\d+)(?:_(\d{4}-\d{2}-\d{2}))?\.tif$/);
  if (probMatch) {
    const date = probMatch[2] || `Day ${probMatch[1]}`;
    return { filename, category: 'aggregated', label: `Burn Probability - ${date}`, format: 'geotiff', path: filename };
  }

  const intMatch = filename.match(/^intensity_([HML])_(\d+)(?:_(\d{4}-\d{2}-\d{2}))?\.tif$/);
  if (intMatch) {
    const level = intMatch[1] === 'H' ? 'High' : intMatch[1] === 'M' ? 'Medium' : 'Low';
    const date = intMatch[3] || `Day ${intMatch[2]}`;
    return { filename, category: 'aggregated', label: `Intensity (${level}) - ${date}`, format: 'geotiff', path: filename };
  }

  const sizesMatch = filename.match(/^sizes_(\d+)(?:_(\d{4}-\d{2}-\d{2}))?\.csv$/);
  if (sizesMatch) {
    const date = sizesMatch[2] || `Day ${sizesMatch[1]}`;
    return { filename, category: 'aggregated', label: `Fire Sizes - ${date}`, format: 'csv', path: filename };
  }

  if (filename === 'perimeter.tif') {
    return { filename, category: 'aggregated', label: 'Perimeter Raster', format: 'geotiff', path: filename };
  }
  if (filename === 'simulation_area.tif') {
    return { filename, category: 'aggregated', label: 'Simulation Area', format: 'geotiff', path: filename };
  }

  // Log file
  if (filename === 'firestarr.log') {
    return { filename, category: 'inputs', label: 'FireSTARR Log', format: 'log', path: filename };
  }

  // Final outputs — scenario 1, last day only
  if (lastJulianDay !== null) {
    const finalMatch = filename.match(/^000_000001_(\d+)_(arrival|intensity|raz|ros|source)\.tif$/);
    if (finalMatch && parseInt(finalMatch[1], 10) === lastJulianDay) {
      const typeLabels: Record<string, string> = {
        arrival: 'Arrival Time',
        intensity: 'Fire Intensity',
        raz: 'Rate of Spread Azimuth',
        ros: 'Rate of Spread',
        source: 'Ignition Source',
      };
      const label = `${typeLabels[finalMatch[2]] || finalMatch[2]} - Final Day`;
      return { filename, category: 'final', label, format: 'geotiff', path: filename };
    }
  }

  return null;
}

/**
 * GET /models/:id/export-manifest
 *
 * Returns all exportable files for a model, organized by category.
 */
router.get(
  '/models/:id/export-manifest',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const modelRepo = getModelRepository();
    const model = await modelRepo.findById(createFireModelId(id));
    if (!model) {
      throw new NotFoundError('Model', id);
    }

    // Find the sim directory via the first result's file path
    const resultRepo = getResultRepository();
    const results = await resultRepo.findByModelId(createFireModelId(id));

    let simDir: string | null = null;
    for (const result of results) {
      const filePath = (result.metadata.filePath as string) ?? null;
      if (filePath) {
        const absolutePath = resolveResultFilePath(filePath);
        const { dirname } = await import('path');
        simDir = dirname(absolutePath);
        break;
      }
    }

    if (!simDir || !existsSync(simDir)) {
      res.json({ categories: { inputs: [], aggregated: [], final: [] } });
      return;
    }

    // Read output config to determine mode
    let outputMode: 'probabilistic' | 'deterministic' = 'probabilistic';
    const configPath = `${simDir}/output-config.json`;
    if (existsSync(configPath)) {
      try {
        const { readFileSync } = await import('fs');
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.outputMode === 'deterministic') outputMode = 'deterministic';
      } catch { /* use default */ }
    }

    // Scan directory
    const allFiles = readdirSync(simDir);

    // Determine last Julian day from probability files or arrival files
    let lastJulianDay: number | null = null;
    for (const f of allFiles) {
      const match = f.match(/^(?:probability|000_000001)_(\d+)/);
      if (match) {
        const day = parseInt(match[1], 10);
        if (lastJulianDay === null || day > lastJulianDay) {
          lastJulianDay = day;
        }
      }
    }

    // Categorize files
    const inputs: ExportFile[] = [];
    const aggregated: ExportFile[] = [];
    const final: ExportFile[] = [];

    for (const filename of allFiles.sort()) {
      const file = categorizeFile(filename, lastJulianDay);
      if (file) {
        switch (file.category) {
          case 'inputs': inputs.push(file); break;
          case 'aggregated': aggregated.push(file); break;
          case 'final': final.push(file); break;
        }
      }
    }

    // Deterministic mode: aggregated results are probabilistic artifacts, skip them
    const filteredAggregated = outputMode === 'deterministic' ? [] : aggregated;

    res.json({
      modelId: id,
      outputMode,
      categories: { inputs, aggregated: filteredAggregated, final },
      totalFiles: inputs.length + filteredAggregated.length + final.length,
    });
  })
);

export default router;
