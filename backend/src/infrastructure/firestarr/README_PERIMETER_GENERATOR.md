# Perimeter Generator Service

## Overview

The PerimeterGenerator service converts FireSTARR probability rasters (GeoTIFF files) into vector polygons (GeoJSON). This allows users to:

1. Extract specific confidence interval perimeters (e.g., 50% probability contour)
2. Optionally smooth/simplify the polygons for cleaner visualization
3. Generate perimeters on-demand without re-running the model

## Usage

### API Endpoint

**POST** `/api/v1/models/{modelId}/perimeters`

Request body:
```json
{
  "confidenceInterval": 1,
  "smoothPerimeter": false,
  "simplifyTolerance": 0.0001
}
```

Response:
```json
{
  "perimeters": [
    {
      "day": 170,
      "geojson": { ... },
      "confidenceInterval": 50
    }
  ],
  "totalRasters": 3,
  "successCount": 3
}
```

### Parameters

- **confidenceInterval** (required): Number between 1-90, representing the probability threshold
  - Example: 50 = extract pixels where probability >= 0.5 (50%)
  - Default/hardcoded value for engine execution: 1 (captures all pixels with any burn probability > 0%, producing the full fire spread envelope)
- **smoothPerimeter** (optional): Whether to simplify the polygon (default: false)
- **simplifyTolerance** (optional): Simplification tolerance in degrees (default: 0.0001 ≈ 10m)

## Implementation Details

### GDAL Pipeline

For each probability raster:

1. **Threshold**: `gdal_calc.py -A input.tif --calc="A>={threshold}" --type=Byte`
   - Creates a binary raster (0 or 1) based on the confidence interval
   
2. **Polygonize**: `gdal_polygonize.py threshold.tif -f GeoJSON output.geojson`
   - Converts raster cells to vector polygons
   
3. **Simplify** (optional): `ogr2ogr -simplify {tolerance} output.geojson input.geojson`
   - Reduces polygon complexity while maintaining shape

### File Naming Convention

Expected input: `probability_NNN_YYYY-MM-DD.tif` or `probability_NNN.tif`

Where:
- `NNN` = Julian day number (extracted as "day" in response)
- `YYYY-MM-DD` = Date (optional)

### Requirements

- GDAL tools must be installed and in PATH:
  - `gdal_calc.py`
  - `gdal_polygonize.py`
  - `ogr2ogr`

## Error Handling

- Returns 404 if model not found or has no results
- Returns 400 if confidence interval is out of range (1-90)
- Returns 400 if GDAL tools are not available
- Logs warnings but continues processing if individual files fail

## Example Use Cases

1. **Fire perimeter extraction**: Extract 50% probability perimeter for operational planning
2. **Uncertainty visualization**: Generate multiple perimeters (e.g., 10%, 50%, 90%) to show spread uncertainty
3. **Map overlay**: Create simplified polygons for fast map rendering
4. **Export to GIS**: Provide vector data for import into QGIS, ArcGIS, etc.
