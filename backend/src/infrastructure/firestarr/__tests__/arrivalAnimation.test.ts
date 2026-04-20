/**
 * Tests for the arrival-perimeter animation frame planner (refs #236).
 *
 * Pure math only — given a simulation start time and duration, produce the
 * list of hourly frames the animation will render. 7-day / 168-frame cap
 * keeps payload and GDAL work bounded for long sims.
 */

import { describe, it, expect } from 'vitest';
import {
  computeAnimationFrames,
  extractSimTimeRange,
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
