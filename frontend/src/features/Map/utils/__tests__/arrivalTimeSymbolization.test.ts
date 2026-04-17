/**
 * arrivalTimeSymbolization — classify arrival-time pixels and build
 * a data-driven MapLibre `raster-color` expression from an RGB-encoded
 * arrival tile (see backend/ArrivalTimeEncoder for the encoding scheme).
 *
 * Issue #226 — one arrival grid, swappable symbolization by timestep (daily/hourly).
 */

import { describe, it, expect } from 'vitest';
import {
  bucketOf,
  generateArrivalLegend,
} from '../arrivalTimeSymbolization';

describe('arrivalTimeSymbolization', () => {
  describe('bucketOf', () => {
    it('returns 0 for the first day when timestep is "daily"', () => {
      expect(bucketOf(170.0, 170, 'daily')).toBe(0);
      expect(bucketOf(170.99, 170, 'daily')).toBe(0);
    });

    it('returns 1 for the second day when timestep is "daily"', () => {
      expect(bucketOf(171.0, 170, 'daily')).toBe(1);
      expect(bucketOf(171.5, 170, 'daily')).toBe(1);
    });

    it('returns correct bucket for hourly timestep', () => {
      expect(bucketOf(170.0, 170, 'hourly')).toBe(0);
      expect(bucketOf(170.0 + 1 / 24, 170, 'hourly')).toBe(1);
      expect(bucketOf(170.5, 170, 'hourly')).toBe(12);
      expect(bucketOf(171.0, 170, 'hourly')).toBe(24);
    });

    it('returns -1 (sentinel) for NaN / NoData', () => {
      expect(bucketOf(Number.NaN, 170, 'daily')).toBe(-1);
      expect(bucketOf(0, 170, 'daily')).toBe(-1);
    });

    it('returns -1 for values below the start', () => {
      expect(bucketOf(169.5, 170, 'daily')).toBe(-1);
    });
  });

  describe('generateArrivalLegend', () => {
    it('produces one entry per day for a 3-day model with "daily" timestep', () => {
      const legend = generateArrivalLegend({
        startJulian: 170,
        endJulian: 173,
        timestep: 'daily',
        startDate: new Date(Date.UTC(2026, 5, 19)), // June 19, 2026 = day 170
      });
      expect(legend).toHaveLength(3);
      expect(legend[0].bucket).toBe(0);
      expect(legend[2].bucket).toBe(2);
    });

    it('produces one entry per hour for a 3-day model with "hourly" timestep', () => {
      const legend = generateArrivalLegend({
        startJulian: 170,
        endJulian: 173,
        timestep: 'hourly',
        startDate: new Date(Date.UTC(2026, 5, 19)),
      });
      expect(legend).toHaveLength(72); // 3 days * 24 hours
      expect(legend[0].bucket).toBe(0);
      expect(legend[71].bucket).toBe(71);
    });

    it('renders daily labels with year and calendar date', () => {
      const legend = generateArrivalLegend({
        startJulian: 170,
        endJulian: 172,
        timestep: 'daily',
        startDate: new Date(Date.UTC(2026, 5, 19)),
      });
      expect(legend[0].label).toMatch(/jun.*19.*2026|2026.*jun.*19/i);
      expect(legend[1].label).toMatch(/jun.*20.*2026|2026.*jun.*20/i);
    });

    it('renders hourly labels with date and time', () => {
      const legend = generateArrivalLegend({
        startJulian: 170,
        endJulian: 171,
        timestep: 'hourly',
        startDate: new Date(Date.UTC(2026, 5, 19)),
      });
      expect(legend[0].label).toMatch(/jun.*19.*00:00/i);
      expect(legend[12].label).toMatch(/jun.*19.*12:00/i);
    });

    it('assigns colors across a ramp (first and last differ)', () => {
      const legend = generateArrivalLegend({
        startJulian: 170,
        endJulian: 175,
        timestep: 'daily',
        startDate: new Date(Date.UTC(2026, 5, 19)),
      });
      expect(legend[0].color).not.toEqual(legend[legend.length - 1].color);
    });

    it('every entry has minJulian / maxJulian bounds', () => {
      const legend = generateArrivalLegend({
        startJulian: 170,
        endJulian: 173,
        timestep: 'daily',
        startDate: new Date(Date.UTC(2026, 5, 19)),
      });
      expect(legend[0].minJulian).toBe(170);
      expect(legend[0].maxJulian).toBe(171);
      expect(legend[2].minJulian).toBe(172);
      expect(legend[2].maxJulian).toBe(173);
    });
  });

});
