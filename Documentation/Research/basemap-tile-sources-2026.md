# Basemap Tile Sources for MapLibre GL JS (2026)

Research for Project Nomad — wildfire analysis, Canadian boreal forest context.

---

## Summary Recommendation

| Use Case | Provider | Key Required | Style JSON |
|----------|----------|-------------|------------|
| **Streets** | OpenFreeMap (Liberty) | No | `https://tiles.openfreemap.org/styles/liberty` |
| **Satellite** | Esri World Imagery + Esri Reference Labels | No | Raster XYZ (see below) |
| **Outdoors/Topo** | Stadia Maps (Stamen Terrain) | No (localhost), Yes (production) | `https://tiles.stadiamaps.com/styles/stamen_terrain.json` |
| **Outdoors/Topo alt** | MapTiler Outdoor | Yes (free tier) | `https://api.maptiler.com/maps/outdoor/style.json?key=KEY` |

---

## Provider Details

### 1. OpenFreeMap — STRONGLY RECOMMENDED (Streets)

- **API key**: No. Zero. No registration, no user database, no cookies.
- **Style JSON (MapLibre native)**:
  - `https://tiles.openfreemap.org/styles/liberty` — full-featured OSM vector style
  - `https://tiles.openfreemap.org/styles/bright` — cleaner/minimal
  - `https://tiles.openfreemap.org/styles/positron` — light grey reference
- **Limits**: No limits on tile views or requests. Donation-supported.
- **Quality**: Excellent. Vector tiles, fully MapLibre compatible, weekly planet updates from OSM.
- **Attribution**: `© OpenMapTiles © OpenStreetMap contributors`
- **Wildfire relevance**: Good reference map. Shows roads, settlements, water bodies. Not topo.
- **Verdict**: Best free streets option. Replace CartoDB Positron with this.

---

### 2. Stadia Maps (Stamen Terrain) — BEST TOPO OPTION

- **API key**: Not required for localhost development. Required for production (custom domain).
  - Confirmed: `https://tiles.stadiamaps.com/styles/stamen_terrain.json` returns HTTP 200 without a key.
  - Production use requires a free Stadia account and domain registration.
- **Free tier**: Generous — 200,000 tile requests/month on free plan.
- **Style JSON**: `https://tiles.stadiamaps.com/styles/stamen_terrain.json`
- **Other styles**:
  - `https://tiles.stadiamaps.com/styles/stamen_toner.json` — high-contrast B&W
  - `https://tiles.stadiamaps.com/styles/stamen_watercolor.json` — artistic
  - `https://tiles.stadiamaps.com/styles/outdoors.json` — Stadia Outdoors
- **Quality**: Excellent for wildfire work. Stamen Terrain shows:
  - Terrain shading / hillshade
  - Contour lines
  - Landcover (forest, wetland, water)
  - Wilderness detail
  - Road network with labels
- **Attribution**: `Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL.`
- **Note**: Stamen Maps moved to Stadia in 2023. Old `stamen.com` tile URLs are dead.
- **Verdict**: Best available free topo option for boreal forest wildfire analysis. Use this.

---

### 3. MapTiler — Best Paid-Free Option (Topo + Satellite)

- **API key**: Required. Free tier available at `https://cloud.maptiler.com/account/keys/`
- **Free tier**: ~100,000 map loads/month (tile requests are bundled per view).
- **Style JSON**:
  - Outdoor/Topo: `https://api.maptiler.com/maps/outdoor/style.json?key=YOUR_KEY`
  - Topo (detailed): `https://api.maptiler.com/maps/topo/style.json?key=YOUR_KEY`
  - Satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=YOUR_KEY` (satellite + labels)
  - Streets: `https://api.maptiler.com/maps/streets/style.json?key=YOUR_KEY`
- **Quality**: Professional grade. Outdoor style includes terrain, contours, landcover.
- **Wildfire relevance**: Very high. The `topo` style is arguably the best publicly available topo map for forestry work — includes detailed contours and terrain shading.
- **Attribution**: `© MapTiler © OpenStreetMap contributors`
- **Verdict**: If you can accept an API key, MapTiler free tier is excellent. Hybrid style solves the satellite+labels problem cleanly.

---

### 4. Thunderforest — Outdoors/Landscape Styles

- **API key**: Required. Free tier available.
- **Free tier**: 150,000 tile requests/month (raster tiles only).
- **Tile URL template** (raster XYZ, NOT MapLibre style JSON):
  - `https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=YOUR_KEY`
  - `https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=YOUR_KEY`
- **MapLibre integration**: Use as a raster source, not a style JSON. Wrap in a custom MapLibre style.
- **Quality**: Outdoors style is specifically designed for hiking/wilderness — contours, terrain, trail network. Good for wildfire contexts.
- **Wildfire relevance**: High for the Outdoors/Landscape styles.
- **Verdict**: Viable option but raster-only (no vector). Lower resolution than vector alternatives at close zoom. Requires API key.

---

### 5. Esri World Imagery + Reference Labels — RECOMMENDED (Satellite)

- **API key**: No API key required for public tile access.
- **Satellite tile URL** (raster XYZ):
  ```
  https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
  ```
