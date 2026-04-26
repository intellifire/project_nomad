/**
 * FireSTARREngine — IANA timezone wiring (refs #236 follow-up)
 *
 * Asserts the CLI command emits `--tz` based on the caller's IANA zone, not
 * a solar-longitude approximation. Hay River sits at ~-115.7° but observes
 * Mountain Time (DST). Solar gives -8; reality is -6 in summer, -7 in winter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { FireSTARREngine } from '../FireSTARREngine.js';
import {
  FireModel,
  createFireModelId,
  EngineType,
  ModelStatus,
  GeometryType,
  SpatialGeometry,
} from '../../../domain/entities/index.js';
import { TimeRange } from '../../../domain/value-objects/index.js';
import type { ExecutionOptions } from '../../../application/interfaces/IFireModelingEngine.js';
import type { IContainerExecutor, ContainerRunOptions } from '../../../application/interfaces/IContainerExecutor.js';
import type { IInputGenerator, InputGenerationResult } from '../../../application/interfaces/IInputGenerator.js';
import type { IOutputParser, ParsedOutput } from '../../../application/interfaces/IOutputParser.js';
import type { FireSTARRParams } from '../types.js';
import { Result } from '../../../application/common/index.js';

interface CapturedCommand {
  args: string[];
}

function createCapturingExecutor(captured: CapturedCommand[]): IContainerExecutor {
  return {
    run: vi.fn(),
    runStream: vi.fn().mockImplementation(async (options: ContainerRunOptions) => {
      captured.push({ args: [...options.command] });
      return Result.ok({ exitCode: 0, stdout: '', stderr: '', durationMs: 1 });
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    isServiceAvailable: vi.fn().mockResolvedValue(true),
  } as unknown as IContainerExecutor;
}

function createMockOutputParser(): IOutputParser<ParsedOutput[]> {
  return {
    parse: vi.fn().mockResolvedValue(Result.ok([])),
    parseLog: vi.fn().mockResolvedValue({ success: true, durationSeconds: 1 }),
  } as unknown as IOutputParser<ParsedOutput[]>;
}

/** Pull the value following a flag from the captured args list. */
function flagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

describe('FireSTARREngine — IANA timezone in buildCommand', () => {
  let tempDir: string;
  let workingDir: string;
  let captured: CapturedCommand[];
  let engine: FireSTARREngine;
  let mockInputGenerator: IInputGenerator<FireSTARRParams>;

  // Hay River, NWT — uses MDT (America/Edmonton) but sits at ~-115.7°.
  // Solar approximation gives -8; correct answer is -6 summer / -7 winter.
  const hayRiverIgnition = new SpatialGeometry({
    type: GeometryType.Point,
    coordinates: [-115.7, 60.82],
  });

  const baseWeather = (year: number, month: number, day: number) => [{
    datetime: new Date(Date.UTC(year, month - 1, day, 19, 0, 0)),
    temperature: 22,
    humidity: 35,
    windSpeed: 12,
    windDirection: 230,
    precipitation: 0,
    ffmc: 88,
    dmc: 35,
    dc: 280,
  }];

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'firestarr-tz-test-'));
    workingDir = join(tempDir, 'sims', 'tz-test-model');
    await mkdir(workingDir, { recursive: true });

    captured = [];

    mockInputGenerator = {
      generate: vi.fn().mockResolvedValue(Result.ok({
        workingDir,
        weatherFile: join(workingDir, 'weather.csv'),
        configFiles: [],
      } as InputGenerationResult)),
      cleanup: vi.fn(),
    } as unknown as IInputGenerator<FireSTARRParams>;

    engine = new FireSTARREngine(
      createCapturingExecutor(captured),
      mockInputGenerator,
      createMockOutputParser(),
    );

    // Force binary mode so workingDir resolution doesn't traverse Docker paths
    process.env.FIRESTARR_EXECUTION_MODE = 'binary';
    process.env.FIRESTARR_BINARY_PATH = '/usr/local/bin/firestarr';
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    delete process.env.FIRESTARR_EXECUTION_MODE;
    delete process.env.FIRESTARR_BINARY_PATH;
  });

  it('emits --tz -6 for Hay River summer ignition (America/Edmonton, DST)', async () => {
    const modelId = createFireModelId('tz-summer');
    const model = new FireModel({
      id: modelId,
      name: 'TZ summer test',
      engineType: EngineType.FireSTARR,
      status: ModelStatus.Queued,
      userId: 'test-user',
    });

    const summerOptions: ExecutionOptions = {
      ignitionGeometry: hayRiverIgnition,
      timeRange: new TimeRange(
        new Date('2023-06-19T19:00:00Z'), // 13:00 MDT
        new Date('2023-06-22T19:00:00Z'),
      ),
      timezone: 'America/Edmonton',
      weatherData: baseWeather(2023, 6, 19),
      outputMode: 'deterministic',
    };

    await engine.initialize(model, summerOptions);
    await engine.execute(modelId);

    expect(captured.length).toBeGreaterThan(0);
    expect(flagValue(captured[0].args, '--tz')).toBe('-6');
  });

  it('emits --tz -7 for Hay River winter ignition (America/Edmonton, standard time)', async () => {
    const modelId = createFireModelId('tz-winter');
    const model = new FireModel({
      id: modelId,
      name: 'TZ winter test',
      engineType: EngineType.FireSTARR,
      status: ModelStatus.Queued,
      userId: 'test-user',
    });

    const winterOptions: ExecutionOptions = {
      ignitionGeometry: hayRiverIgnition,
      timeRange: new TimeRange(
        new Date('2023-01-15T20:00:00Z'), // 13:00 MST
        new Date('2023-01-18T20:00:00Z'),
      ),
      timezone: 'America/Edmonton',
      weatherData: baseWeather(2023, 1, 15),
      outputMode: 'deterministic',
    };

    await engine.initialize(model, winterOptions);
    await engine.execute(modelId);

    expect(flagValue(captured[0].args, '--tz')).toBe('-7');
  });

  it('emits start-of-command date and time in caller-local zone', async () => {
    const modelId = createFireModelId('tz-walltime');
    const model = new FireModel({
      id: modelId,
      name: 'TZ wall-time test',
      engineType: EngineType.FireSTARR,
      status: ModelStatus.Queued,
      userId: 'test-user',
    });

    const options: ExecutionOptions = {
      ignitionGeometry: hayRiverIgnition,
      timeRange: new TimeRange(
        new Date('2023-06-19T19:00:00Z'), // 13:00 MDT
        new Date('2023-06-22T19:00:00Z'),
      ),
      timezone: 'America/Edmonton',
      weatherData: baseWeather(2023, 6, 19),
      outputMode: 'deterministic',
    };

    await engine.initialize(model, options);
    await engine.execute(modelId);

    // Command positional args after binary + workingDir: date, lat, lon, time
    const args = captured[0].args;
    // Find date by looking for a YYYY-MM-DD shape early in the args
    const date = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
    const time = args.find((a) => /^\d{2}:\d{2}$/.test(a));
    expect(date).toBe('2023-06-19');
    expect(time).toBe('13:00');
  });
});
