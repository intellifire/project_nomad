/**
 * Tests for the frontend arrival-animation helpers (refs #236).
 *
 * MapLibre handles per-frame filtering via layer filters, so these helpers
 * only cover the slider configuration and the per-frame time lookup.
 */

import { describe, it, expect } from 'vitest';
import {
  computeAnimationBounds,
  formatLocalTime,
  getFrameIsoTime,
} from '../arrivalAnimation.js';
import type { ArrivalPerimeterFeatureCollection } from '../arrivalAnimation.js';

function fc(offsets: number[], simStart = '2026-06-19T20:00:00.000Z'): ArrivalPerimeterFeatureCollection {
  const startMs = new Date(simStart).getTime();
  return {
    type: 'FeatureCollection',
    features: offsets.map((h) => ({
      type: 'Feature',
      properties: {
        offsetHours: h,
        isoTime: new Date(startMs + h * 3_600_000).toISOString(),
      },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    })),
  };
}

describe('computeAnimationBounds', () => {
  it('returns the min and max offsetHours present in the FeatureCollection', () => {
    expect(computeAnimationBounds(fc([5, 2, 10, 3]))).toEqual({
      minOffset: 2,
      maxOffset: 10,
    });
  });

  it('returns null for an empty FeatureCollection', () => {
    expect(computeAnimationBounds(fc([]))).toBeNull();
  });
});

describe('getFrameIsoTime', () => {
  it('returns the isoTime of the feature with the matching offsetHours', () => {
    const data = fc([1, 2, 3]);
    expect(getFrameIsoTime(data, 2)).toBe('2026-06-19T22:00:00.000Z');
  });

  it('returns the isoTime of the nearest-below frame when the exact offset is absent', () => {
    // Arrival grid is sparse — not every hour has a polygon. Ask for hour 4,
    // nearest existing frame is hour 3 (simStart 20:00 + 3h = 23:00).
    const data = fc([1, 3, 7]);
    expect(getFrameIsoTime(data, 4)).toBe('2026-06-19T23:00:00.000Z');
  });

  it('returns null when no frame ≤ requested offset exists', () => {
    const data = fc([5, 6, 7]);
    expect(getFrameIsoTime(data, 2)).toBeNull();
  });
});

describe('formatLocalTime', () => {
  it('does not surface a trailing Z / UTC marker', () => {
    const formatted = formatLocalTime('2023-06-19T19:00:00.000Z', 'America/Edmonton');
    expect(formatted).not.toMatch(/Z$/);
    expect(formatted).not.toContain('UTC');
  });

  it('renders the MDT wall-clock time when timezone=America/Edmonton', () => {
    // 19:00 UTC → 13:00 MDT
    const formatted = formatLocalTime('2023-06-19T19:00:00.000Z', 'America/Edmonton');
    expect(formatted).toContain('13:00');
    expect(formatted).toMatch(/Jun/);
    expect(formatted).toContain('2023');
  });

  it('falls back to the browser locale when no timezone is given', () => {
    const formatted = formatLocalTime('2023-06-19T19:00:00.000Z');
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).not.toMatch(/T\d\d:\d\d:\d\dZ?$/);
  });

  it('returns the raw input unchanged when the ISO string cannot be parsed', () => {
    expect(formatLocalTime('not a date')).toBe('not a date');
  });
});
