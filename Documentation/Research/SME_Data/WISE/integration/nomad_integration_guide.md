# Project Nomad - WISE Integration Guide

## Document Purpose

This technical integration guide bridges the WiseGuy Fire Engine Abstraction Layer with Project Nomad's architecture. It provides implementation patterns for integrating WISE fire modeling into Nomad's TypeScript React GUI system.

**Audience**: Developers implementing Project Nomad's backend fire modeling integration.

**Last Updated**: 2025-11-25

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Fire Engine Abstraction Layer](#fire-engine-abstraction-layer)
3. [Integration Pattern](#integration-pattern)
4. [Wizard to WISE Mapping](#wizard-to-wise-mapping)
5. [Backend Job Execution](#backend-job-execution)
6. [Output Processing for MapBox GL](#output-processing-for-mapbox-gl)
7. [Deployment Considerations](#deployment-considerations)
8. [Docker Architecture](#docker-architecture)
9. [FireSTARR Transition Strategy](#firestarr-transition-strategy)
10. [Code Examples](#code-examples)

---

## Architecture Overview

### System Integration Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      PROJECT NOMAD                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │  TypeScript      │  │    MapBox GL Visualization           │ │
│  │  React Frontend  │  │    (Fire Perimeters, Intensity)      │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Linear Wizard Interface                                 │   │
│  │  - Spatial Input (point/line/polygon)                    │   │
│  │  - Temporal Parameters (duration)                        │   │
│  │  - Model Selection (WISE/FireSTARR)                      │   │
│  │  - Weather Data Selection                                │   │
│  │  - Review & Execute                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              Node.js/Express/TypeScript Backend                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Nomad Backend API (POST /api/modeling/execute)          │   │
│  │  - Receives wizard parameters                            │   │
│  │  - Transforms to ModelingOptions                         │   │
│  │  - Routes to EngineManager                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WISEGUY FIRE ENGINE ABSTRACTION LAYER                   │   │
│  │  (npm package: wiseguy-fire-engine-abstraction)          │   │
│  │                                                          │   │
│  │  ┌────────────────┐  ┌──────────────────────────────┐   │   │
│  │  │ EngineManager  │  │  FireModelingEngine          │   │   │
│  │  │                │  │  Interface                    │   │   │
│  │  └────────────────┘  └──────────────────────────────┘   │   │
│  │           ↓                      ↓                       │   │
│  │  ┌────────────────┐     ┌──────────────────────────┐   │   │
│  │  │  WISEEngine    │     │  FireSTARREngine         │   │   │
│  │  │  (current)     │     │  (future)                │   │   │
│  │  └────────────────┘     └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WISE Job Execution Layer                                │   │
│  │  - Builder Integration (FGMJ generation)                 │   │
│  │  - Shell Script Execution (WISE CLI)                     │   │
│  │  - Output Processing (Shapefiles → KML/GeoJSON)         │   │
│  │  - Brett Moore's KML Enhancement                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  wise_js_api + Builder                                   │   │
│  │  - FGMJ File Generation (job.fgmj)                       │   │
│  │  - Job Folder Structure (Inputs/, Outputs/)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WISE Fire Modeling Engine                               │   │
│  │  - Reads job.fgmj                                        │   │
│  │  - Executes fire simulation                              │   │
│  │  - Writes outputs to Outputs/                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architecture Benefits

1. **Abstraction Layer Isolation**: Nomad backend never directly calls WISE API
2. **Engine Agnostic**: Same code works with WISE or FireSTARR
3. **Proven Patterns**: Uses Franco's established Builder + WISE workflow
4. **KML Enhancement**: Brett Moore's system provides 90% performance improvement
5. **Future-Proof**: Zero code changes required when transitioning to FireSTARR

---

## Fire Engine Abstraction Layer

### Overview

The WiseGuy Fire Engine Abstraction Layer provides a standardized interface for fire modeling engines. Project Nomad will integrate this layer as an npm dependency.

**Repository**: `/Users/franconogarin/localcode/wiseguy/`
**Package Name**: `wiseguy-fire-engine-abstraction` (planned)
**Current Status**: Sprint 1 Week 3 Complete (Builder Integration)

### Core Components

#### 1. FireModelingEngine Interface

The standard contract all engines implement:

```typescript
interface FireModelingEngine {
  // Engine identification
  getName(): string;
  getVersion(): string;
  getCapabilities(): EngineCapabilities;

  // Core modeling methods
  pointIgnition(lat: number, lon: number, duration: number, options?: ModelingOptions): Promise<ModelingResult>;
  polygonIgnition(coordinates: PolygonCoordinates, duration: number, options?: ModelingOptions): Promise<ModelingResult>;
  lineIgnition(coordinates: LineCoordinates, duration: number, options?: ModelingOptions): Promise<ModelingResult>;
  existingFire(fireId: string, duration: number, options?: ModelingOptions): Promise<ModelingResult>;

  // Health and configuration
  validateConfiguration(): Promise<ValidationResult>;
  testConnection(): Promise<ConnectionTestResult>;
}
```

#### 2. EngineManager

Central orchestration for managing multiple engines:

```typescript
class EngineManager {
  async registerEngine(engine: FireModelingEngine): Promise<void>;
  async setActiveEngine(engineName: string): Promise<void>;
  getActiveEngine(): FireModelingEngine | null;

  async executeModelingJob(
    jobType: 'point' | 'polygon' | 'line' | 'existing',
    parameters: any,
    options?: ModelingOptions
  ): Promise<ModelingResult>;

  async getEngineHealthSummary(): Promise<EngineHealthSummary>;
}
```

#### 3. WISEEngine Implementation

WISE-specific adapter implementing the interface:

- Uses `wise_js_api` with Builder pattern
- Creates timestamped job folders (e.g., `job_20240625064422915/`)
- Generates FGMJ files via `prom.beginJobPromise()`
- Executes WISE via shell scripts
- Processes outputs using Brett Moore's KML enhancement

#### 4. Standardized Types

```typescript
interface ModelingResult {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  engine: string;
  engineVersion: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;

  perimeters?: Array<{
    time: Date;
    polygon: PolygonCoordinates;
    area: number;
    perimeter: number;
  }>;

  statistics?: {
    totalAreaBurned: number;
    maxRateOfSpread: number;
    maxFireIntensity: number;
    totalFirelineIntensity: number;
    finalPerimeter: number;
  };

  outputs?: {
    kmlFiles?: string[];
    shapeFiles?: string[];
    gridFiles?: string[];
    statisticsFiles?: string[];
    rawData?: any;
  };

  error?: {
    code: string;
    message: string;
    details?: any;
  };

  metadata: {
    ignitionType: 'point' | 'polygon' | 'line' | 'existing';
    ignitionData: any;
    duration: number;
    options: any;
    engineSpecificData?: any;
  };
}
```

---

## Integration Pattern

### Nomad Backend Integration

Project Nomad's Node.js/Express backend will integrate the abstraction layer as follows:

#### Step 1: Installation

```bash
# In Nomad backend
npm install wiseguy-fire-engine-abstraction
```

#### Step 2: Initialize Engine Manager

```typescript
// src/services/FireModelingService.ts
import { EngineManager, WISEEngine } from 'wiseguy-fire-engine-abstraction';

export class FireModelingService {
  private engineManager: EngineManager;

  constructor() {
    this.engineManager = new EngineManager();
    this.initializeEngines();
  }

  private async initializeEngines() {
    // Register WISE engine
    const wiseEngine = new WISEEngine({
      host: process.env.WISE_HOST || 'localhost',
      port: parseInt(process.env.WISE_PORT || '6101'),
      timeout: 300000 // 5 minutes
    });

    await this.engineManager.registerEngine(wiseEngine);

    // Set WISE as default active engine
    await this.engineManager.setActiveEngine('WISE');

    console.log('Fire modeling engines initialized');
  }

  async executeModelingJob(params: NomadModelingRequest): Promise<ModelingResult> {
    // Transform Nomad request to abstraction layer format
    const { jobType, parameters, options } = this.transformNomadRequest(params);

    // Execute via abstraction layer
    const result = await this.engineManager.executeModelingJob(
      jobType,
      parameters,
      options
    );

    return result;
  }

  private transformNomadRequest(nomadReq: NomadModelingRequest) {
    // Transform Nomad wizard output to abstraction layer format
    // (See next section for details)
  }
}
```

#### Step 3: API Route Integration

```typescript
// src/routes/modeling.routes.ts
import express from 'express';
import { FireModelingService } from '../services/FireModelingService';

const router = express.Router();
const fireModelingService = new FireModelingService();

router.post('/api/modeling/execute', async (req, res) => {
  try {
    const nomadRequest = req.body as NomadModelingRequest;

    // Validate request
    // ... validation logic

    // Execute modeling job
    const result = await fireModelingService.executeModelingJob(nomadRequest);

    // Store result in database with unique model number
    const modelNumber = await saveModelResult(result);

    // Send notification (email/web push)
    await sendCompletionNotification(modelNumber, result);

    // Return shareable status link
    res.json({
      modelNumber,
      status: result.status,
      statusLink: `/model/${modelNumber}/status`,
      shareableLink: `${process.env.PUBLIC_URL}/model/${modelNumber}`
    });
  } catch (error) {
    console.error('Modeling execution error:', error);
    res.status(500).json({ error: 'Modeling execution failed' });
  }
});

export default router;
```

---

## Wizard to WISE Mapping

### Nomad Wizard Data Structure

The Nomad wizard collects parameters through a linear flow:

```typescript
interface NomadModelingRequest {
  // Step 1: Spatial Input
  spatialInput: {
    type: 'point' | 'line' | 'polygon' | 'existingFire';
    data: {
      // For point
      point?: { lat: number; lon: number };

      // For line
      line?: { points: Array<{ lat: number; lon: number }> };

      // For polygon
      polygon?: {
        exterior: Array<{ lat: number; lon: number }>;
        holes?: Array<Array<{ lat: number; lon: number }>>;
      };

      // For existing fire
      fireId?: string;
    };
  };

  // Step 2: Temporal Parameters
  temporal: {
    startTime: string; // ISO 8601
    duration: number;  // minutes
  };

  // Step 3: Model Selection
  modelSelection: {
    engine: 'WISE' | 'FireSTARR';
    modelType: 'deterministic' | 'probabilistic';
  };

  // Step 4: Weather Data
  weather: {
    source: 'SpotWX' | 'AgencyAPI' | 'Manual';
    modelId?: string; // SpotWX model identifier
    manualData?: {
      temperature: number;
      humidity: number;
      windSpeed: number;
      windDirection: number;
      precipitation: number;
    };
  };

  // Step 5: Advanced Options (optional)
  advancedOptions?: {
    burningConditions?: {
      fuelMoisture?: number;
      temperature?: number;
      humidity?: number;
    };
    fuelPatches?: Array<{
      area: PolygonCoordinates;
      fuelType: string;
    }>;
    weatherPatches?: Array<{
      area: PolygonCoordinates;
      windSpeed: number;
      windDirection: number;
    }>;
    scenarios?: Array<{
      name: string;
      conditions: any;
    }>;
    statisticsOutputs?: boolean;
  };

  // Notification preferences
  notifications: {
    email?: string;
    webPush?: boolean;
  };
}
```

### Transformation Function

```typescript
function transformNomadRequest(nomadReq: NomadModelingRequest): {
  jobType: 'point' | 'polygon' | 'line' | 'existing';
  parameters: any;
  options: ModelingOptions;
} {
  const { spatialInput, temporal, weather, advancedOptions } = nomadReq;

  // Determine job type
  let jobType: 'point' | 'polygon' | 'line' | 'existing';
  let parameters: any;

  switch (spatialInput.type) {
    case 'point':
      jobType = 'point';
      parameters = {
        lat: spatialInput.data.point!.lat,
        lon: spatialInput.data.point!.lon,
        duration: temporal.duration
      };
      break;

    case 'polygon':
      jobType = 'polygon';
      parameters = {
        coordinates: spatialInput.data.polygon!,
        duration: temporal.duration
      };
      break;

    case 'line':
      jobType = 'line';
      parameters = {
        coordinates: { points: spatialInput.data.line!.points },
        duration: temporal.duration
      };
      break;

    case 'existingFire':
      jobType = 'existing';
      parameters = {
        fireId: spatialInput.data.fireId!,
        duration: temporal.duration
      };
      break;
  }

  // Build options from weather and advanced settings
  const options: ModelingOptions = {
    weather: weather.source === 'Manual' && weather.manualData ? {
      temperature: weather.manualData.temperature,
      humidity: weather.manualData.humidity,
      windSpeed: weather.manualData.windSpeed,
      windDirection: weather.manualData.windDirection,
      precipitation: weather.manualData.precipitation
    } : undefined,

    burningConditions: advancedOptions?.burningConditions,
    fuelPatches: advancedOptions?.fuelPatches,
    weatherPatches: advancedOptions?.weatherPatches,

    includeStatistics: advancedOptions?.statisticsOutputs ?? true,
    includePerimeters: true,

    outputFormats: ['kml', 'shapefile', 'statistics'],

    engineOptions: {
      // SpotWX model ID if applicable
      spotWxModelId: weather.modelId,
      // Start time for weather alignment
      startTime: temporal.startTime
    }
  };

  return { jobType, parameters, options };
}
```

### Example Transformation

**Nomad Wizard Input:**
```json
{
  "spatialInput": {
    "type": "point",
    "data": {
      "point": { "lat": 62.4540, "lon": -114.3718 }
    }
  },
  "temporal": {
    "startTime": "2025-07-15T14:00:00Z",
    "duration": 180
  },
  "modelSelection": {
    "engine": "WISE",
    "modelType": "deterministic"
  },
  "weather": {
    "source": "SpotWX",
    "modelId": "NAM_3km"
  }
}
```

**Abstraction Layer Call:**
```typescript
await engineManager.executeModelingJob(
  'point',
  {
    lat: 62.4540,
    lon: -114.3718,
    duration: 180
  },
  {
    weather: undefined, // SpotWX handled externally
    includeStatistics: true,
    includePerimeters: true,
    outputFormats: ['kml', 'shapefile', 'statistics'],
    engineOptions: {
      spotWxModelId: 'NAM_3km',
      startTime: '2025-07-15T14:00:00Z'
    }
  }
);
```

---

## Backend Job Execution

### WISE Job Execution Flow

The WISEEngine follows Franco's proven `fireModel.js` pattern:

#### Phase 1: FGMJ Generation (via Builder)

```typescript
// Inside WISEEngine.createWISEPointIgnitionJob()
const modeller = require('wise_js_api');

// Initialize WISE model
const prom = new modeller.wise.WISE();
prom.setName(`Point Ignition ${lat},${lon} - ${duration}min`);

// Configure point ignition
const pointIgnition = prom.addPointIgnition(
  new modeller.globals.LatLon(lat, lon),
  startTime.toISOString()
);

// Set duration and basic scenario
const scenario = prom.addScenario();
scenario.setName('Point Ignition Scenario');
scenario.setStartTime(startTime.toISOString());
scenario.setEndTime(new Date(startTime.getTime() + duration * 60000).toISOString());

// Create job folder and FGMJ via Builder
const wrapper = await prom.beginJobPromise();
const jobName = wrapper.name.replace(/^\s+|\s+$/g, "");

return {
  jobName,
  jobPath: `${process.env.PROJECT_JOBS_FOLDER}/${jobName}`,
  fgmjPath: `${process.env.PROJECT_JOBS_FOLDER}/${jobName}/job.fgmj`
};
```

**Generated Job Structure:**
```
/shared/wise_data/job_20250715140000123/
├── Inputs/                  # Builder-generated inputs
├── job.fgmj                 # WISE job file
├── Outputs/                 # WISE execution results (created by WISE)
├── status.json              # Job status tracking
└── validation.json          # Job validation results
```

#### Phase 2: WISE Execution (via Shell Script)

```typescript
// Inside WISEEngine.executeWISEJob()
const { jobName, jobPath, fgmjPath } = wiseJob;

// Validate FGMJ exists
if (!fs.existsSync(fgmjPath)) {
  throw new Error(`FGMJ file not found: ${fgmjPath}`);
}

// Execute WISE (follows Franco's shell execution pattern)
const wiseCommand = `${process.env.WISE_EXECUTABLE_PATH} -j ${fgmjPath}`;
const execResult = await execPromise(wiseCommand, {
  cwd: jobPath,
  timeout: 300000 // 5 minutes
});

// Check for successful execution
const statusFile = path.join(jobPath, 'status.json');
if (fs.existsSync(statusFile)) {
  const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
  if (status.success) {
    return { jobName, jobPath, fgmjPath, status: 'completed' };
  }
}

throw new Error('WISE execution failed');
```

#### Phase 3: Output Processing

```typescript
// Inside WISEEngine.transformWISEResult()
const outputsPath = path.join(jobPath, 'Outputs');

// Find output files
const shapeFiles = glob.sync(path.join(outputsPath, '**/*.shp'));
const kmlFiles = glob.sync(path.join(outputsPath, '**/*.kml'));
const statsFiles = glob.sync(path.join(outputsPath, '**/*_stats.txt'));

// Process shapefiles with Brett Moore's KML enhancement
const enhancedKML = await KMLEnhancer.enhanceModelingResult(result, {
  includeTimespan: true,
  generateLegend: true,
  outputDirectory: outputsPath
});

// Parse fire perimeters from outputs
const perimeters = await parseFirePerimeters(shapeFiles);

// Parse statistics
const statistics = await parseStatistics(statsFiles);

return {
  jobId: metadata.jobId,
  status: 'completed',
  engine: 'WISE',
  engineVersion: this.version,
  perimeters,
  statistics,
  outputs: {
    kmlFiles: [enhancedKML.kmlPath, ...kmlFiles],
    shapeFiles,
    statisticsFiles: statsFiles,
    rawData: {
      jobPath,
      outputsPath,
      fgmjPath
    }
  },
  metadata
};
```

### Asynchronous Job Management

For long-running models, implement async job processing:

```typescript
// src/services/FireModelingService.ts
async executeModelingJobAsync(params: NomadModelingRequest): Promise<string> {
  // Generate unique job ID
  const jobId = `nomad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Store job as 'running' in database
  await db.modelingJobs.create({
    id: jobId,
    status: 'running',
    parameters: params,
    createdAt: new Date()
  });

  // Execute in background
  this.executeInBackground(jobId, params).catch(error => {
    console.error(`Job ${jobId} failed:`, error);
    db.modelingJobs.update(jobId, {
      status: 'failed',
      error: error.message
    });
  });

  return jobId;
}

private async executeInBackground(jobId: string, params: NomadModelingRequest) {
  try {
    const result = await this.executeModelingJob(params);

    // Update database with results
    await db.modelingJobs.update(jobId, {
      status: result.status,
      result,
      completedAt: new Date()
    });

    // Send notification
    await notificationService.sendCompletion(jobId, params.notifications);

  } catch (error) {
    throw error;
  }
}
```

---

## Output Processing for MapBox GL

### Converting WISE Outputs to MapBox-Ready Format

MapBox GL requires GeoJSON format. Transform WISE outputs as follows:

#### Fire Perimeter Conversion

```typescript
// src/services/OutputProcessor.ts
import { Feature, FeatureCollection, Polygon } from 'geojson';

export class OutputProcessor {
  /**
   * Convert WISE ModelingResult to MapBox GeoJSON
   */
  static toMapBoxGeoJSON(result: ModelingResult): FeatureCollection {
    const features: Feature<Polygon>[] = [];

    if (result.perimeters) {
      result.perimeters.forEach((perimeter, index) => {
        const feature: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              perimeter.polygon.exterior.map(coord => [coord.lon, coord.lat])
            ]
          },
          properties: {
            jobId: result.jobId,
            engine: result.engine,
            time: perimeter.time.toISOString(),
            timeIndex: index,
            area: perimeter.area,
            perimeter: perimeter.perimeter,

            // MapBox styling properties
            'fill-color': this.getColorForTimeIndex(index, result.perimeters!.length),
            'fill-opacity': 0.5,
            'stroke-color': this.getColorForTimeIndex(index, result.perimeters!.length),
            'stroke-width': 2
          }
        };

        features.push(feature);
      });
    }

    return {
      type: 'FeatureCollection',
      features
    };
  }

  /**
   * Get color for perimeter based on time progression
   */
  private static getColorForTimeIndex(index: number, total: number): string {
    const colorRamp = ['#EF2820', '#F89E46', '#F1FB7C', '#A6CAAD', '#38A1D0'];
    const colorIndex = Math.floor((index / total) * (colorRamp.length - 1));
    return colorRamp[colorIndex];
  }

  /**
   * Generate MapBox layer specification for fire perimeters
   */
  static generateMapBoxLayers(result: ModelingResult): any[] {
    return [
      {
        id: `fire-perimeters-${result.jobId}`,
        type: 'fill',
        source: {
          type: 'geojson',
          data: this.toMapBoxGeoJSON(result)
        },
        paint: {
          'fill-color': ['get', 'fill-color'],
          'fill-opacity': ['get', 'fill-opacity']
        }
      },
      {
        id: `fire-perimeters-outline-${result.jobId}`,
        type: 'line',
        source: {
          type: 'geojson',
          data: this.toMapBoxGeoJSON(result)
        },
        paint: {
          'line-color': ['get', 'stroke-color'],
          'line-width': ['get', 'stroke-width']
        }
      }
    ];
  }
}
```

#### Frontend Integration

```typescript
// Frontend: src/components/ModelVisualization.tsx
import mapboxgl from 'mapbox-gl';

export function addModelResultToMap(
  map: mapboxgl.Map,
  result: ModelingResult
) {
  // Convert to GeoJSON
  const geoJSON = OutputProcessor.toMapBoxGeoJSON(result);

  // Add source
  map.addSource(`model-${result.jobId}`, {
    type: 'geojson',
    data: geoJSON
  });

  // Add fill layer
  map.addLayer({
    id: `model-fill-${result.jobId}`,
    type: 'fill',
    source: `model-${result.jobId}`,
    paint: {
      'fill-color': ['get', 'fill-color'],
      'fill-opacity': 0.5
    }
  });

  // Add outline layer
  map.addLayer({
    id: `model-outline-${result.jobId}`,
    type: 'line',
    source: `model-${result.jobId}`,
    paint: {
      'line-color': ['get', 'stroke-color'],
      'line-width': 2
    }
  });

  // Fit bounds to fire perimeters
  const bounds = new mapboxgl.LngLatBounds();
  geoJSON.features.forEach(feature => {
    feature.geometry.coordinates[0].forEach(coord => {
      bounds.extend(coord as [number, number]);
    });
  });
  map.fitBounds(bounds, { padding: 50 });

  // Add popup on click
  map.on('click', `model-fill-${result.jobId}`, (e) => {
    const props = e.features![0].properties!;
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <h3>Fire Perimeter</h3>
        <p><strong>Time:</strong> ${new Date(props.time).toLocaleString()}</p>
        <p><strong>Area:</strong> ${props.area.toFixed(2)} ha</p>
        <p><strong>Perimeter:</strong> ${props.perimeter.toFixed(0)} m</p>
      `)
      .addTo(map);
  });
}
```

### Time-Series Animation

For probabilistic models or time-series visualization:

```typescript
// Frontend: src/components/FireAnimation.tsx
export function animateFireProgression(
  map: mapboxgl.Map,
  result: ModelingResult,
  animationSpeed: number = 1000 // ms per frame
) {
  if (!result.perimeters || result.perimeters.length === 0) return;

  let currentFrame = 0;

  const animate = () => {
    if (currentFrame >= result.perimeters!.length) {
      currentFrame = 0; // Loop
    }

    // Filter to show only perimeters up to current frame
    const visiblePerimeters = result.perimeters!.slice(0, currentFrame + 1);

    // Update source data
    const geoJSON = OutputProcessor.toMapBoxGeoJSON({
      ...result,
      perimeters: visiblePerimeters
    });

    (map.getSource(`model-${result.jobId}`) as mapboxgl.GeoJSONSource)
      .setData(geoJSON);

    currentFrame++;
    setTimeout(animate, animationSpeed);
  };

  animate();
}
```

---

## Deployment Considerations

### SAN (Stand Alone Nomad) Deployment

**Characteristics:**
- Self-hosted PWA with all components
- SpatiaLite for spatial database
- File-based authentication
- WISE engine must be bundled or accessible

**WISE Integration Approach:**

1. **Option A: Bundled WISE (Docker)**
   - Package WISE engine in Docker container with Nomad backend
   - Builder + WISE coexist in same container
   - Job folders shared via mounted volumes

```yaml
# docker-compose.yml (SAN mode)
services:
  nomad-san:
    image: nomad-san:latest
    ports:
      - "3000:3000"    # Frontend
      - "3001:3001"    # Backend API
    volumes:
      - ./data/wise_jobs:/workspace/wise_jobs
      - ./data/spatialite:/workspace/db
    environment:
      - NOMAD_DEPLOYMENT_MODE=SAN
      - WISE_EXECUTABLE_PATH=/usr/local/bin/wise
      - PROJECT_JOBS_FOLDER=/workspace/wise_jobs
```

2. **Option B: External WISE Server**
   - Nomad backend connects to separate WISE server
   - Uses SSH tunnel pattern (WiseGuy docker architecture)
   - Suitable for ARM64 development machines

```yaml
# docker-compose.yml (SAN mode with remote WISE)
services:
  nomad-san-frontend:
    image: nomad-san-frontend:latest
    ports:
      - "3000:3000"

  nomad-san-backend:
    image: nomad-san-backend:latest
    ports:
      - "3001:3001"
    environment:
      - NOMAD_DEPLOYMENT_MODE=SAN
      - WISE_REMOTE_HOST=wise-server.example.com
      - WISE_REMOTE_PORT=6101
      - WISE_SSH_TUNNEL=true
    depends_on:
      - wise-gateway

  wise-gateway:
    image: wise-gateway:latest
    environment:
      - WISE_REMOTE_HOST=${WISE_SERVER_HOST}
      - SSH_KEY_PATH=/ssh/wise_server_key
```

### ACN (Agency Centric Nomad) Deployment

**Characteristics:**
- Component integrated into existing agency systems
- PostGIS for spatial database
- Agency authentication integration
- WISE engine typically provided by agency infrastructure

**WISE Integration Approach:**

1. **Use Agency WISE Infrastructure**
   - Connect to existing agency WISE servers
   - Leverage agency dataset libraries
   - Integrate with agency job management systems

```typescript
// config/agency-specific.ts (ACN mode)
export const agencyWISEConfig = {
  deploymentMode: 'ACN',
  agencyId: process.env.NOMAD_AGENCY_ID,

  wiseEngine: {
    host: process.env.AGENCY_WISE_HOST,
    port: parseInt(process.env.AGENCY_WISE_PORT || '6101'),
    authentication: {
      type: 'agency-sso',
      endpoint: process.env.AGENCY_AUTH_ENDPOINT
    }
  },

  datasetPaths: {
    jobsFolder: process.env.AGENCY_WISE_JOBS_FOLDER,
    datasetLibrary: process.env.AGENCY_DATASET_LIBRARY
  },

  spatialDatabase: {
    type: 'postgis',
    host: process.env.AGENCY_POSTGIS_HOST,
    database: process.env.AGENCY_POSTGIS_DB
  }
};
```

2. **Nomad as Microservice**
   - Deploy Nomad backend as containerized microservice
   - Integrate with agency Kubernetes/Docker infrastructure
   - Use agency service mesh for WISE connectivity

```yaml
# kubernetes/nomad-acn-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nomad-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: nomad-backend
        image: nomad-backend:latest
        env:
        - name: NOMAD_DEPLOYMENT_MODE
          value: "ACN"
        - name: NOMAD_AGENCY_ID
          value: "nwt"
        - name: WISE_HOST
          value: "wise-service.agency.svc.cluster.local"
        - name: WISE_PORT
          value: "6101"
```

### Configuration Loading Strategy

```typescript
// src/config/deployment.ts
export function loadDeploymentConfig() {
  const mode = process.env.NOMAD_DEPLOYMENT_MODE || 'SAN';
  const agencyId = process.env.NOMAD_AGENCY_ID;

  let configPath: string;

  if (mode === 'ACN' && agencyId) {
    // Load agency-specific configuration
    configPath = `/configuration/${agencyId}/config.json`;
  } else {
    // Load generic/default configuration
    configPath = '/configuration/generic/config.json';
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  return {
    mode,
    agencyId,
    ...config,
    wiseEngine: {
      host: process.env.WISE_HOST || config.wiseEngine?.host || 'localhost',
      port: parseInt(process.env.WISE_PORT || config.wiseEngine?.port || '6101')
    }
  };
}
```

---

## Docker Architecture

### WiseGuy Container Pattern (Reference)

The WiseGuy repository demonstrates a proven Docker architecture for WISE integration:

**5-Service Architecture:**

1. **wise-dev**: ARM64 development environment
2. **wise-api-gateway**: SSH tunnel proxy to x86_64 WISE servers
3. **kml-enhancer**: Brett Moore's KML enhancement service (R-based)
4. **wise-db**: PostgreSQL for job tracking
5. **wise-redis**: Redis for job queuing and caching

**Key Pattern: SSH Tunnel Gateway**

The gateway service solves the ARM64 (Mac M2) to x86_64 (WISE) compatibility issue:

```javascript
// docker/gateway/gateway.js (simplified)
const express = require('express');
const { Client } = require('ssh2');

const app = express();
const sshClient = new Client();

// Establish SSH tunnel to remote WISE server
sshClient.on('ready', () => {
  console.log('SSH tunnel established');

  // Forward local port to remote WISE server
  sshClient.forwardIn('0.0.0.0', 6101, (err, port) => {
    if (err) throw err;
    console.log(`Forwarding port ${port} to WISE server`);
  });
});

// Connect to WISE server
sshClient.connect({
  host: process.env.WISE_REMOTE_HOST,
  port: 22,
  username: process.env.SSH_USERNAME,
  privateKey: fs.readFileSync('/ssh/wise_server_key')
});

// Proxy API requests to WISE through tunnel
app.post('/api/wise/*', (req, res) => {
  // Proxy request through SSH tunnel
});

app.listen(6100);
```

### Nomad Docker Integration

**Recommended Approach for Nomad:**

```yaml
# docker-compose.nomad.yml
version: '3.8'

services:
  # Frontend PWA
  nomad-frontend:
    build:
      context: .
      dockerfile: docker/Dockerfile.frontend
    ports:
      - "3000:3000"
    depends_on:
      - nomad-backend

  # Backend API with Fire Engine Abstraction
  nomad-backend:
    build:
      context: .
      dockerfile: docker/Dockerfile.backend
    ports:
      - "3001:3001"
    volumes:
      - ./data/wise_jobs:/workspace/wise_jobs
      - ./data/spatialite:/workspace/db
    environment:
      - NOMAD_DEPLOYMENT_MODE=${DEPLOYMENT_MODE:-SAN}
      - NOMAD_AGENCY_ID=${AGENCY_ID}
      - WISE_HOST=${WISE_HOST:-wise-gateway}
      - WISE_PORT=${WISE_PORT:-6101}
      - PROJECT_JOBS_FOLDER=/workspace/wise_jobs
    depends_on:
      - wise-gateway
      - nomad-db
    networks:
      - nomad-network

  # WISE Gateway (reuse WiseGuy pattern)
  wise-gateway:
    build:
      context: ../wiseguy
      dockerfile: docker/Dockerfile.gateway
    environment:
      - WISE_REMOTE_HOST=${WISE_SERVER_HOST}
      - SSH_KEY_PATH=/ssh/wise_server_key
    volumes:
      - ./docker/ssh:/ssh:ro
    networks:
      - nomad-network

  # KML Enhancement Service (Brett Moore's system)
  kml-enhancer:
    build:
      context: ../wiseguy
      dockerfile: docker/Dockerfile.kml
    volumes:
      - ./data/wise_jobs:/workspace/wise_jobs
    networks:
      - nomad-network

  # SpatiaLite/PostGIS (mode-dependent)
  nomad-db:
    image: postgis/postgis:15-3.3-alpine
    environment:
      - POSTGRES_DB=nomad
      - POSTGRES_USER=nomad_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - nomad_db_data:/var/lib/postgresql/data
    networks:
      - nomad-network

networks:
  nomad-network:
    driver: bridge

volumes:
  nomad_db_data:
```

### Builder + WISE Coexistence Strategy

**Recommended Pattern:**

1. Builder and abstraction layer coexist in `nomad-backend` container
2. WISE engine in separate container or remote server
3. Shared job folder via Docker volumes

```dockerfile
# docker/Dockerfile.backend
FROM node:22-alpine

# Install WISE Builder dependencies
RUN npm install -g wise_js_api

# Install Nomad backend
WORKDIR /app
COPY package*.json ./
RUN npm install

# Install Fire Engine Abstraction Layer
RUN npm install wiseguy-fire-engine-abstraction

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Job folder for Builder output
RUN mkdir -p /workspace/wise_jobs

EXPOSE 3001

CMD ["npm", "start"]
```

---

## FireSTARR Transition Strategy

### Why the Abstraction Layer is Essential

The Fire Engine Abstraction Layer provides **zero-impact migration** from WISE to FireSTARR:

**Technology Differences:**

| Aspect | WISE | FireSTARR |
|--------|------|-----------|
| Language | JavaScript | C++/Python |
| Approach | Deterministic | Probabilistic |
| Outputs | Fire perimeters | Burn probability maps |
| Integration | wise_js_api | C++/Python bindings |
| Container | Optional | Docker-native |

**Abstraction Layer Benefits:**

1. **Client Code Unchanged**: Nomad frontend and backend require zero modifications
2. **Gradual Migration**: Run WISE and FireSTARR side-by-side for validation
3. **Feature Parity**: Translate between deterministic and probabilistic paradigms
4. **Performance Comparison**: Benchmark both engines on same scenarios
5. **Rollback Capability**: Revert to WISE if issues discovered

### Migration Phases

#### Phase 1: WISE-Only (Current)

```typescript
// Nomad backend during development
const engineManager = new EngineManager();
const wiseEngine = new WISEEngine(config);
await engineManager.registerEngine(wiseEngine);
await engineManager.setActiveEngine('WISE');
```

#### Phase 2: Dual Engine Support

```typescript
// Nomad backend with both engines
const engineManager = new EngineManager();

// Register WISE
const wiseEngine = new WISEEngine(wiseConfig);
await engineManager.registerEngine(wiseEngine);

// Register FireSTARR
const firestarrEngine = new FireSTARREngine(firestarrConfig);
await engineManager.registerEngine(firestarrEngine);

// Admin can switch via GUI
const activeEngine = config.preferredEngine || 'WISE';
await engineManager.setActiveEngine(activeEngine);
```

#### Phase 3: FireSTARR Primary, WISE Fallback

```typescript
// Nomad backend with FireSTARR primary
try {
  await engineManager.setActiveEngine('FireSTARR');
} catch (error) {
  console.warn('FireSTARR unavailable, falling back to WISE');
  await engineManager.setActiveEngine('WISE');
}
```

#### Phase 4: FireSTARR-Only

```typescript
// Nomad backend production
const engineManager = new EngineManager();
const firestarrEngine = new FireSTARREngine(config);
await engineManager.registerEngine(firestarrEngine);
await engineManager.setActiveEngine('FireSTARR');

// WISE completely removed
```

### FireSTARR Engine Implementation (Future)

```typescript
// wiseguy/src/engines/FireSTARREngine.ts (planned)
export class FireSTARREngine implements FireModelingEngine {
  getName(): string { return 'FireSTARR'; }
  getVersion(): string { return '2.0.0'; }

  getCapabilities(): EngineCapabilities {
    return {
      pointIgnition: true,
      polygonIgnition: true,
      lineIgnition: true,
      existingFireModeling: true,
      advancedBurningConditions: true,
      fuelPatches: true,
      weatherPatches: true,
      multipleScenarios: true,
      statisticsOutputs: true,
      probabilisticModeling: true,  // FireSTARR-specific
      burnProbabilityMaps: true     // FireSTARR-specific
    };
  }

  async pointIgnition(
    lat: number,
    lon: number,
    duration: number,
    options?: ModelingOptions
  ): Promise<ModelingResult> {
    // Call FireSTARR C++/Python API
    // Transform probabilistic results to ModelingResult
    // Generate burn probability maps instead of fire perimeters
  }
}
```

### Configuration-Based Engine Selection

```json
// configuration/nwt/config.json
{
  "models": {
    "available": ["firestarr", "wise"],
    "preferred": "firestarr",
    "fallback": "wise",
    "suppress": []
  }
}
```

---

## Code Examples

### Complete Integration Example

```typescript
// ============================================
// FILE: src/services/FireModelingService.ts
// ============================================
import { EngineManager, WISEEngine, ModelingResult } from 'wiseguy-fire-engine-abstraction';
import { NomadModelingRequest } from '../types/modeling';

export class FireModelingService {
  private engineManager: EngineManager;
  private initialized: boolean = false;

  constructor() {
    this.engineManager = new EngineManager();
  }

  async initialize() {
    if (this.initialized) return;

    // Load deployment configuration
    const config = loadDeploymentConfig();

    // Register WISE engine
    const wiseEngine = new WISEEngine({
      host: config.wiseEngine.host,
      port: config.wiseEngine.port,
      timeout: 300000
    });

    await this.engineManager.registerEngine(wiseEngine);

    // Set active engine based on configuration
    const preferredEngine = config.models?.preferred || 'WISE';
    await this.engineManager.setActiveEngine(preferredEngine);

    this.initialized = true;
    console.log(`Fire modeling service initialized with ${preferredEngine} engine`);
  }

  async executeModelingJob(params: NomadModelingRequest): Promise<ModelingResult> {
    await this.initialize();

    // Transform Nomad request to abstraction layer format
    const { jobType, parameters, options } = this.transformRequest(params);

    // Execute via abstraction layer
    const result = await this.engineManager.executeModelingJob(
      jobType,
      parameters,
      options
    );

    return result;
  }

  private transformRequest(nomadReq: NomadModelingRequest) {
    // See "Wizard to WISE Mapping" section for full implementation
    const { spatialInput, temporal, weather, advancedOptions } = nomadReq;

    let jobType: 'point' | 'polygon' | 'line' | 'existing';
    let parameters: any;

    switch (spatialInput.type) {
      case 'point':
        jobType = 'point';
        parameters = {
          lat: spatialInput.data.point!.lat,
          lon: spatialInput.data.point!.lon,
          duration: temporal.duration
        };
        break;

      // ... other cases
    }

    const options = {
      weather: weather.manualData,
      burningConditions: advancedOptions?.burningConditions,
      includeStatistics: true,
      includePerimeters: true,
      outputFormats: ['kml', 'shapefile', 'statistics']
    };

    return { jobType, parameters, options };
  }

  async getEngineHealth() {
    await this.initialize();
    return this.engineManager.getEngineHealthSummary();
  }
}

// ============================================
// FILE: src/routes/modeling.routes.ts
// ============================================
import express from 'express';
import { FireModelingService } from '../services/FireModelingService';
import { OutputProcessor } from '../services/OutputProcessor';

const router = express.Router();
const fireModelingService = new FireModelingService();

// Execute modeling job
router.post('/api/modeling/execute', async (req, res) => {
  try {
    const nomadRequest = req.body as NomadModelingRequest;

    // Execute modeling
    const result = await fireModelingService.executeModelingJob(nomadRequest);

    // Generate unique model number
    const modelNumber = await generateModelNumber();

    // Store in database
    await db.modelingJobs.create({
      modelNumber,
      jobId: result.jobId,
      status: result.status,
      result,
      parameters: nomadRequest,
      createdAt: new Date()
    });

    // Convert to MapBox GeoJSON
    const geoJSON = OutputProcessor.toMapBoxGeoJSON(result);

    // Send notification
    await notificationService.sendCompletion({
      modelNumber,
      email: nomadRequest.notifications.email,
      webPush: nomadRequest.notifications.webPush
    });

    // Return result with shareable link
    res.json({
      modelNumber,
      status: result.status,
      geoJSON,
      statusLink: `/api/model/${modelNumber}/status`,
      shareableLink: `${process.env.PUBLIC_URL}/model/${modelNumber}`,
      statistics: result.statistics
    });

  } catch (error) {
    console.error('Modeling execution error:', error);
    res.status(500).json({
      error: 'Modeling execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get model status
router.get('/api/model/:modelNumber/status', async (req, res) => {
  const { modelNumber } = req.params;

  const model = await db.modelingJobs.findByModelNumber(modelNumber);

  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  res.json({
    modelNumber,
    status: model.status,
    result: model.result,
    createdAt: model.createdAt,
    completedAt: model.completedAt
  });
});

// Get model GeoJSON for visualization
router.get('/api/model/:modelNumber/geojson', async (req, res) => {
  const { modelNumber } = req.params;

  const model = await db.modelingJobs.findByModelNumber(modelNumber);

  if (!model || !model.result) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const geoJSON = OutputProcessor.toMapBoxGeoJSON(model.result);
  res.json(geoJSON);
});

// Health check endpoint
router.get('/api/modeling/health', async (req, res) => {
  try {
    const health = await fireModelingService.getEngineHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;

// ============================================
// FILE: Frontend - src/services/ModelingAPI.ts
// ============================================
export class ModelingAPI {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  async executeModel(request: NomadModelingRequest): Promise<ModelingResponse> {
    const response = await fetch(`${this.baseURL}/modeling/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error('Modeling execution failed');
    }

    return response.json();
  }

  async getModelStatus(modelNumber: string): Promise<ModelStatus> {
    const response = await fetch(`${this.baseURL}/model/${modelNumber}/status`);

    if (!response.ok) {
      throw new Error('Failed to fetch model status');
    }

    return response.json();
  }

  async getModelGeoJSON(modelNumber: string): Promise<FeatureCollection> {
    const response = await fetch(`${this.baseURL}/model/${modelNumber}/geojson`);

    if (!response.ok) {
      throw new Error('Failed to fetch model GeoJSON');
    }

    return response.json();
  }
}
```

---

## Summary

This integration guide provides the complete technical roadmap for integrating WISE fire modeling into Project Nomad using the WiseGuy Fire Engine Abstraction Layer.

**Key Takeaways:**

1. **Abstraction Layer**: Use the Fire Engine Abstraction Layer from WiseGuy as an npm dependency
2. **Zero Direct WISE Calls**: Nomad backend never directly calls WISE API
3. **Builder Pattern**: Follow Franco's proven `fireModel.js` pattern for FGMJ generation
4. **MapBox Integration**: Convert ModelingResult to GeoJSON for visualization
5. **Deployment Modes**: Support both SAN and ACN deployment patterns
6. **Docker Architecture**: Leverage WiseGuy's proven container patterns
7. **Future-Proof**: Zero code changes required when transitioning to FireSTARR

**Implementation Checklist:**

- [ ] Install `wiseguy-fire-engine-abstraction` npm package
- [ ] Initialize EngineManager in Nomad backend
- [ ] Implement wizard parameter transformation
- [ ] Create backend API routes for modeling execution
- [ ] Implement asynchronous job processing
- [ ] Build OutputProcessor for MapBox GeoJSON conversion
- [ ] Create frontend visualization components
- [ ] Configure deployment mode (SAN/ACN)
- [ ] Set up Docker architecture
- [ ] Test with real fire scenarios

**References:**

- WiseGuy Repository: `/Users/franconogarin/localcode/wiseguy/`
- Fire Engine Abstraction Architecture: `fire_modeling_system_architecture.md`
- WISE Engine Implementation: `src/engines/WISEEngine.ts`
- Docker Architecture: `docker-compose.yml`

---

**Document Maintenance:**

This document should be updated when:
- Fire Engine Abstraction Layer API changes
- New deployment patterns are established
- FireSTARR engine implementation begins
- MapBox visualization requirements evolve

**Contact:** Franco Nogarin - GNWT Fire Modeling SME, WiseGuy Project Lead
