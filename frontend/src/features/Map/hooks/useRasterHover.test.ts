/**
 * Tests for useRasterHover hook — colorToPercentage function
 *
 * Verifies the FireSTARR 10-class discrete colour ramp mapping from RGB values
 * to burn-probability band label strings. The function returns a string like
 * '81-90%' or null — never a number.
 *
 * @module features/Map/hooks/__tests__
 */

import { describe, it, expect } from 'vitest';
import { colorToPercentage } from './useRasterHover.js';

// =============================================================================
// FireSTARR 10-class discrete colour ramp anchor points (midpoints)
// =============================================================================
// [95,  230,  21,  31]  → '91-100%'
// [85,  235,  51,  38]  → '81-90%'
// [75,  238,  79,  44]  → '71-80%'
// [65,  240, 108,  51]  → '61-70%'
// [55,  242, 137,  56]  → '51-60%'
// [45,  245, 162,  61]  → '41-50%'
// [35,  250, 192,  68]  → '31-40%'
// [25,  252, 223,  75]  → '21-30%'
// [15,  250, 246, 142]  → '11-20%'
// [5,    76, 175,  80]  → '1-10%'

describe('colorToPercentage', () => {
  describe('exact anchor points', () => {
    it("maps crimson (230, 21, 31) to '91-100%'", () => {
      expect(colorToPercentage(230, 21, 31)).toBe('91-100%');
    });

    it("maps dark red (235, 51, 38) to '81-90%'", () => {
      expect(colorToPercentage(235, 51, 38)).toBe('81-90%');
    });

    it("maps red (238, 79, 44) to '71-80%'", () => {
      expect(colorToPercentage(238, 79, 44)).toBe('71-80%');
    });

    it("maps red-orange (240, 108, 51) to '61-70%'", () => {
      expect(colorToPercentage(240, 108, 51)).toBe('61-70%');
    });

    it("maps dark orange (242, 137, 56) to '51-60%'", () => {
      expect(colorToPercentage(242, 137, 56)).toBe('51-60%');
    });

    it("maps orange (245, 162, 61) to '41-50%'", () => {
      expect(colorToPercentage(245, 162, 61)).toBe('41-50%');
    });

    it("maps light orange (250, 192, 68) to '31-40%'", () => {
      expect(colorToPercentage(250, 192, 68)).toBe('31-40%');
    });

    it("maps yellow (252, 223, 75) to '21-30%'", () => {
      expect(colorToPercentage(252, 223, 75)).toBe('21-30%');
    });

    it("maps light yellow (250, 246, 142) to '11-20%'", () => {
      expect(colorToPercentage(250, 246, 142)).toBe('11-20%');
    });

    it("maps green (76, 175, 80) to '1-10%'", () => {
      expect(colorToPercentage(76, 175, 80)).toBe('1-10%');
    });
  });

  describe('nearest-band matching (discrete classes)', () => {
    it('maps a colour close to the 91-100% anchor to that band', () => {
      // Slight deviation from anchor (230, 21, 31) → still closest to it
      expect(colorToPercentage(228, 25, 33)).toBe('91-100%');
    });

    it('maps a colour close to the 81-90% anchor to that band', () => {
      // Slight deviation from anchor (235, 51, 38)
      expect(colorToPercentage(233, 55, 40)).toBe('81-90%');
    });

    it('maps a colour close to the 1-10% green anchor to that band', () => {
      // Slight deviation from anchor (76, 175, 80)
      expect(colorToPercentage(78, 172, 82)).toBe('1-10%');
    });
  });

  describe('alpha channel handling', () => {
    it('accepts an optional alpha parameter and returns same result as without it', () => {
      expect(colorToPercentage(230, 21, 31, 255)).toBe(colorToPercentage(230, 21, 31));
    });

    it('returns null for fully transparent pixels (alpha = 0)', () => {
      expect(colorToPercentage(230, 21, 31, 0)).toBeNull();
    });
  });

  describe('unknown / background colors', () => {
    it('returns null for pure black (background / no-data)', () => {
      expect(colorToPercentage(0, 0, 0)).toBeNull();
    });

    it('returns null for pure white', () => {
      expect(colorToPercentage(255, 255, 255)).toBeNull();
    });

    it('returns null for an arbitrary color far from the ramp', () => {
      expect(colorToPercentage(0, 0, 255)).toBeNull();
    });
  });

  describe('return value format', () => {
    it('returns a string for a valid ramp colour', () => {
      const result = colorToPercentage(230, 21, 31);
      expect(typeof result).toBe('string');
    });

    it('returns a string matching the band label pattern (e.g. "N-NN%")', () => {
      const result = colorToPercentage(245, 162, 61);
      expect(result).toMatch(/^\d+-\d+%$/);
    });
  });
});
