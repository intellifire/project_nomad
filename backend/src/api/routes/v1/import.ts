/**
 * Import Route
 *
 * POST /import — accepts a Nomad export ZIP, creates model + results,
 * copies sim files to the data directory. Enables field-to-office
 * model transfer without network sync.
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { asyncHandler } from '../../middleware/index.js';
import { ValidationError } from '../../../domain/errors/index.js';
import {
  FireModel,
  createFireModelId,
  EngineType,
  ModelStatus,
} from '../../../domain/entities/FireModel.js';
import {
  ModelResult,
  createModelResultId,
  OutputType,
  OutputFormat,
} from '../../../domain/entities/ModelResult.js';
import { getModelRepository, getResultRepository } from '../../../infrastructure/database/index.js';

const router = Router();

// Accept ZIP uploads up to 500MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new ValidationError('Only ZIP files are accepted'));
    }
  },
});

/**
 * Parse metadata.txt from the export ZIP.
 * Returns key fields: modelName, modelId (source), engine, outputMode, user.
 */
export function parseMetadata(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*(.+?):\s+(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      result[key] = match[2].trim();
    }
  }
  return result;
}

/**
 * Map a filename to an OutputType based on known FireSTARR naming conventions.
 */
function filenameToOutputType(filename: string): OutputType | null {
  if (filename.includes('probability') || filename.includes('bp_')) return OutputType.Probability;
  if (filename.includes('perimeter') || filename.includes('fire_perimeter')) return OutputType.Perimeter;
  if (filename.includes('intensity') || filename.includes('hfi_')) return OutputType.Intensity;
  if (filename.includes('ros_') || filename.includes('rate_of_spread')) return OutputType.RateOfSpread;
  if (filename.includes('arrival') || filename.includes('at_')) return OutputType.ArrivalTime;
  if (filename.includes('cfb_') || filename.includes('crown_fraction')) return OutputType.CrownFractionBurned;
  if (filename.includes('flame_length')) return OutputType.FlameLength;
  return null;
}

/**
 * Determine output format from file extension.
 */
function extToFormat(filename: string): OutputFormat {
  const ext = extname(filename).toLowerCase();
  if (ext === '.tif' || ext === '.tiff') return OutputFormat.GeoTIFF;
  if (ext === '.geojson' || ext === '.json') return OutputFormat.GeoJSON;
  if (ext === '.kml') return OutputFormat.KML;
  if (ext === '.shp') return OutputFormat.Shapefile;
  return OutputFormat.GeoTIFF; // default for rasters
}

/**
 * @openapi
 * /import:
 *   post:
 *     summary: Import a Nomad export ZIP
 *     description: Accepts a ZIP produced by Nomad export, creates model and result records
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Model imported successfully
 *       400:
 *         description: Invalid ZIP or missing metadata
 */
router.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    // Extract ZIP
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    // Find metadata.txt
    const metadataEntry = entries.find(e => e.entryName.endsWith('metadata.txt'));
    if (!metadataEntry) {
      throw new ValidationError('Invalid export ZIP: missing metadata.txt');
    }

    const metadata = parseMetadata(metadataEntry.getData().toString('utf-8'));

    // Extract model info from metadata
    const sourceName = metadata['model_name'] || metadata['model'] || 'Imported Model';
    const engineStr = metadata['engine'] || 'firestarr';
    const outputMode = metadata['output_mode'] || 'probabilistic';
    const sourceUser = metadata['user'] || req.user || 'import';

    // Map engine string to EngineType
    const engineType = engineStr.toLowerCase().includes('firestarr')
      ? EngineType.FireSTARR
      : EngineType.FireSTARR; // default

    // Create new model with fresh ID
    const newModelId = createFireModelId(randomUUID());
    const model = new FireModel({
      id: newModelId,
      name: `${sourceName} (imported)`,
      engineType,
      status: ModelStatus.Completed,
      userId: String(sourceUser),
      outputMode,
    });

    const modelRepo = getModelRepository();
    await modelRepo.save(model);

    // Determine sim directory
    const dataPath = process.env.FIRESTARR_DATASET_PATH || process.env.NOMAD_DATA_DIR || './firestarr_data';
    const simDir = join(dataPath, 'sims', String(newModelId));
    mkdirSync(simDir, { recursive: true });

    // Extract all files (skip metadata.txt — it's informational, not a sim file)
    const importedFiles: string[] = [];
    const resultRecords: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      // Get just the filename (entries may have directory prefixes)
      const parts = entry.entryName.split('/');
      const filename = parts[parts.length - 1];
      if (!filename || filename === 'metadata.txt') continue;

      // Write file to sim directory
      const destPath = join(simDir, filename);
      writeFileSync(destPath, entry.getData());
      importedFiles.push(filename);

      // Create result record for recognized output files
      const outputType = filenameToOutputType(filename);
      if (outputType) {
        const format = extToFormat(filename);
        const resultId = createModelResultId(randomUUID());
        const relativePath = `sims/${String(newModelId)}/${filename}`;

        const result = new ModelResult({
          id: resultId,
          fireModelId: newModelId,
          outputType,
          format,
          metadata: {
            filePath: relativePath,
            importedFrom: metadata['model_id'] || 'unknown',
          },
        });

        const resultRepo = getResultRepository();
        await resultRepo.save(result);
        resultRecords.push(filename);
      }
    }

    res.status(201).json({
      modelId: String(newModelId),
      name: model.name,
      imported: {
        files: importedFiles.length,
        results: resultRecords.length,
        fileList: importedFiles,
        resultList: resultRecords,
      },
    });
  })
);

export default router;
