/**
 * FireSTARREngine re-run config persistence tests
 *
 * Validates that output-config.json written during initialize()
 * contains all fields needed for model re-run: ignition, timeRange,
 * weather, and modelMode.
 *
 * Bug: #229 — Re-run fails because output-config.json lacked ignition
 * geometry, causing frontend to abort with "Incomplete config".
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, mkdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { FireSTARREngine } from '../FireSTARREngine.js';
import { FireModel, createFireModelId, EngineType, ModelStatus, GeometryType, SpatialGeometry } from '../../../domain/entities/index.js';
import { TimeRange } from '../../../domain/value-objects/index.js';
import type { ExecutionOptions } from '../../../application/interfaces/IFireModelingEngine.js';
import type { IContainerExecutor } from '../../../application/interfaces/IContainerExecutor.js';
import type { IInputGenerator, InputGenerationResult } from '../../../application/interfaces/IInputGenerator.js';
import type { IOutputParser } from '../../../application/interfaces/IOutputParser.js';
import type { FireSTARRParams } from '../types.js';
import { Result } from '../../../application/common/index.js';

/** Create a minimal mock executor */
function createMockExecutor(): IContainerExecutor {
  return {
    runStream: vi.fn().mockResolvedValue(Result.ok({ exitCode: 0, stdout: '', stderr: '' })),
  } as unknown as IContainerExecutor;
}

/** Create a mock output parser */
function createMockOutputParser(): IOutputParser<unknown[]> {
  return {
    parse: vi.fn().mockResolvedValue(Result.ok([])),
    parseLog: vi.fn().mockResolvedValue({ success: true, durationSeconds: 1 }),
  } as unknown as IOutputParser<unknown[]>;
}

describe('FireSTARREngine — output-config.json for re-run', () => {
  let tempDir: string;
  let workingDir: string;
  let engine: FireSTARREngine;
  let mockInputGenerator: IInputGenerator<FireSTARRParams>;

  const modelId = createFireModelId('test-model-rerun');
  const model = new FireModel({
    id: modelId,
    name: 'Test Re-run Model',
    engineType: EngineType.FireSTARR,
    status: ModelStatus.Queued,
    userId: 'test-user',
  });

  const pointIgnition = new SpatialGeometry({
    type: GeometryType.Point,
    coordinates: [-115.5, 51.5],
  });

  const polygonIgnition = new SpatialGeometry({
    type: GeometryType.Polygon,
    coordinates: [[[-115.5, 51.5], [-115.4, 51.5], [-115.4, 51.6], [-115.5, 51.6], [-115.5, 51.5]]],
  });

  const baseOptions: ExecutionOptions = {
    ignitionGeometry: pointIgnition,
    timeRange: new TimeRange(
      new Date('2026-07-01T12:00:00Z'),
      new Date('2026-07-04T12:00:00Z'),
    ),
    weatherConfig: {
      source: 'csv' as const,
      stationId: 'test-station',
    },
    weatherData: [{
      datetime: new Date('2026-07-01T12:00:00Z'),
      temperature: 25,
      humidity: 30,
      windSpeed: 15,
      windDirection: 270,
      precipitation: 0,
      ffmc: 90,
      dmc: 40,
      dc: 300,
    }],
    outputMode: 'probabilistic' as const,
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'firestarr-test-'));
    workingDir = join(tempDir, 'sims', 'test-model-rerun');

    // Create the working directory (real InputGenerator does this via mkdir)
    await mkdir(workingDir, { recursive: true });

    // Mock input generator that uses our temp directory
    mockInputGenerator = {
      generate: vi.fn().mockResolvedValue(Result.ok({
        workingDir,
        weatherFile: join(workingDir, 'weather.csv'),
        configFiles: [],
      } as InputGenerationResult)),
      cleanup: vi.fn(),
    } as unknown as IInputGenerator<FireSTARRParams>;

    engine = new FireSTARREngine(
      createMockExecutor(),
      mockInputGenerator,
      createMockOutputParser(),
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should include ignition geometry in output-config.json for point ignition', async () => {
    await engine.initialize(model, baseOptions);

    const configPath = join(workingDir, 'output-config.json');
    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);

    expect(config.ignition).toBeDefined();
    expect(config.ignition.type).toBe('point');
    expect(config.ignition.coordinates).toEqual([-115.5, 51.5]);
  });

  it('should include ignition geometry in output-config.json for polygon ignition', async () => {
    const polyOptions: ExecutionOptions = {
      ...baseOptions,
      ignitionGeometry: polygonIgnition,
    };

    await engine.initialize(model, polyOptions);

    const configPath = join(workingDir, 'output-config.json');
    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);

    expect(config.ignition).toBeDefined();
    expect(config.ignition.type).toBe('polygon');
    expect(config.ignition.coordinates).toEqual(
      [[[-115.5, 51.5], [-115.4, 51.5], [-115.4, 51.6], [-115.5, 51.6], [-115.5, 51.5]]]
    );
  });

  it('should include timeRange in output-config.json', async () => {
    await engine.initialize(model, baseOptions);

    const configPath = join(workingDir, 'output-config.json');
    const config = JSON.parse(await readFile(configPath, 'utf-8'));

    expect(config.timeRange).toBeDefined();
    expect(config.timeRange.start).toBe('2026-07-01T12:00:00.000Z');
    expect(config.timeRange.end).toBe('2026-07-04T12:00:00.000Z');
  });

  it('should include weather config in output-config.json', async () => {
    await engine.initialize(model, baseOptions);

    const configPath = join(workingDir, 'output-config.json');
    const config = JSON.parse(await readFile(configPath, 'utf-8'));

    expect(config.weather).toBeDefined();
    expect(config.weather.source).toBe('csv');
  });

  it('should include modelMode in output-config.json', async () => {
    await engine.initialize(model, baseOptions);

    const configPath = join(workingDir, 'output-config.json');
    const config = JSON.parse(await readFile(configPath, 'utf-8'));

    expect(config.modelMode).toBe('probabilistic');
  });

  it('should use lowercase API-format ignition type, not GeoJSON type', async () => {
    // The frontend expects 'point'|'linestring'|'polygon', not 'Point'|'LineString'|'Polygon'
    await engine.initialize(model, baseOptions);

    const configPath = join(workingDir, 'output-config.json');
    const config = JSON.parse(await readFile(configPath, 'utf-8'));

    expect(config.ignition.type).toBe('point');
    expect(config.ignition.type).not.toBe('Point');
  });

  it('should produce a config that satisfies the frontend re-run guard', async () => {
    // Frontend checks: !runBody.ignition || !runBody.timeRange || !runBody.weather
    await engine.initialize(model, baseOptions);

    const configPath = join(workingDir, 'output-config.json');
    const config = JSON.parse(await readFile(configPath, 'utf-8'));

    // Simulate what the frontend does
    const runBody = {
      ignition: config.ignition,
      timeRange: config.timeRange,
      weather: config.weather,
    };

    expect(runBody.ignition).toBeTruthy();
    expect(runBody.timeRange).toBeTruthy();
    expect(runBody.weather).toBeTruthy();
  });
});
