# MapLibre Migration Notebook

**Project:** Project Nomad
**Branch:** `MapLibre`
**Created:** 2026-03-24
**Status:** Complete - Drawing Implemented with TerraDraw

---

## Overview

Migration from Mapbox GL JS to MapLibre GL JS to achieve:
- Open-source compliance (no Mapbox v2+ token-based licensing)
- Self-hosting capability without API keys
- Community-driven development model

---

## Completed Work

### Phase 1: Dependencies ✅
- [x] Removed `mapbox-gl@^3.16.0`
- [x] Removed `@mapbox/mapbox-gl-draw@^1.5.1`
- [x] Removed `@types/mapbox-gl` and `@types/mapbox__mapbox-gl-draw`
- [x] Added `maplibre-gl@^5.3.0`
- [x] Updated `vite.lib.config.ts` externals and globals

### Phase 2: Core Map Components ✅
- [x] `MapContainer.tsx` - Map initialization, navigation controls
- [x] `MapContext.tsx` - Type imports updated
- [x] `MapContextMenu.tsx` - Event type imports
- [x] `MapInfoControl.tsx` - Event type imports
- [x] `MapCapture.tsx` - CSS class selector updated

### Phase 3: Basemap URLs ✅
Changed from Mapbox proprietary URLs to CartoDB (open source):

| Style | Old (Mapbox) | New (CartoDB) |
|-------|-------------|---------------|
| Streets | `mapbox://styles/mapbox/streets-v11` | `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` |
| Satellite | `mapbox://styles/mapbox/satellite-streets-v12` | ArcGIS (placeholder) |
| Outdoors | `mapbox://styles/mapbox/outdoors-v12` | `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json` |

### Phase 4: Layer Management ✅
- [x] `LayerContext.tsx` - Popup type imports
- [x] `useLayers.ts` - Event type imports
- [x] `useRasterHover.ts` - Map and Popup type imports

### Phase 5: Model Review ✅
- [x] `OutputPreviewModal.tsx` - Map initialization and style URL

### Phase 6: TypeScript Fixes ✅
- [x] Fixed `attributionControl` type (now uses `{ compact: true }`)
- [x] Fixed unused imports
- [x] All TypeScript compilation passes (`tsc --noEmit`)

---

## Known Limitations

### Drawing Functionality ✅
**Status:** Implemented with TerraDraw

**Files:**
- `frontend/src/features/Map/context/DrawContext.tsx` - TerraDraw with MapLibre adapter
- `frontend/src/features/Map/hooks/useDrawing.ts` - TerraDraw implementation

**Features:**
- Point drawing (single ignition)
- Line drawing (fire line ignition)
- Polygon drawing (area ignition)
- Selection and deletion
- Event callbacks (create, update, delete)

**Dependencies:**
- `terra-draw@^1.26.0`
- `terra-draw-maplibre-gl-adapter@^1.3.0`

### Terrain Visualization (Disabled) ⚠️
**Status:** Disabled in `useTerrain.ts` and `MapContainer.tsx`

**Reason:** Mapbox DEM source requires token

**Files Affected:**
- `frontend/src/features/Map/hooks/useTerrain.ts`
- `frontend/src/features/Map/components/MapContainer.tsx`

**Solutions to Consider:**
1. **MapTiler Terrain** - `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=YOUR_KEY`
2. **Cesium World Terrain** - Requires integration
3. **Self-hosted DEM** - Canada elevation data

---

## File Changes Summary

