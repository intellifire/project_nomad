/**
 * RasterLegend — burn probability colour-ramp legend overlay
 *
 * Renders a semi-transparent legend in the bottom-left corner of the map
 * whenever at least one raster layer is visible.  Uses the same FireSTARR
 * colour ramp as useRasterHover so the two are always in sync.
 *
 * Inline styles only — no external CSS classes.
 *
 * @module features/Map/components/RasterLegend
 */

import React from 'react';
import { useLayers } from '../context/LayerContext.js';

// =============================================================================
// Colour Ramp Definition
// =============================================================================

interface LegendEntry {
  label: string;
  color: string;
}

/**
 * FireSTARR probability colour ramp — matches the discrete 10-class
 * symbology from the tile server (ContourGenerator.ts color table).
 * Source: FireSTARR QML probability_processing_7pct.qml
 */
const LEGEND_ENTRIES: LegendEntry[] = [
  { label: '91-100%', color: 'rgb(230, 21, 31)' },
  { label: '81-90%',  color: 'rgb(235, 51, 38)' },
  { label: '71-80%',  color: 'rgb(238, 79, 44)' },
  { label: '61-70%',  color: 'rgb(240, 108, 51)' },
  { label: '51-60%',  color: 'rgb(242, 137, 56)' },
  { label: '41-50%',  color: 'rgb(245, 162, 61)' },
  { label: '31-40%',  color: 'rgb(250, 192, 68)' },
  { label: '21-30%',  color: 'rgb(252, 223, 75)' },
  { label: '11-20%',  color: 'rgb(250, 246, 142)' },
  { label: '1-10%',   color: 'rgb(0, 177, 242)' },
];

// =============================================================================
// Styles
// =============================================================================

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '40px',
  right: '180px',
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  borderRadius: '4px',
  padding: '8px 12px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  zIndex: 10,
  minWidth: '140px',
  pointerEvents: 'none',
};

const titleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#333',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px',
};

const swatchStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  borderRadius: '2px',
  border: '1px solid rgba(0,0,0,0.15)',
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#444',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Map legend showing the FireSTARR burn probability colour ramp.
 *
 * Reads visible raster layers from LayerContext and renders only when at least
 * one is visible.  Position is bottom-left to stay clear of navigation
 * controls (top-right) and the layer panel (right).
 */
export function RasterLegend() {
  const { state } = useLayers();

  const hasVisibleRaster = state.layers.some(
    (layer) => layer.type === 'raster' && layer.visible,
  );

  if (!hasVisibleRaster) return null;

  return (
    <aside role="complementary" style={containerStyle}>
      <div style={titleStyle}>Burn Probability</div>
      {LEGEND_ENTRIES.map(({ label, color }) => (
        <div key={label} style={rowStyle}>
          <div
            data-testid="legend-swatch"
            style={{ ...swatchStyle, backgroundColor: color }}
          />
          <span style={labelStyle}>{label}</span>
        </div>
      ))}
    </aside>
  );
}
