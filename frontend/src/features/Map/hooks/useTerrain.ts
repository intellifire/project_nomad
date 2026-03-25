import { useCallback, useState, useEffect } from 'react';
import { useMap } from '../context/MapContext';

/**
 * Terrain configuration
 */
export interface TerrainConfig {
  /** Whether 3D terrain is enabled */
  enabled: boolean;
  /** Terrain exaggeration factor (1.0 - 3.0) */
  exaggeration: number;
}

/**
 * Local storage key for terrain settings
 */
const STORAGE_KEY = 'nomad-terrain-config';

/**
 * Default terrain configuration
 */
const DEFAULT_CONFIG: TerrainConfig = {
  enabled: false,
  exaggeration: 1.5,
};

/**
 * Hook return value
 */
interface UseTerrainReturn {
  /** Current terrain configuration */
  config: TerrainConfig;
  /** Toggle terrain on/off */
  toggle: () => void;
  /** Set terrain exaggeration */
  setExaggeration: (value: number) => void;
  /** Enable terrain */
  enable: () => void;
  /** Disable terrain */
  disable: () => void;
  /** Whether the map supports terrain */
  isSupported: boolean;
}

/**
 * Hook for managing 3D terrain visualization.
 *
 * Provides controls for enabling/disabling terrain and adjusting exaggeration.
 * Settings are persisted in localStorage.
 *
 * Note: Terrain requires a DEM source. Mapbox DEM is not compatible with MapLibre.
 * To enable terrain, configure a compatible DEM source (e.g., MapTiler, self-hosted).
 *
 * @example
 * ```tsx
 * function TerrainExample() {
 *   const { config, toggle, setExaggeration } = useTerrain();
 *
 *   return (
 *     <div>
 *       <button onClick={toggle}>
 *         {config.enabled ? '2D' : '3D'}
 *       </button>
 *       <input
 *         type="range"
 *         min="1"
 *         max="3"
 *         step="0.1"
 *         value={config.exaggeration}
 *         onChange={(e) => setExaggeration(Number(e.target.value))}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useTerrain(): UseTerrainReturn {
  const { map, isLoaded } = useMap();
  const [config, setConfig] = useState<TerrainConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
  });
  // Terrain is disabled by default - requires DEM source configuration
  const [isSupported, setIsSupported] = useState(false);

  // Apply terrain settings when map loads or config changes
  useEffect(() => {
    if (!map || !isLoaded) return;

    const applyTerrain = () => {
      // TODO: Enable terrain by configuring a MapLibre-compatible DEM source.
      // Options: MapTiler terrain-rgb-v2, or a self-hosted raster-dem tile set.
      // See: https://maplibre.org/maplibre-style-spec/sources/#raster-dem
      setIsSupported(false);
    };

    // Apply on style load (in case style changes)
    map.on('style.load', applyTerrain);

    // Apply immediately if style already loaded
    if (map.isStyleLoaded()) {
      applyTerrain();
    }

    return () => {
      map.off('style.load', applyTerrain);
    };
  }, [map, isLoaded, config]);

  // Persist config changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const toggle = useCallback(() => {
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const setExaggeration = useCallback((value: number) => {
    const clamped = Math.max(1, Math.min(3, value));
    setConfig((prev) => ({ ...prev, exaggeration: clamped }));
  }, []);

  const enable = useCallback(() => {
    setConfig((prev) => ({ ...prev, enabled: true }));
  }, []);

  const disable = useCallback(() => {
    setConfig((prev) => ({ ...prev, enabled: false }));
  }, []);

  return {
    config,
    toggle,
    setExaggeration,
    enable,
    disable,
    isSupported,
  };
}
