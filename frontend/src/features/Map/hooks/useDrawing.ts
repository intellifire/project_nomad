import { useEffect, useCallback, useState } from 'react';
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

/**
 * Hook for managing map drawing operations.
 *
 * NOTE: This is a stub implementation. The original implementation used
 * @mapbox/mapbox-gl-draw which is not compatible with MapLibre.
 *
 * TODO: Implement drawing functionality using a MapLibre-compatible library:
 * - Option 1: terra-draw (framework-agnostic, actively maintained)
 * - Option 2: maplibre-gl-draw (community fork)
 * - Option 3: Custom implementation using MapLibre GL JS directly
 *
 * For now, this provides the same API surface but drawing operations
 * are no-ops that log warnings.
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

  // Initialize when map is loaded
  useEffect(() => {
    if (!map || !isLoaded) return;

    setIsReady(true);

    // TODO: Initialize actual drawing library here
    console.warn('[useDrawing] Drawing functionality is stubbed. ' +
      'Implement using terra-draw or maplibre-gl-draw for MapLibre compatibility.');

    return () => {
      setIsReady(false);
    };
  }, [map, isLoaded]);

  const setMode = useCallback((mode: DrawingMode) => {
    setState((prev) => ({ ...prev, mode }));
    console.warn('[useDrawing] setMode called but drawing is not implemented');
  }, []);

  const getFeatures = useCallback((): DrawnFeature[] => {
    return state.features;
  }, [state.features]);

  const deleteSelected = useCallback(() => {
    if (state.selectedIds.length === 0) return;

    const deletedFeatures = state.features.filter(f => state.selectedIds.includes(String(f.id)));
    setState((prev) => ({
      ...prev,
      features: prev.features.filter(f => !state.selectedIds.includes(String(f.id))),
      selectedIds: [],
    }));
    options.onDelete?.(deletedFeatures);
  }, [state.selectedIds, state.features, options.onDelete]);

  const deleteAll = useCallback(() => {
    const deletedFeatures = [...state.features];
    setState((prev) => ({
      ...prev,
      features: [],
      selectedIds: [],
    }));
    options.onDelete?.(deletedFeatures);
  }, [state.features, options.onDelete]);

  const addFeatures = useCallback((features: DrawnFeature[]) => {
    // Assign IDs to features if they don't have them
    const featuresWithIds = features.map(f => ({
      ...f,
      id: f.id ?? `feature-${++featureIdCounter}`,
    }));

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
