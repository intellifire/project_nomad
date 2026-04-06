/**
 * Tests for import route — parseMetadata and filenameToOutputType
 */

import { describe, it, expect } from 'vitest';
import { parseMetadata } from '../src/api/routes/v1/import.js';

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
