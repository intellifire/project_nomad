/**
 * useRasterHover — raster burn-probability hover tooltip
 *
 * Reads pixel colour under the mouse via WebGL readPixels and maps it back
 * to a probability percentage using the FireSTARR colour ramp.  A Mapbox
 * popup is shown/hidden as the cursor moves over the map canvas.
 *
 * @module features/Map/hooks/useRasterHover
 */

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

// =============================================================================
// FireSTARR Colour Ramp
// =============================================================================

/**
 * Ordered anchor points of the FireSTARR burn-probability colour ramp.
 * Each entry is [percentage, r, g, b].
 * The array is sorted from highest to lowest probability.
 */
/**
 * FireSTARR 10-class discrete colour ramp — matches ContourGenerator.ts
 * and RasterLegend.tsx. Each entry is [midpoint%, R, G, B].
 */
const RAMP: ReadonlyArray<readonly [number, number, number, number]> = [
  [95, 230, 21, 31],    // 91-100% crimson
  [85, 235, 51, 38],    // 81-90%  dark red
  [75, 238, 79, 44],    // 71-80%  red
  [65, 240, 108, 51],   // 61-70%  red-orange
  [55, 242, 137, 56],   // 51-60%  dark orange
  [45, 245, 162, 61],   // 41-50%  orange
  [35, 250, 192, 68],   // 31-40%  light orange
  [25, 252, 223, 75],   // 21-30%  yellow
  [15, 250, 246, 142],  // 11-20%  light yellow
  [5,  76, 175, 80],    // 1-10%   green
] as const;

/** Euclidean distance between two RGB colours. */
function rgbDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  return Math.sqrt(
    (r1 - r2) ** 2 +
    (g1 - g2) ** 2 +
    (b1 - b2) ** 2,
  );
}

/**
 * Maximum colour distance (Euclidean RGB) considered to be "on the ramp".
 *
 * The largest gap between adjacent ramp anchors is ~179 units (yellow-green
 * to green), so a midpoint colour is up to ~90 units from its nearest anchor.
 * Setting the threshold to 130 keeps midpoint interpolation working while
 * firmly rejecting background colours (black ~255, white ~224, blue ~360).
 */
const MAX_RAMP_DISTANCE = 45;

/**
 * Map an RGB pixel from a FireSTARR raster tile to its burn-probability
 * percentage.
 *
 * The function linearly interpolates between the two nearest anchor points
 * on the colour ramp so intermediate hues resolve to intermediate percentages.
 * Colours that do not resemble any ramp colour (background, no-data, etc.)
 * return `null`.
 *
 * @param r - Red channel (0–255)
 * @param g - Green channel (0–255)
 * @param b - Blue channel (0–255)
 * @param a - Alpha channel (0–255). When 0 the pixel is transparent → null.
 * @returns Probability percentage (10–90) or null when the colour is not on
 *          the ramp.
 */
export function colorToPercentage(
  r: number,
  g: number,
  b: number,
  a?: number,
): number | null {
  // Fully transparent — no data
  if (a === 0) return null;

  // Reject very dark pixels (basemap shadows, labels)
  if (r < 20 && g < 20 && b < 20) return null;
  // Reject very bright pixels (white areas, clouds)
  if (r > 240 && g > 240 && b > 240) return null;


  // Find the two closest anchor points
  const distances = RAMP.map(([pct, ar, ag, ab]) => ({
    pct,
    dist: rgbDistance(r, g, b, ar, ag, ab),
  }));

  distances.sort((x, y) => x.dist - y.dist);
  const nearest = distances[0];
  const second = distances[1];

  // Reject colours that are too far from the ramp (background / no-data)
  if (nearest.dist > MAX_RAMP_DISTANCE) return null;

  // Exact match (or near-exact)
  if (nearest.dist === 0) return nearest.pct;

  // Linear interpolation weighted by inverse distance
  const totalDist = nearest.dist + second.dist;
  if (totalDist === 0) return nearest.pct;

  const weight = nearest.dist / totalDist;      // 0 = exactly on nearest
  const interpolated =
    nearest.pct * (1 - weight) + second.pct * weight;

  return Math.round(interpolated);
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Props for useRasterHover
 */
interface UseRasterHoverProps {
  /** Mapbox map instance */
  map: mapboxgl.Map | null;
  /** Whether any raster layer is currently visible */
  hasVisibleRasterLayer: boolean;
}

/**
 * Hook that attaches a mousemove listener to the Mapbox canvas, reads the
 * pixel colour under the cursor using WebGL readPixels, and shows a popup
 * displaying the burn probability percentage.
 *
 * The popup is removed when the cursor leaves the canvas or when no visible
 * raster layers are present.
 *
 * @example
 * ```tsx
 * useRasterHover({ map, hasVisibleRasterLayer: rasterLayers.some(l => l.visible) });
 * ```
 */
export function useRasterHover({
  map,
  hasVisibleRasterLayer,
}: UseRasterHoverProps): void {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map || !hasVisibleRasterLayer) {
      // Clean up any lingering popup
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      return;
    }

    const canvas = map.getCanvas();
    const gl = canvas.getContext('webgl') ?? canvas.getContext('webgl2');

    // Initialise popup (lazy)
    if (!popupRef.current) {
      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'raster-probability-popup',
      });
    }

    const popup = popupRef.current;

    // Get raster layer IDs from the map style to check cursor overlap
    function isOverRasterLayer(_point: mapboxgl.Point): boolean {
      // Check if any of our raster sources have tiles at this location
      const style = map!.getStyle();
      if (!style?.layers) return false;
      for (const layer of style.layers) {
        if (layer.type === 'raster' && layer.source && typeof layer.source === 'string') {
          // Check if this is one of our layers (not basemap)
          const source = map!.getSource(layer.source);
          if (source && source.type === 'raster' && 'tiles' in (source as any).serialize()) {
            // Our raster tile layers have /api/v1/ in their tile URLs
            const serialized = (source as any).serialize();
            const tiles = serialized.tiles || [];
            if (tiles.some((t: string) => t.includes('/api/v1/'))) {
              return true;
            }
          }
        }
      }
      return false;
    }

    function handleMouseMove(e: mapboxgl.MapMouseEvent) {
      if (!gl) return;

      // Only show tooltip when cursor is over our raster layers
      if (!isOverRasterLayer(e.point)) {
        popup.remove();
        return;
      }

      const pixel = new Uint8Array(4);
      const x = e.point.x;
      // WebGL y-axis is flipped relative to screen coordinates
      const y = canvas.height - e.point.y;

      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

      const [r, g, b, a] = pixel;
      const pct = colorToPercentage(r, g, b, a);

      if (pct !== null) {
        popup
          .setLngLat(e.lngLat)
          .setHTML(`<div style="color:#333;font-size:13px;padding:2px 4px"><strong>Burn Probability:</strong> ${pct}%</div>`)
          .addTo(map!);
      } else {
        popup.remove();
      }
    }

    function handleMouseLeave() {
      popup.remove();
    }

    map.on('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      map.off('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      popup.remove();
    };
  }, [map, hasVisibleRasterLayer]);
}
