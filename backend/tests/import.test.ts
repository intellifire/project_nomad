/**
 * Tests for import route — parseMetadata and filenameToOutputType
 */

import { describe, it, expect } from 'vitest';
import { parseMetadata, filenameToOutputType } from '../src/api/routes/v1/import.js';
import { OutputType } from '../src/domain/entities/ModelResult.js';

describe('parseMetadata', () => {
  const sampleMetadata = `Project Nomad — Model Export
=============================

Model Name:      Test Fire 2026
Model ID:        abc-123-def
Engine:          firestarr
Output Mode:     probabilistic
User:            franco
Status:          completed
Created:         2026-03-30T12:00:00.000Z
Exported:        2026-03-31T08:00:00.000Z

Files Included (5):
  - ignition.geojson
  - weather.csv
  - bp_001.tif
  - bp_002.tif
  - firestarr.log`;

  it('extracts model name', () => {
    const result = parseMetadata(sampleMetadata);
    expect(result['model_name']).toBe('Test Fire 2026');
  });

  it('extracts model ID', () => {
    const result = parseMetadata(sampleMetadata);
    expect(result['model_id']).toBe('abc-123-def');
  });

  it('extracts engine type', () => {
    const result = parseMetadata(sampleMetadata);
    expect(result['engine']).toBe('firestarr');
  });

  it('extracts output mode', () => {
    const result = parseMetadata(sampleMetadata);
    expect(result['output_mode']).toBe('probabilistic');
  });

  it('extracts user', () => {
    const result = parseMetadata(sampleMetadata);
    expect(result['user']).toBe('franco');
  });

  it('handles deterministic output mode', () => {
    const meta = sampleMetadata.replace('probabilistic', 'deterministic');
    const result = parseMetadata(meta);
    expect(result['output_mode']).toBe('deterministic');
  });

  it('handles empty input gracefully', () => {
    const result = parseMetadata('');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('handles metadata without standard fields', () => {
    const result = parseMetadata('Just some text\nNo key-value pairs here');
    expect(result['model_name']).toBeUndefined();
  });
});

describe('filenameToOutputType', () => {
  // Probabilistic outputs
  it('recognizes probability rasters', () => {
    expect(filenameToOutputType('probability_170_2023-06-19.tif')).toBe(OutputType.Probability);
  });

  it('recognizes interim probability rasters', () => {
    expect(filenameToOutputType('interim_probability_001.tif')).toBe(OutputType.Probability);
  });

  it('recognizes fire perimeter GeoJSON', () => {
    expect(filenameToOutputType('fire_perimeter_170.geojson')).toBe(OutputType.Perimeter);
  });

  // Deterministic outputs
  it('recognizes arrival time grids', () => {
    expect(filenameToOutputType('000_000001_170_arrival.tif')).toBe(OutputType.ArrivalTime);
  });

  it('recognizes multi-day arrival time grids', () => {
    expect(filenameToOutputType('000_000001_172_arrival.tif')).toBe(OutputType.ArrivalTime);
  });

  // Non-result files (should return null)
  it('rejects metadata.txt', () => {
    expect(filenameToOutputType('metadata.txt')).toBeNull();
  });

  it('rejects model.json', () => {
    expect(filenameToOutputType('model.json')).toBeNull();
  });

  it('rejects weather.csv', () => {
    expect(filenameToOutputType('weather.csv')).toBeNull();
  });

  it('rejects ignition.geojson', () => {
    expect(filenameToOutputType('ignition.geojson')).toBeNull();
  });

  it('rejects internal sim files (intensity, raz, ros, source)', () => {
    expect(filenameToOutputType('000_000001_170_intensity.tif')).toBeNull();
    expect(filenameToOutputType('000_000001_170_raz.tif')).toBeNull();
    expect(filenameToOutputType('000_000001_170_ros.tif')).toBeNull();
    expect(filenameToOutputType('000_000001_170_source.tif')).toBeNull();
  });

  it('rejects aggregated intensity files', () => {
    expect(filenameToOutputType('intensity_H_170_2023-06-19.tif')).toBeNull();
  });
});
