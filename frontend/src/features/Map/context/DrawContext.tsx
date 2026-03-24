import { createContext, useContext, ReactNode, useState, useCallback, useEffect, useRef } from 'react';
import { useMap } from './MapContext';
import type { DrawingMode, DrawnFeature, DrawingState } from '../types/geometry';

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

// Unique ID generator for features
let featureIdCounter = 0;

/**
 * Provides drawing functionality to child components.
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
 */
export function DrawProvider({ children }: DrawProviderProps) {
  const { map, isLoaded } = useMap();
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<DrawingState>({
    mode: 'none',
    selectedIds: [],
    features: [],
  });

  // Subscriber refs
  const createSubscribers = useRef<Set<(features: DrawnFeature[]) => void>>(new Set());
  const updateSubscribers = useRef<Set<(features: DrawnFeature[]) => void>>(new Set());
  const deleteSubscribers = useRef<Set<(features: DrawnFeature[]) => void>>(new Set());

  // Initialize when map is loaded
  useEffect(() => {
    if (!map || !isLoaded) return;

    setIsReady(true);

    // TODO: Initialize actual drawing library here
    console.warn('[DrawProvider] Drawing functionality is stubbed. ' +
      'Implement using terra-draw or maplibre-gl-draw for MapLibre compatibility.');

    return () => {
      setIsReady(false);
    };
  }, [map, isLoaded]);

  const setMode = useCallback((mode: DrawingMode) => {
    setState((prev) => ({ ...prev, mode }));
    console.warn('[DrawProvider] setMode called but drawing is not implemented');
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
    deleteSubscribers.current.forEach((cb) => cb(deletedFeatures));
  }, [state.selectedIds, state.features]);

  const deleteAll = useCallback(() => {
    const deletedFeatures = [...state.features];
    setState((prev) => ({
      ...prev,
      features: [],
      selectedIds: [],
    }));
    deleteSubscribers.current.forEach((cb) => cb(deletedFeatures));
  }, [state.features]);

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
    createSubscribers.current.forEach((cb) => cb(featuresWithIds));
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
