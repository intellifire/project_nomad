/**
 * Tests for useTerrain hook — JSON.parse without try/catch
 *
 * Bug: Corrupt localStorage causes unhandled exception during state init.
 * Fix: Wrap JSON.parse in try/catch, clear corrupt entry, use default.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Must mock MapContext before importing useTerrain
vi.mock('../context/MapContext', () => ({
  useMap: () => ({
    map: {
      on: vi.fn(),
      off: vi.fn(),
      isStyleLoaded: vi.fn(() => false),
    },
    isLoaded: true,
  }),
}));

import { useTerrain } from './useTerrain';

const STORAGE_KEY = 'nomad-terrain-config';

describe('useTerrain', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns default config when localStorage is empty', () => {
    const { result } = renderHook(() => useTerrain());

    expect(result.current.config).toEqual({
      enabled: false,
      exaggeration: 1.5,
    });
  });

  it('loads valid config from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      enabled: true,
      exaggeration: 2.5,
    }));

    const { result } = renderHook(() => useTerrain());

    expect(result.current.config.enabled).toBe(true);
    expect(result.current.config.exaggeration).toBe(2.5);
  });

  it('handles corrupt localStorage gracefully instead of throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json!!!');

    // This should NOT throw — it should fall back to defaults
    // and clear the corrupt entry
    expect(() => {
      renderHook(() => useTerrain());
    }).not.toThrow();

    const { result } = renderHook(() => useTerrain());
    expect(result.current.config).toEqual({
      enabled: false,
      exaggeration: 1.5,
    });
  });

  it('reports terrain as not supported (MapLibre DEM not configured)', () => {
    const { result } = renderHook(() => useTerrain());

    expect(result.current.isSupported).toBe(false);
  });
});
