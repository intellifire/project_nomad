import { createContext, useContext, ReactNode, useState, useCallback, useEffect, useRef } from 'react';
import { TerraDraw, TerraDrawPointMode, TerraDrawLineStringMode, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import type { GeoJSONStoreFeatures } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import { useMap } from './MapContext';
import type { DrawingMode, DrawnFeature, DrawingState } from '../types/geometry';

/**
 * Convert a TerraDraw store feature to our DrawnFeature type.
 * Both are GeoJSON Features with Point/LineString/Polygon geometry —
 * the only difference is the properties type constraint.
 */
function toDrawnFeature(feature: GeoJSONStoreFeatures): DrawnFeature {
  return feature as DrawnFeature;
}

function toDrawnFeatures(features: GeoJSONStoreFeatures[]): DrawnFeature[] {
  return features as DrawnFeature[];
}

/**
 * Draw context value
 */
interface DrawContextValue {
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
  /** Register a callback for create events */
  onCreateSubscribe: (callback: (features: DrawnFeature[]) => void) => () => void;
  /** Register a callback for update events */
  onUpdateSubscribe: (callback: (features: DrawnFeature[]) => void) => () => void;
  /** Register a callback for delete events */
  onDeleteSubscribe: (callback: (features: DrawnFeature[]) => void) => () => void;
}

const DrawContext = createContext<DrawContextValue | null>(null);

/**
 * Props for DrawProvider
 */
interface DrawProviderProps {
  children: ReactNode;
}

// Mode name mapping
const MODE_MAP: Record<DrawingMode, string> = {
  point: 'point',
  line: 'linestring',
  polygon: 'polygon',
  none: 'select',
};

/**
 * Provides drawing functionality to child components using TerraDraw.
 *
 * Uses terra-draw with the MapLibre GL adapter for cross-platform compatibility.
 */
export function DrawProvider({ children }: DrawProviderProps) {
  const { map, isLoaded } = useMap();
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<DrawingState>({
    mode: 'none',
    selectedIds: [],
    features: [],
  });

  // TerraDraw instance ref
  const terraDrawRef = useRef<TerraDraw | null>(null);

  // Ref to avoid stale closure in event handlers
  const featuresRef = useRef<DrawnFeature[]>(state.features);
  useEffect(() => {
    featuresRef.current = state.features;
  }, [state.features]);

  // Subscriber refs
  const createSubscribers = useRef<Set<(features: DrawnFeature[]) => void>>(new Set());
  const updateSubscribers = useRef<Set<(features: DrawnFeature[]) => void>>(new Set());
  const deleteSubscribers = useRef<Set<(features: DrawnFeature[]) => void>>(new Set());

  // Initialize TerraDraw when map is loaded
  useEffect(() => {
    if (!map || !isLoaded) return;

    const adapter = new TerraDrawMapLibreGLAdapter({
      map,
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
        const drawnFeature = toDrawnFeature(feature);
        setState((prev) => ({
          ...prev,
          features: [...prev.features, drawnFeature],
        }));
        createSubscribers.current.forEach((cb) => cb([drawnFeature]));
      }
    });

    draw.on('change', (ids, type) => {
      if (type === 'delete') {
        const deletedFeatures = featuresRef.current.filter(f => ids.includes(String(f.id)));
        if (deletedFeatures.length > 0) {
          setState((prev) => ({
            ...prev,
            features: prev.features.filter(f => !ids.includes(String(f.id))),
            selectedIds: prev.selectedIds.filter(id => !ids.includes(String(id))),
          }));
          deleteSubscribers.current.forEach((cb) => cb(deletedFeatures));
        }
      } else if (type === 'update') {
        const updatedFeatures: DrawnFeature[] = [];
        ids.forEach(id => {
          const feature = draw.getSnapshotFeature(id);
          if (feature) {
            updatedFeatures.push(toDrawnFeature(feature));
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
          updateSubscribers.current.forEach((cb) => cb(updatedFeatures));
        }
      }
    });

    draw.on('select', (id) => {
      setState((prev) => {
        const idStr = String(id);
        if (prev.selectedIds.includes(idStr)) return prev;
        return { ...prev, selectedIds: [...prev.selectedIds, idStr] };
      });
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
    return toDrawnFeatures(terraDrawRef.current.getSnapshot());
  }, []);

  const deleteSelected = useCallback(() => {
    if (!terraDrawRef.current || state.selectedIds.length === 0) return;

    const deletedFeatures = state.features.filter(f => state.selectedIds.includes(String(f.id)));
    terraDrawRef.current.removeFeatures(state.selectedIds.map(id => String(id)));
    setState((prev) => ({
      ...prev,
      features: prev.features.filter(f => !prev.selectedIds.includes(String(f.id))),
      selectedIds: [],
    }));
    deleteSubscribers.current.forEach((cb) => cb(deletedFeatures));
  }, [state.selectedIds, state.features]);

  const deleteAll = useCallback(() => {
    if (!terraDrawRef.current) return;

    const deletedFeatures = [...state.features];
    terraDrawRef.current.clear();
    setState((prev) => ({
      ...prev,
      features: [],
      selectedIds: [],
    }));
    deleteSubscribers.current.forEach((cb) => cb(deletedFeatures));
  }, [state.features]);

  const addFeatures = useCallback((features: DrawnFeature[]) => {
    if (!terraDrawRef.current) return;

    const storeFeatures = features as GeoJSONStoreFeatures[];
    terraDrawRef.current.addFeatures(storeFeatures);
    setState((prev) => ({
      ...prev,
      features: [...prev.features, ...features],
    }));
    createSubscribers.current.forEach((cb) => cb(features));
  }, []);

  const onCreateSubscribe = useCallback((callback: (features: DrawnFeature[]) => void) => {
    createSubscribers.current.add(callback);
    return () => { createSubscribers.current.delete(callback); };
  }, []);

  const onUpdateSubscribe = useCallback((callback: (features: DrawnFeature[]) => void) => {
    updateSubscribers.current.add(callback);
    return () => { updateSubscribers.current.delete(callback); };
  }, []);

  const onDeleteSubscribe = useCallback((callback: (features: DrawnFeature[]) => void) => {
    deleteSubscribers.current.add(callback);
    return () => { deleteSubscribers.current.delete(callback); };
  }, []);

  const value: DrawContextValue = {
    state,
    setMode,
    getFeatures,
    deleteSelected,
    deleteAll,
    addFeatures,
    isReady,
    onCreateSubscribe,
    onUpdateSubscribe,
    onDeleteSubscribe,
  };

  return (
    <DrawContext.Provider value={value}>
      {children}
    </DrawContext.Provider>
  );
}

/**
 * Hook to access the shared draw context.
 *
 * @throws Error if used outside of DrawProvider
 */
export function useDraw(): DrawContextValue {
  const context = useContext(DrawContext);
  if (!context) {
    throw new Error('useDraw must be used within a DrawProvider');
  }
  return context;
}

/**
 * Optional version of useDraw that returns null if no provider.
 *
 * Use this when the component may be rendered outside of DrawProvider,
 * such as when embedded in a host application that provides its own map.
 */
export function useDrawOptional(): DrawContextValue | null {
  return useContext(DrawContext);
}
