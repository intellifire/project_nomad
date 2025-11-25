# Nomad Integration Guide

## Overview

This guide provides technical specifications for integrating FireSTARR into Project Nomad's fire modeling interface. It covers execution patterns, data handling, and output processing.

## Docker Deployment

### Container Image

```bash
docker pull ghcr.io/cwfmf/firestarr:dev-0.9.5.4
```

### Required Volume Mounts

| Mount Point | Purpose |
|-------------|---------|
| `/data/fuel` | Fuel raster grids |
| `/data/dem` | Elevation grids |
| `/data/weather` | Weather input files |
| `/output` | Simulation outputs |

### Example Execution

```bash
docker run --rm \
  -v /path/to/fuel:/data/fuel \
  -v /path/to/dem:/data/dem \
  -v /path/to/weather:/data/weather \
  -v /path/to/output:/output \
  ghcr.io/cwfmf/firestarr:dev-0.9.5.4 \
  /output 2024-06-15 53.5 -120.3 14:30 \
  --wx /data/weather/weather.csv \
  --ffmc 75.0 --dmc 150.0 --dc 300.0 \
  --tz -7
```

## Execution Workflow

### 1. Input Preparation

```
Nomad Backend
├── Validate user inputs
├── Determine UTM zone from coordinates
├── Locate required rasters
├── Fetch/prepare weather data
├── Generate weather CSV
└── Create execution command
```

### 2. Model Execution

```
FireSTARR Container
├── Read configuration
├── Load spatial data
├── Initialize FWI indices
├── Run Monte Carlo iterations
│   ├── Execute scenarios (parallel)
│   ├── Aggregate probabilities
│   └── Check convergence
├── Generate outputs
└── Exit with status code
```

### 3. Output Processing

```
Nomad Backend
├── Poll for completion (exit code)
├── Parse log file for statistics
├── Convert outputs to display format
├── Store results in database
└── Notify user
```

## Input Requirements

### Spatial Data

| Data | Format | Requirements |
|------|--------|--------------|
| Fuel Grid | GeoTIFF Int16 | Codes matching fuel.lut |
| DEM | GeoTIFF Int16 | Meters, square pixels |
| Both | - | Matching projection and extent |

### Weather Data

CSV format with required columns:

```csv
Scenario,Date,PREC,TEMP,RH,WS,WD,FFMC,DMC,DC,ISI,BUI,FWI
1,2024-06-15 14:00,0,22.5,45,15,270,85.3,120.5,250.0,5.2,55.8,15.3
```

**Source Integration**:
- SpotWX API for forecast data
- Agency archives for historical data
- Real-time observations

### Required Parameters

| Parameter | Source | Notes |
|-----------|--------|-------|
| Ignition Point | User input | Lat/lon from map click |
| Start Date/Time | User input | Wizard step |
| FWI Indices | Weather service | Or calculated from weather |
| Weather Stream | SpotWX/Archive | Automatic fetch |
| Timezone | Derived | From longitude |

## Output Handling

### File Discovery

```javascript
const outputPatterns = {
  probability: '**/probability_*.tif',
  intensity: '**/intensity_[LMH]_*.tif',
  occurrence: '**/occurrence_*.tif',
  sizes: '**/sizes_*.csv',
  log: '**/firestarr.log'
};
```

### GeoTIFF Processing

```javascript
// Using GDAL Node bindings
const gdal = require('gdal-async');

async function processOutput(filepath) {
  const ds = await gdal.openAsync(filepath);
  const band = ds.bands.get(1);

  return {
    bounds: ds.geoTransform,
    projection: ds.srs.toWKT(),
    nodata: band.noDataValue,
    statistics: await band.computeStatisticsAsync(false)
  };
}
```

### Database Schema

```sql
CREATE TABLE firestarr_runs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',

  -- Input parameters
  ignition_lat FLOAT NOT NULL,
  ignition_lon FLOAT NOT NULL,
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  ffmc FLOAT NOT NULL,
  dmc FLOAT NOT NULL,
  dc FLOAT NOT NULL,

  -- Execution
  container_id VARCHAR(64),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  exit_code INTEGER,

  -- Results summary
  mean_fire_size FLOAT,
  max_fire_size FLOAT,
  iterations_completed INTEGER,
  convergence_achieved BOOLEAN,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE firestarr_outputs (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES firestarr_runs(id),
  output_type VARCHAR(50),
  time_step INTEGER,
  file_path VARCHAR(500),
  bounds GEOMETRY(POLYGON, 4326),
  min_value FLOAT,
  max_value FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Status Monitoring

### Log Parsing

```javascript
function parseLogStatus(logContent) {
  const lines = logContent.split('\n');

  return {
    iterations: extractIterationCount(lines),
    convergence: checkConvergence(lines),
    errors: extractErrors(lines),
    lastActivity: extractTimestamp(lines[lines.length - 1])
  };
}

