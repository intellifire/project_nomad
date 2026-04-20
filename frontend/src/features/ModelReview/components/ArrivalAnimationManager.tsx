/**
 * ArrivalAnimationManager
 *
 * Self-contained orchestrator for the arrival-perimeter animation (refs #236):
 *
 *   1. Fetches the per-hour polygon FeatureCollection for the given model
 *      from GET /api/v1/models/:id/arrival-perimeters when the user opens
 *      the animation.
 *   2. Adds a GeoJSON source + fill + line layers to the MapLibre map with
 *      a filter on `offsetHours` so nothing renders initially.
 *   3. Renders ArrivalAnimationPlayer; its onFrameChange updates the layer
 *      filter to `offsetHours <= currentFrame` for a growing-fire effect.
 *   4. Cleans up the source + layers on close or unmount.
 *
 * Intentionally bypasses the broader LayerContext — this is MVP scope for
 * #236; a follow-up can fold the animation into the main layer pipeline.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ExpressionSpecification } from 'maplibre-gl';
import { useMap } from '../../Map';
import { ArrivalAnimationPlayer } from './ArrivalAnimationPlayer.js';
import type { ArrivalPerimeterFeatureCollection } from '../utils/arrivalAnimation.js';

export interface ArrivalAnimationManagerProps {
  modelId: string;
  /** Override for tests. */
  fetchImpl?: typeof fetch;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const toggleButtonStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: '6px 12px',
  border: '1px solid #2e86c1',
  background: '#2e86c1',
  color: 'white',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
};

const closeButtonStyle: React.CSSProperties = {
  alignSelf: 'flex-end',
  padding: '4px 10px',
  border: '1px solid #bdc3c7',
  background: '#ecf0f1',
  color: '#333',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};

const statusStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#555',
};

const errorStyle: React.CSSProperties = {
  ...statusStyle,
  color: '#c0392b',
};

export function ArrivalAnimationManager({ modelId, fetchImpl }: ArrivalAnimationManagerProps) {
  const { map, isLoaded } = useMap();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ArrivalPerimeterFeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const layersAddedRef = useRef(false);

  const sourceId = `arrival-animation-${modelId}`;
  const fillLayerId = `${sourceId}-fill`;
  const lineLayerId = `${sourceId}-line`;

  const loadData = useCallback(async () => {
    const doFetch = fetchImpl ?? fetch;
    setLoading(true);
    setError(null);
    try {
      const resp = await doFetch(`/api/v1/models/${modelId}/arrival-perimeters`);
      if (!resp.ok) throw new Error(`Failed to load animation (HTTP ${resp.status})`);
      const json = (await resp.json()) as ArrivalPerimeterFeatureCollection;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load animation');
    } finally {
      setLoading(false);
    }
  }, [modelId, fetchImpl]);

  // Add map source + layers once we have data and the map is ready.
  useEffect(() => {
    if (!open || !data || !map || !isLoaded) return;
    if (layersAddedRef.current) return;

    const initialFilter: ExpressionSpecification = [
      '<=',
      ['get', 'offsetHours'],
      0,
    ];

    map.addSource(sourceId, {
      type: 'geojson',
      data: data as unknown as GeoJSON.FeatureCollection,
    });
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: { 'fill-color': '#d73027', 'fill-opacity': 0.25 },
      filter: initialFilter,
    });
    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: { 'line-color': '#a50026', 'line-width': 1 },
      filter: initialFilter,
    });
    layersAddedRef.current = true;

    return () => {
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      layersAddedRef.current = false;
    };
  }, [open, data, map, isLoaded, sourceId, fillLayerId, lineLayerId]);

  const handleFrameChange = useCallback(
    (offsetHours: number) => {
      if (!map) return;
      const filter: ExpressionSpecification = [
        '<=',
        ['get', 'offsetHours'],
        offsetHours,
      ];
      if (map.getLayer(fillLayerId)) map.setFilter(fillLayerId, filter);
      if (map.getLayer(lineLayerId)) map.setFilter(lineLayerId, filter);
    },
    [map, fillLayerId, lineLayerId],
  );

  const handleOpen = useCallback(() => {
    setOpen(true);
    if (!data && !loading) void loadData();
  }, [data, loading, loadData]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  if (!open) {
    return (
      <button type="button" style={toggleButtonStyle} onClick={handleOpen}>
        Play Animation
      </button>
    );
  }

  return (
    <div style={containerStyle}>
      <button type="button" style={closeButtonStyle} onClick={handleClose}>
        Close animation
      </button>
      {loading && <div style={statusStyle}>Loading animation…</div>}
      {error && (
        <div role="alert" style={errorStyle}>
          {error}
        </div>
      )}
      {data && !error && <ArrivalAnimationPlayer data={data} onFrameChange={handleFrameChange} />}
    </div>
  );
}
