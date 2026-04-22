/**
 * Tests for the arrival-perimeter animation frame planner (refs #236).
 *
 * Pure math only — given a simulation start time and duration, produce the
 * list of hourly frames the animation will render. 7-day / 168-frame cap
 * keeps payload and GDAL work bounded for long sims.
 */

import { describe, it, expect } from 'vitest';
import {
  buildReclassifyExpression,
  computeAnimationFrames,
  extractArrivalAnimation,
  extractSimTimeRange,
  julianDayFromDate,
  julianToDate,
  toAnimationFeatureCollection,
} from '../arrivalAnimation.js';

describe('computeAnimationFrames', () => {
  it('emits one hourly frame per simulation hour starting at offset 1', () => {
    const start = new Date('2026-04-18T00:00:00Z');
    const frames = computeAnimationFrames(start, 3);

    expect(frames).toEqual([
      { offsetHours: 1, isoTime: '2026-04-18T01:00:00.000Z' },
      { offsetHours: 2, isoTime: '2026-04-18T02:00:00.000Z' },
      { offsetHours: 3, isoTime: '2026-04-18T03:00:00.000Z' },
    ]);
  });

  it('caps at 168 frames (7 days) for a longer simulation', () => {
    const start = new Date('2026-04-18T00:00:00Z');
    const frames = computeAnimationFrames(start, 240);

    expect(frames).toHaveLength(168);
    expect(frames[0].offsetHours).toBe(1);
    expect(frames[frames.length - 1].offsetHours).toBe(168);
  });

  it('honors an explicit cap shorter than the default', () => {
    const start = new Date('2026-04-18T00:00:00Z');
    const frames = computeAnimationFrames(start, 48, 24);

    expect(frames).toHaveLength(24);
  });

  it('returns an empty array for a sub-hour duration', () => {
    const start = new Date('2026-04-18T00:00:00Z');
    expect(computeAnimationFrames(start, 0.5)).toEqual([]);
  });
});

describe('extractSimTimeRange', () => {
  it('reads timeRange.start and timeRange.end from a model config and returns duration in hours', () => {
    const config = {
      timeRange: {
        start: '2026-04-18T00:00:00Z',
        end: '2026-04-21T00:00:00Z',
      },
    };

    expect(extractSimTimeRange(config)).toEqual({
      simStart: new Date('2026-04-18T00:00:00Z'),
      durationHours: 72,
    });
  });

  it('throws when timeRange is missing', () => {
    expect(() => extractSimTimeRange({})).toThrow(/timeRange/i);
  });

  it('throws when start or end cannot be parsed as a date', () => {
    expect(() =>
      extractSimTimeRange({ timeRange: { start: 'not-a-date', end: '2026-04-21T00:00:00Z' } }),
    ).toThrow(/invalid/i);
  });
});

describe('toAnimationFeatureCollection', () => {
  const simStart = new Date('2026-04-18T00:00:00Z');
  const makeFeature = (dn: number) => ({
    type: 'Feature' as const,
    properties: { DN: dn },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    },
  });

  it('drops DN=0 (unburned) and renames DN to offsetHours + isoTime', () => {
    const raw = {
      type: 'FeatureCollection' as const,
      features: [makeFeature(0), makeFeature(1), makeFeature(5)],
    };

    const result = toAnimationFeatureCollection(raw, simStart);

    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(2);
    expect(result.features[0].properties).toEqual({
      offsetHours: 1,
      isoTime: '2026-04-18T01:00:00.000Z',
    });
    expect(result.features[1].properties).toEqual({
      offsetHours: 5,
      isoTime: '2026-04-18T05:00:00.000Z',
    });
  });

  it('preserves polygon geometry verbatim', () => {
    const raw = {
      type: 'FeatureCollection' as const,
      features: [makeFeature(2)],
    };

    const result = toAnimationFeatureCollection(raw, simStart);

    expect(result.features[0].geometry).toEqual({
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    });
  });
});

describe('julianDayFromDate', () => {
  it('returns 1.0 at Jan 1 00:00 UTC (day-of-year convention)', () => {
    expect(julianDayFromDate(new Date('2026-01-01T00:00:00Z'))).toBe(1);
  });

  it('includes the fractional time of day', () => {
    expect(julianDayFromDate(new Date('2026-01-01T12:00:00Z'))).toBe(1.5);
  });

  it('produces the expected day number for a mid-year date', () => {
    // 2026-04-18 = Jan(31) + Feb(28) + Mar(31) + Apr 1..17(17) = 107 days after Jan 1 00:00.
    expect(julianDayFromDate(new Date('2026-04-18T00:00:00Z'))).toBe(108);
  });
});

describe('julianToDate', () => {
  it('is the inverse of julianDayFromDate', () => {
    const d = new Date('2023-06-19T11:08:30.000Z');
    const j = julianDayFromDate(d);
    expect(julianToDate(j, 2023).toISOString()).toBe('2023-06-19T11:08:30.000Z');
  });

  it('returns Jan 1 00:00 UTC for julianDay 1.0', () => {
    expect(julianToDate(1, 2023).toISOString()).toBe('2023-01-01T00:00:00.000Z');
  });

  it('returns mid-day noon for a .5 fraction', () => {
    expect(julianToDate(170.5, 2023).toISOString()).toBe('2023-06-19T12:00:00.000Z');
  });
});

