import { useEffect, useCallback, useState, useRef } from 'react';
import { TerraDraw, TerraDrawPointMode, TerraDrawLineStringMode, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import type { Map } from 'maplibre-gl';
import { useMap } from '../context/MapContext';
import type { DrawingMode, DrawnFeature, DrawingState, DrawingStyles } from '../types/geometry';

/**
 * Hook options
 */
interface UseDrawingOptions {
  /** Initial drawing mode */
  initialMode?: DrawingMode;
  /** Custom drawing styles */
  styles?: DrawingStyles;
  /** Callback when features are created */
  onCreate?: (features: DrawnFeature[]) => void;
  /** Callback when features are updated */
  onUpdate?: (features: DrawnFeature[]) => void;
  /** Callback when features are deleted */
  onDelete?: (features: DrawnFeature[]) => void;
  /** Callback when selection changes */
  onSelectionChange?: (features: DrawnFeature[]) => void;
}

/**
 * Hook return value
 */
interface UseDrawingReturn {
  /** Current drawing state */
  state: DrawingState;
  /** Set drawing mode */
  setMode: (mode: DrawingMode) => void;
  /** Get all drawn features */
  getFeatures: () => DrawnFeature[];
  /** Delete selected features */
  deleteSelected: () => void;
  /** Delete all features */
  deleteAll: () => void;
  /** Add features programmatically */
  addFeatures: (features: DrawnFeature[]) => void;
  /** Whether drawing is ready */
  isReady: boolean;
}

// Unique ID generator for features
let featureIdCounter = 0;

// Mode name mapping
const MODE_MAP: Record<DrawingMode, string> = {
  point: 'point',
  line: 'linestring',
  polygon: 'polygon',
  none: 'select',
};

/**
 * Hook for managing map drawing operations using TerraDraw.
 *
 * Uses terra-draw with the MapLibre GL adapter for cross-platform compatibility.
 *
 * @example
 * ```tsx
 * function DrawingComponent() {
 *   const { state, setMode, deleteSelected } = useDrawing({
 *     onCreate: (features) => console.log('Created:', features),
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={() => setMode('point')}>Point</button>
 *       <button onClick={() => setMode('polygon')}>Polygon</button>
 *       <button onClick={deleteSelected}>Delete</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDrawing(options: UseDrawingOptions = {}): UseDrawingReturn {
  const { map, isLoaded } = useMap();
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<DrawingState>({
    mode: options.initialMode || 'none',
    selectedIds: [],
    features: [],
  });

  // TerraDraw instance ref
  const terraDrawRef = useRef<TerraDraw | null>(null);

  // Initialize TerraDraw when map is loaded
  useEffect(() => {
    if (!map || !isLoaded) return;

    const adapter = new TerraDrawMapLibreGLAdapter({
      map: map as unknown as Map,
    });

    const draw = new TerraDraw({
      adapter,
      modes: [
        new TerraDrawPointMode(),
        new TerraDrawLineStringMode(),
        new TerraDrawPolygonMode(),
        new TerraDrawSelectMode(),
      ],
    });

    // Set up event listeners
    draw.on('finish', (id) => {
      const feature = draw.getSnapshotFeature(id);
      if (feature) {
        const drawnFeature = feature as unknown as DrawnFeature;
        setState((prev) => ({
          ...prev,
          features: [...prev.features, drawnFeature],
        }));
        options.onCreate?.([drawnFeature]);
      }
    });

    draw.on('change', (ids, type) => {
      if (type === 'delete') {
        const deletedFeatures = state.features.filter(f => ids.includes(String(f.id)));
        if (deletedFeatures.length > 0) {
          setState((prev) => ({
            ...prev,
            features: prev.features.filter(f => !ids.includes(String(f.id))),
            selectedIds: prev.selectedIds.filter(id => !ids.includes(String(id))),
          }));
          options.onDelete?.(deletedFeatures);
        }
      } else if (type === 'update') {
        const updatedFeatures: DrawnFeature[] = [];
        ids.forEach(id => {
          const feature = draw.getSnapshotFeature(id);
          if (feature) {
            updatedFeatures.push(feature as unknown as DrawnFeature);
          }
        });
        if (updatedFeatures.length > 0) {
          setState((prev) => ({
            ...prev,
            features: prev.features.map(f =>
              ids.includes(String(f.id))
                ? updatedFeatures.find(uf => String(uf.id) === String(f.id)) ?? f
                : f
            ),
          }));
          options.onUpdate?.(updatedFeatures);
        }
      }
    });

    draw.on('select', (id) => {
      setState((prev) => ({
        ...prev,
        selectedIds: [...prev.selectedIds, String(id)],
      }));
      options.onSelectionChange?.(state.features.filter(f => String(f.id) === String(id)));
    });

    draw.on('deselect', (id) => {
      setState((prev) => ({
        ...prev,
        selectedIds: prev.selectedIds.filter(sid => sid !== String(id)),
      }));
    });

    // Start TerraDraw
    draw.start();
    terraDrawRef.current = draw;
    setIsReady(true);

    return () => {
      draw.stop();
      terraDrawRef.current = null;
      setIsReady(false);
    };
  }, [map, isLoaded]);

  const setMode = useCallback((mode: DrawingMode) => {
    setState((prev) => ({ ...prev, mode }));
    if (terraDrawRef.current) {
      terraDrawRef.current.setMode(MODE_MAP[mode]);
    }
  }, []);

  const getFeatures = useCallback((): DrawnFeature[] => {
    if (!terraDrawRef.current) return [];
    return terraDrawRef.current.getSnapshot() as unknown as DrawnFeature[];
  }, []);

  const deleteSelected = useCallback(() => {
    if (!terraDrawRef.current || state.selectedIds.length === 0) return;

    const deletedFeatures = state.features.filter(f => state.selectedIds.includes(String(f.id)));
    terraDrawRef.current.removeFeatures(state.selectedIds.map(id => String(id)));
    setState((prev) => ({
      ...prev,
      selectedIds: [],
    }));
    options.onDelete?.(deletedFeatures);
  }, [state.selectedIds, state.features, options.onDelete]);

  const deleteAll = useCallback(() => {
    if (!terraDrawRef.current) return;

    const deletedFeatures = [...state.features];
    terraDrawRef.current.clear();
    setState((prev) => ({
      ...prev,
      features: [],
      selectedIds: [],
    }));
    options.onDelete?.(deletedFeatures);
  }, [state.features, options.onDelete]);

  const addFeatures = useCallback((features: DrawnFeature[]) => {
    if (!terraDrawRef.current) return;

    // Assign IDs to features if they don't have them
    const featuresWithIds = features.map(f => ({
      ...f,
      id: f.id ?? `feature-${++featureIdCounter}`,
    }));

    terraDrawRef.current.addFeatures(featuresWithIds as any[]);
    setState((prev) => ({
      ...prev,
      features: [...prev.features, ...featuresWithIds],
    }));
    options.onCreate?.(featuresWithIds);
  }, [options.onCreate]);

  return {
    state,
    setMode,
    getFeatures,
    deleteSelected,
    deleteAll,
    addFeatures,
    isReady,
  };
}