- **Labels overlay** (raster XYZ — confirmed HTTP 200):
  ```
  https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}
  ```
- **Integration**: Build a custom MapLibre style that layers satellite raster source under a labels raster source. No vector style JSON from Esri.
- **Quality**: Esri World Imagery is among the best free satellite sources. Covers boreal Canada well.
- **Attribution**: `Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community`
- **Verdict**: Best free satellite. Stack labels on top manually. This is the standard approach.

---

### 6. Protomaps — PMTiles-Based Self-Hostable Basemap

- **API key**: API CDN (`api.protomaps.com`) requires a key. Self-hosting does not.
- **CDN**: `https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=YOUR_KEY`
- **Self-host**: Download the planet `.pmtiles` file and serve locally or via CDN — completely free.
- **MapLibre styles**: Available via npm (`@protomaps/basemaps`) or as JSON exports. Multiple themes: light, dark, white, grayscale, black.
- **Quality**: Solid OSM-based vector tiles. Good for custom styling. No topo/terrain built in.
- **Wildfire relevance**: Low for built-in styles (no terrain). High if you self-host and combine with terrain layers.
- **Verdict**: Best option if you want full control and self-hosting. Not a quick drop-in topo solution.

---

### 7. VersaTiles — FLOSS, No API Key

- **API key**: None. No fees, no tracking, no vendor lock-in.
- **Tile server**: `https://tiles.versatiles.org`
- **Styles**: Provided via `versatiles-style` JavaScript library. No direct stable style JSON URL for MapLibre (use the JS library).
- **Quality**: Solid OSM vector tiles, designed for newsrooms/NGOs. No terrain.
- **Wildfire relevance**: Low — streets/reference only, no topo.
- **Verdict**: Good ethics-first alternative to OpenFreeMap for streets. No topo capability.

---

### 8. OpenTopoMap — Raster Topo, No API Key

- **API key**: None required.
- **Tile URL**: `https://opentopomap.org/{z}/{x}/{y}.png`
- **MapLibre integration**: Raster source only — no style JSON.
- **Quality**: Genuine topographic style based on SRTM elevation data + OSM. Contours, terrain shading, summit labels. Designed to look like printed topo maps.
- **Note**: Their site states "vector tiles coming soon" — currently raster only.
- **Usage policy**: Tile Usage Policy applies — personal/low-volume use OK, bulk/commercial use should contact them.
- **Wildfire relevance**: High quality topo visualization, but limited zoom resolution and raster-only.
- **Verdict**: Good free fallback topo if Stadia is unavailable. Not production-scale.

---

### 9. CartoDB/CARTO — Current State

- **API key**: No key required for public styles.
- **Style URLs** (MapLibre native vector):
  - Positron: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`
  - Dark Matter: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
  - Voyager: `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json`
- **Quality**: Positron and Dark Matter are excellent reference maps. Voyager is a labelled streets style.
- **Wildfire relevance**: Low — no terrain, no topo. Good reference/streets only.
- **Verdict**: Current setup (Positron/Voyager) is fine for reference. Upgrade streets to OpenFreeMap Liberty for better OSM coverage. CARTO has no topo offering.

---

### 10. AWS Open Data — Terrain Tiles

- **API key**: None for the public S3 bucket.
- **Terrain tile URL**: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
  - Note: Direct path tested 404. Correct format: `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png`
- **Encoding**: Terrarium RGB encoding (not Mapbox terrain-RGB). Decode with MapLibre terrain source.
- **Quality**: Global SRTM/NASADEM coverage. Good for generating hillshade in MapLibre.
- **Use case**: Terrain-RGB source for MapLibre's `terrain` property (3D terrain) and hillshade layers.
- **Verdict**: Not a basemap on its own. Excellent free elevation data source to layer under any basemap.

---

## Recommended Configuration for Project Nomad

```javascript
const basemapStyles = {
  streets: 'https://tiles.openfreemap.org/styles/liberty',

  satellite: {
    // Custom MapLibre style combining Esri satellite + labels
    version: 8,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles © Esri'
      },
      'esri-labels': {
        type: 'raster',
        tiles: ['https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      }
    },
    layers: [
      { id: 'satellite', type: 'raster', source: 'esri-satellite' },
      { id: 'labels',    type: 'raster', source: 'esri-labels' }
    ]
  },

  outdoors: 'https://tiles.stadiamaps.com/styles/stamen_terrain.json',
  // OR with MapTiler key:
  // outdoors: 'https://api.maptiler.com/maps/outdoor/style.json?key=YOUR_KEY'
};
```

---

## Key Policy Changes Since 2023

- **Stamen Maps shut down** their own tile hosting. All Stamen styles (Terrain, Toner, Watercolor) now live at Stadia Maps. Old `stamen.com` URLs are dead.
- **MapTiler** requires a free API key even for development — no anonymous access.
- **Thunderforest** requires an API key — 150k free requests/month.
- **Protomaps CDN** requires an API key. Self-hosting remains fully free.
- **OpenFreeMap** launched 2023 as the no-key alternative — currently the best truly free option.
- **VersaTiles** is newer (2024+) and fully FLOSS — viable alternative to OpenFreeMap.