describe('buildReclassifyExpression', () => {
  it('emits a gdal_calc expression referencing simStartJulian and the frame cap', () => {
    const expr = buildReclassifyExpression(108.0, 168);
    expect(expr).toContain('108');
    expect(expr).toContain('168');
    expect(expr).toContain('24'); // hours per day
    expect(expr).toContain('A'); // input band
  });
});

describe('extractArrivalAnimation (orchestrator)', () => {
  function stubDeps(readJSONResult: unknown = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { DN: 0 },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      },
      {
        type: 'Feature',
        properties: { DN: 3 },
        geometry: { type: 'Polygon', coordinates: [[[2, 2], [3, 2], [3, 3], [2, 2]]] },
      },
    ],
  }) {
    const execCalls: string[] = [];
    const rmrfCalls: string[] = [];
    const deps = {
      exec: (cmd: string) => {
        execCalls.push(cmd);
      },
      mkdtemp: (prefix: string) => `/tmp/${prefix}test`,
      readJSON: () => readJSONResult,
      rmrf: (path: string) => {
        rmrfCalls.push(path);
      },
      getSrsWkt: () => 'PROJCS["NAD83/CanadaAtlas",...]',
      // Default stub: raster's earliest arrival is Jun 19 2026 at 11:08Z
      // (julianDay ~170.464). Tests can override via deps.getRasterMinValue =.
      getRasterMinValue: () => 170.46420288086,
    };
    return { deps, execCalls, rmrfCalls };
  }

  it('runs gdal_calc → gdal_polygonize → ogr2ogr and returns the transformed FeatureCollection', async () => {
    const { deps, execCalls } = stubDeps();

    const result = await extractArrivalAnimation(
      {
        arrivalPath: '/sims/m1/arrival.tif',
        simStart: new Date('2026-04-18T00:00:00Z'),
        durationHours: 72,
      },
      deps,
    );

    const tools = execCalls.map((c) => c.split(/\s+/)[0]);
    expect(tools).toEqual(['gdal_calc.py', 'gdal_polygonize.py', 'ogr2ogr']);
    expect(execCalls[0]).toContain('/sims/m1/arrival.tif');
    expect(execCalls[2]).toContain('EPSG:4326');

    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties.offsetHours).toBe(3);
  });

  it('cleans up the temp directory on success', async () => {
    const { deps, rmrfCalls } = stubDeps();

    await extractArrivalAnimation(
      {
        arrivalPath: '/sims/m1/arrival.tif',
        simStart: new Date('2026-04-18T00:00:00Z'),
        durationHours: 24,
      },
      deps,
    );

    expect(rmrfCalls).toHaveLength(1);
    expect(rmrfCalls[0]).toContain('nomad-anim-');
  });

  it('anchors isoTime labels to the raster ignition time (min arrival), not params.simStart', async () => {
    const { deps } = stubDeps();
    deps.getRasterMinValue = () => 170.5; // Jun 19 12:00 UTC of year 2026

    const result = await extractArrivalAnimation(
      {
        // simStart only contributes the calendar year; the reclassify and
        // isoTime anchor both come from the raster min.
        arrivalPath: '/sims/m1/arrival.tif',
        simStart: new Date('2026-06-19T19:00:00Z'),
        durationHours: 72,
      },
      deps,
    );

    // Anchor = julianToDate(170.5 - 1/24, 2026) = Jun 19 11:00Z. Feature DN=3
    // then has isoTime = anchor + 3h = Jun 19 14:00Z.
    expect(result.features[0].properties.isoTime).toBe('2026-06-19T14:00:00.000Z');
  });

  it('passes the raster-min-derived anchor into the gdal_calc expression', async () => {
    const { deps, execCalls } = stubDeps();
    deps.getRasterMinValue = () => 170.46420288086;

    await extractArrivalAnimation(
      {
        arrivalPath: '/sims/m1/arrival.tif',
        simStart: new Date('2026-06-19T19:00:00Z'),
        durationHours: 72,
      },
      deps,
    );

    // Expression should reference (rasterMin - 1/24) ≈ 170.4225..., NOT the
    // params.simStart julian day (170.79..).
    const calcCall = execCalls[0];
    expect(calcCall).toContain('170.42');
    expect(calcCall).not.toContain('170.79');
  });

  it('cleans up the temp directory even when a command fails', async () => {
    const { deps, rmrfCalls } = stubDeps();
    let callCount = 0;
    deps.exec = () => {
      callCount++;
      if (callCount === 2) throw new Error('gdal_polygonize exploded');
    };

    await expect(
      extractArrivalAnimation(
        {
          arrivalPath: '/sims/m1/arrival.tif',
          simStart: new Date('2026-04-18T00:00:00Z'),
          durationHours: 24,
        },
        deps,
      ),
    ).rejects.toThrow(/exploded/);

    expect(rmrfCalls).toHaveLength(1);
  });
});