function extractIterationCount(lines) {
  const pattern = /Iteration (\d+):/;
  let max = 0;
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) max = Math.max(max, parseInt(match[1]));
  }
  return max;
}
```

### Progress Indicators

| Log Pattern | Progress Stage |
|-------------|----------------|
| "Reading weather" | Loading inputs |
| "Starting simulation" | Initialized |
| "Iteration N:" | Running (N iterations) |
| "Convergence achieved" | Near completion |
| "Saving final outputs" | Finalizing |

## Visualization Integration

### MapBox GL Layer

```javascript
// Add probability raster layer
map.addSource('firestarr-probability', {
  type: 'raster',
  url: '/api/tiles/firestarr/{runId}/probability/{z}/{x}/{y}.png'
});

map.addLayer({
  id: 'firestarr-probability-layer',
  type: 'raster',
  source: 'firestarr-probability',
  paint: {
    'raster-opacity': 0.7,
    'raster-resampling': 'linear'
  }
});
```

### Color Ramps

**Probability**:
```javascript
const probabilityColors = [
  [0.0, '#ffffff00'],  // Transparent
  [0.1, '#ffff00'],    // Yellow
  [0.3, '#ffa500'],    // Orange
  [0.5, '#ff6600'],    // Dark orange
  [0.7, '#ff0000'],    // Red
  [1.0, '#8b0000']     // Dark red
];
```

**Intensity Classification**:
| Class | Color |
|-------|-------|
| Low | Yellow (#ffff00) |
| Moderate | Orange (#ffa500) |
| High | Red (#ff0000) |

## Error Handling

### Container Exit Codes

| Code | Action |
|------|--------|
| 0 | Success - process outputs |
| -1 | Usage error - check arguments |
| 1 | Fatal error - check logs |

### Common Failures

| Error | Detection | Recovery |
|-------|-----------|----------|
| Weather file missing | Log: "Could not open" | Re-fetch weather data |
| Out of time | Log: "Ran out of time" | Increase timeout |
| Grid not found | Log: "Could not find environment" | Expand raster coverage |
| Invalid coordinates | Exit code -1 | Validate user input |

### Retry Strategy

```javascript
async function executeWithRetry(params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeFireSTARR(params);
      if (result.exitCode === 0) return result;

      if (isRecoverable(result.error)) {
        await applyRecovery(result.error, params);
        continue;
      }

      throw new Error(result.error);
    } catch (e) {
      if (attempt === maxRetries) throw e;
      await sleep(1000 * attempt);
    }
  }
}
```

## API Patterns

### REST Endpoints

```
POST /api/models/firestarr/run
  Request: { ignition, dateTime, weather, indices }
  Response: { runId, status: 'queued' }

GET /api/models/firestarr/{runId}/status
  Response: { status, progress, eta }

GET /api/models/firestarr/{runId}/outputs
  Response: { probability, intensity, sizes, log }

GET /api/models/firestarr/{runId}/tiles/{layer}/{z}/{x}/{y}.png
  Response: PNG tile image
```

### WebSocket Updates

```javascript
// Client subscription
ws.send(JSON.stringify({
  type: 'subscribe',
  runId: 'abc-123'
}));

// Server updates
{
  type: 'progress',
  runId: 'abc-123',
  iteration: 15,
  convergence: 0.08,
  eta: 120  // seconds
}

{
  type: 'complete',
  runId: 'abc-123',
  outputs: ['probability_001.tif', ...]
}
```

## Configuration

### Nomad Settings

```json
{
  "firestarr": {
    "docker_image": "ghcr.io/cwfmf/firestarr:dev-0.9.5.4",
    "raster_root": "/data/firestarr/grids",
    "fuel_lut": "/data/firestarr/fuel.lut",
    "default_confidence": 0.1,
    "max_time_seconds": 3600,
    "output_days": [1, 2, 3, 7, 14]
  }
}
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `FIRESTARR_DOCKER_HOST` | Docker daemon socket |
| `FIRESTARR_RASTER_PATH` | Host path for rasters |
| `FIRESTARR_OUTPUT_PATH` | Host path for outputs |

## Performance Considerations

### Execution Times

| Fire Size | Duration | Typical Runtime |
|-----------|----------|-----------------|
| < 100 ha | 3 days | 2-5 min |
| 100-1000 ha | 7 days | 5-15 min |
| 1000-5000 ha | 14 days | 15-45 min |
| > 5000 ha | 14 days | 45-120 min |

### Resource Allocation

| Resource | Recommendation |
|----------|----------------|
| CPU | All available cores |
| Memory | 4-8 GB per run |
| Storage | 100 MB - 1 GB per run |

### Concurrent Execution

- Queue system for managing multiple runs
- Priority based on user role and request time
- Resource limits to prevent system overload

## Comparison with WISE

| Feature | FireSTARR | WISE |
|---------|-----------|------|
| Output Type | Probabilistic | Deterministic |
| Execution | Single command | Builder pattern |
| Weather | CSV input | FGMJ structure |
| Parallelism | Internal threading | External |
| Container | Official Docker | Custom build |

### When to Use Each

**FireSTARR**:
- Probabilistic burn probability maps
- Large-scale planning
- Uncertainty quantification

**WISE**:
- Detailed deterministic spread
- Specific fire behavior analysis
- Asset-at-risk assessment
