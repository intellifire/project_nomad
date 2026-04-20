/**
 * Tests for the arrival-perimeter animation frame planner (refs #236).
 *
 * Pure math only — given a simulation start time and duration, produce the
 * list of hourly frames the animation will render. 7-day / 168-frame cap
 * keeps payload and GDAL work bounded for long sims.
 */

import { describe, it, expect } from 'vitest';
import { computeAnimationFrames } from '../arrivalAnimation.js';

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
