/**
 * useRasterHover — raster burn-probability hover tooltip
 *
 * Reads pixel colour under the mouse via WebGL readPixels and maps it back
 * to a probability percentage using the FireSTARR colour ramp.  A MapLibre
 * popup is shown/hidden as the cursor moves over the map canvas.
 *
 * @module features/Map/hooks/useRasterHover
 */

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

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
// At 100% opacity (required for hover), raster colors are unblended
// so we can use a moderate threshold
const MAX_RAMP_DISTANCE = 70;

/**
 * Band labels matching the discrete 10-class FireSTARR ramp.
 * Index corresponds to RAMP entries.
 */
const BAND_LABELS = [
  '91-100%', '81-90%', '71-80%', '61-70%', '51-60%',
  '41-50%', '31-40%', '21-30%', '11-20%', '1-10%',
];

export function colorToPercentage(
  r: number,
  g: number,
  b: number,
  a?: number,
): string | null {
  // Fully transparent — no data
  if (a === 0) return null;

  // Reject very dark pixels (basemap shadows, labels)
  if (r < 20 && g < 20 && b < 20) return null;
  // Reject very bright pixels (white areas, clouds)
  if (r > 240 && g > 240 && b > 240) return null;

  // Find the nearest band — no interpolation, discrete classes only
  let minDist = Infinity;
  let minIdx = -1;
  for (let i = 0; i < RAMP.length; i++) {
    const [, ar, ag, ab] = RAMP[i];
    const dist = rgbDistance(r, g, b, ar, ag, ab);
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }

  if (minDist > MAX_RAMP_DISTANCE || minIdx < 0) return null;

  return BAND_LABELS[minIdx];
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Props for useRasterHover
 */
interface UseRasterHoverProps {
  /** MapLibre map instance */
  map: maplibregl.Map | null;
  /** Whether any raster layer has hover enabled (visible + 100% opacity) */
  hasVisibleRasterLayer: boolean;
}

/**
 * Hook that attaches a mousemove listener to the MapLibre canvas, reads the
 * pixel colour under the cursor using WebGL readPixels, and shows a MapLibre
 * popup displaying the burn probability percentage.
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
  const popupRef = useRef<maplibregl.Popup | null>(null);

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
    const gl = canvas.getContext('webgl2');

    // Initialise popup (lazy)
    if (!popupRef.current) {
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'raster-probability-popup',
      });
    }

    const popup = popupRef.current;

    function handleMouseMove(e: maplibregl.MapMouseEvent) {
      if (!gl) return;

      const pixel = new Uint8Array(4);
      const x = e.point.x;
      // WebGL y-axis is flipped relative to screen coordinates
      const y = canvas.height - e.point.y;

      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

      const [r, g, b, a] = pixel;
      const band = colorToPercentage(r, g, b, a);

      if (band !== null) {
        popup
          .setLngLat(e.lngLat)
          .setHTML(`<div style="color:#333;font-size:13px;padding:2px 4px"><strong>Burn Probability:</strong> ${band}</div>`)
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