```
frontend/package.json                           | Dependencies
frontend/vite.lib.config.ts                     | Build config
frontend/src/features/Map/types/index.ts         | Types & basemap URLs
frontend/src/features/Map/context/MapContext.tsx | Type imports
frontend/src/features/Map/context/DrawContext.tsx| Stubbed implementation
frontend/src/features/Map/context/LayerContext.tsx| Type imports
frontend/src/features/Map/components/MapContainer.tsx| Init & controls
frontend/src/features/Map/components/MapContextMenu.tsx| Event types
frontend/src/features/Map/components/MapInfoControl.tsx| Event types
frontend/src/features/Map/components/MapCapture.tsx| CSS class
frontend/src/features/Map/hooks/useDrawing.ts    | Stubbed implementation
frontend/src/features/Map/hooks/useLayers.ts     | Event types
frontend/src/features/Map/hooks/useRasterHover.ts| Type imports
frontend/src/features/Map/hooks/useTerrain.ts    | Disabled
frontend/src/features/ModelReview/components/OutputPreviewModal.tsx| Init
```

---

## Testing Status

| Test Category | Status | Notes |
|---------------|--------|-------|
| TypeScript Compilation | ✅ Pass | `tsc --noEmit` clean |
| Unit Tests | ⚠️ Mixed | Pre-existing failures in RasterLegend, ModelReviewPanel |
| E2E Tests | ❓ Unknown | Not run |
| Manual - Map Load | ❓ Unknown | Needs verification |
| Manual - Drawing | ❌ Broken | Expected (stubbed) |
| Manual - Terrain | ❌ Broken | Expected (disabled) |

---

## Next Steps

### Priority 1: Drawing Implementation
1. Evaluate `terra-draw` vs `maplibre-gl-draw`
2. Implement chosen solution
3. Maintain same API surface for backward compatibility
4. Test point, line, polygon drawing modes

### Priority 2: Terrain Configuration
1. Evaluate DEM source options
2. Configure terrain visualization
3. Test terrain toggle and exaggeration

### Priority 3: Testing
1. Manual testing of map functionality
2. Fix or update broken unit tests
3. Run E2E test suite

---

## Environment Variables

### Removed (no longer needed):
- `VITE_MAPBOX_TOKEN` - MapLibre doesn't require tokens for open tile sources

### Still Required:
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_AUTH_MODE` - Authentication mode

---

## References

- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)
- [CartoDB Basemaps](https://github.com/CartoDB/basemap-styles)
- [Terra Draw](https://github.com/JamesLMilner/terra-draw)
- [MapLibre GL Draw](https://github.com/maplibre/maplibre-gl-draw)

---

## Git Commit

```
commit 0ebb5b0
Author: Claude Opus 4.6
Date:   2026-03-24

migrate: Replace Mapbox GL with MapLibre GL

Core changes:
- Replace mapbox-gl dependency with maplibre-gl (^5.3.0)
- Update all imports from 'mapbox-gl' to 'maplibre-gl'
- Remove @mapbox/mapbox-gl-draw dependency
- Update vite.lib.config.ts externals and globals
- Update basemap URLs to use CartoDB (no API key required)

Map components updated:
- MapContainer.tsx: Map initialization, navigation controls
- MapContext.tsx: Type imports
- MapContextMenu.tsx: Event type imports
- MapInfoControl.tsx: Event type imports
- MapCapture.tsx: CSS class selector (maplibregl-ctrl)

Drawing functionality:
- DrawContext.tsx: Stubbed (MapboxDraw not compatible)
- useDrawing.ts: Stubbed implementation

Layer management:
- LayerContext.tsx: Popup type imports
- useLayers.ts: Event type imports
- useRasterHover.ts: Map and Popup type imports

Other updates:
- useTerrain.ts: Disabled (Mapbox DEM not compatible)
- OutputPreviewModal.tsx: Map initialization and style URL
- types/index.ts: Basemap URLs and type imports

Breaking changes:
- Drawing functionality is stubbed and needs reimplementation
- Terrain disabled until compatible DEM source configured
- VITE_MAPBOX_TOKEN no longer required

TODO:
- Implement drawing using terra-draw or maplibre-gl-draw
- Configure DEM source for terrain (MapTiler or self-hosted)
```

---

*Last Updated: 2026-03-24*
