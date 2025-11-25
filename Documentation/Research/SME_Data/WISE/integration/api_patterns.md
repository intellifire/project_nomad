# WISE Fire Modeling API Patterns

## Overview

This document details the Fire Engine Abstraction Layer patterns used in the WiseGuy repository. These patterns provide a blueprint for integrating WISE fire modeling into Project Nomad while maintaining the flexibility to support future engines like FireSTARR.

**Source Repository**: `/Users/franconogarin/localcode/wiseguy/`

**Key Principle**: User applications interact with a standardized interface; the specific fire modeling engine (WISE, FireSTARR, etc.) is an implementation detail that can be swapped without client code changes.

---

## Architecture Pattern

### Core Abstraction Flow

```
User Code → EngineManager → FireModelingEngine Interface → Specific Engine (WISE, FireSTARR, etc.)
```

**Benefits**:
- Zero client impact when switching engines
- Type-safe contracts via TypeScript interfaces
- Capability-based feature detection
- Standardized result formats across all engines
- Health monitoring and validation built-in

### Component Layers

```
┌─────────────────────────────────────────────────────┐
│           Application Layer                         │
│   (Project Nomad, Custom Apps, Web Components)      │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│         Fire Engine Abstraction Layer               │
│  ┌───────────────┐  ┌────────────────────────────┐  │
│  │ EngineManager │  │ FireModelingEngine         │  │
│  │ (Orchestrator)│  │ (Interface Contract)       │  │
│  └───────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│         Engine Implementations                      │
│  ┌───────────────┐  ┌────────────────────────────┐  │
│  │  WISEEngine   │  │  FireSTARREngine (Future)  │  │
│  │               │  │                            │  │
│  └───────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## FireModelingEngine Interface Contract

### Interface Definition

Every fire modeling engine must implement this standardized contract:

```typescript
export interface FireModelingEngine {
  /**
   * Engine identification
   */
  getName(): string;
  getVersion(): string;
  getCapabilities(): EngineCapabilities;

  /**
   * Core modeling methods
   */
  pointIgnition(
    lat: number,
    lon: number,
    duration: number,
    options?: ModelingOptions
  ): Promise<ModelingResult>;

  polygonIgnition(
    coordinates: PolygonCoordinates,
    duration: number,
    options?: ModelingOptions
  ): Promise<ModelingResult>;

  lineIgnition(
    coordinates: LineCoordinates,
    duration: number,
    options?: ModelingOptions
  ): Promise<ModelingResult>;

  existingFire(
    fireId: string,
    duration: number,
    options?: ModelingOptions
  ): Promise<ModelingResult>;

  /**
   * Health and configuration
   */
  validateConfiguration(): Promise<ValidationResult>;
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Job management (optional advanced features)
   */
  cancelJob?(jobId: string): Promise<boolean>;
  getJobStatus?(jobId: string): Promise<ModelingResult>;
  listActiveJobs?(): Promise<string[]>;
}
```

**Key Points**:
- Async/Promise-based: All modeling operations are asynchronous
- Standardized geometry types: Point, Polygon, Line, Existing Fire
- Optional parameters: `ModelingOptions` provides advanced configuration
- Health checks: Validation and connection testing built into interface
- Optional job management: Advanced engines can implement job control

### Interface Implementation Example (WISE)

```typescript
export class WISEEngine implements FireModelingEngine {
  private name: string = 'WISE';
  private version: string = '1.0.6-beta.5';
  private isInitialized: boolean = false;

  getName(): string {
    return this.name;
  }

  getVersion(): string {
    return this.version;
  }

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
      statisticsOutputs: true
    };
  }

  async pointIgnition(
    lat: number,
    lon: number,
    duration: number,
    options?: ModelingOptions
  ): Promise<ModelingResult> {
    try {
      const jobId = this.generateJobId('point');
      const startTime = new Date();

      // Create WISE job using wise_js_api + Builder
      const wiseJob = await this.createWISEPointIgnitionJob(lat, lon, duration, options);

      // Execute the job
      const wiseResult = await this.executeWISEJob(wiseJob);

      // Transform WISE result to standardized format
      return await this.transformWISEResult(wiseResult, {
        jobId,
        startTime,
        ignitionType: 'point',
        ignitionData: { lat, lon },
        duration,
        options: options || {}
      });
    } catch (error) {
      return this.createErrorResult('point', { lat, lon }, duration, error);
    }
  }

  // Other methods follow same pattern...
}
```

**Pattern Notes**:
1. **Error Handling**: Try/catch wraps all operations, returns standardized error results
2. **Job ID Generation**: Unique identifiers for tracking and retrieval
3. **WISE-Specific Logic**: Hidden in private methods
4. **Result Transformation**: WISE outputs converted to standard `ModelingResult` format
5. **Metadata Preservation**: Original request parameters stored in result metadata

---

## EngineManager Usage Patterns

### Basic Setup and Registration

```typescript
import { EngineManager, WISEEngine } from 'wiseguy-fire-engine-abstraction';

// Create the manager
const manager = new EngineManager();

// Create and register WISE engine
const wiseEngine = new WISEEngine({
  host: 'localhost',
  port: 8080,
  timeout: 30000
});

// Registration includes automatic validation
await manager.registerEngine(wiseEngine);

// Set as active engine (includes connection test)
await manager.setActiveEngine('WISE');
```

**Registration Process**:
1. Engine configuration validation via `validateConfiguration()`
2. If validation fails, registration throws error with details
3. Successfully registered engines added to internal registry
4. Multiple engines can be registered simultaneously

**Activation Process**:
1. Configuration re-validation
2. Connection test via `testConnection()`
3. If either fails, activation throws error
4. Only one active engine at a time
5. Active engine used for all subsequent modeling jobs

### Executing Modeling Jobs

```typescript
// Point ignition - simplest case
const pointResult = await manager.executeModelingJob('point', {
  lat: 45.0,
  lon: -114.0,
  duration: 120  // minutes
});

// Polygon ignition with coordinates
const polygonResult = await manager.executeModelingJob('polygon', {
  coordinates: {
    exterior: [
      { lat: 45.0, lon: -114.0 },
      { lat: 45.1, lon: -114.0 },
      { lat: 45.1, lon: -113.9 },
      { lat: 45.0, lon: -113.9 },
      { lat: 45.0, lon: -114.0 }  // Close the polygon
    ]
  },
  duration: 180
});

// With advanced options
const advancedResult = await manager.executeModelingJob('point', {
  lat: 45.0,
  lon: -114.0,
  duration: 120
}, {
  weather: {
    temperature: 25,      // Celsius
    humidity: 40,         // percentage
    windSpeed: 15,        // km/h
    windDirection: 270    // degrees
  },
  fuelType: 'C2',
  outputFormats: ['kml', 'shapefile', 'statistics']
});
```

**Job Execution Flow**:
1. Manager checks for active engine
2. Verifies engine supports requested job type via capabilities
3. Routes to appropriate engine method
4. Returns standardized `ModelingResult`
5. Errors thrown with descriptive messages

### Capability-Based Feature Detection

```typescript
// Get active engine capabilities
const capabilities = manager.getActiveEngine()?.getCapabilities();

// Conditional feature availability
if (capabilities?.fuelPatches) {
  // Show advanced fuel patch UI
}

if (capabilities?.multipleScenarios) {
  // Enable batch scenario modeling
}

// Check before execution
const jobType = 'polygon';
if (!capabilities?.[`${jobType}Ignition`]) {
  throw new Error(`Active engine does not support ${jobType} ignition`);
}
```

**Capabilities Object**:
```typescript
interface EngineCapabilities {
  pointIgnition: boolean;
  polygonIgnition: boolean;
  lineIgnition: boolean;
  existingFireModeling: boolean;
  advancedBurningConditions: boolean;
  fuelPatches: boolean;
  weatherPatches: boolean;
  multipleScenarios: boolean;
  statisticsOutputs: boolean;
}
```

### Multi-Engine Management

```typescript
// Register multiple engines
await manager.registerEngine(new WISEEngine());
await manager.registerEngine(new FireSTARREngine());

// List all available engines
const engines = manager.listEngines();
// ['WISE', 'FireSTARR']

// Get specific engine
const wise = manager.getEngine('WISE');

// Switch active engine
await manager.setActiveEngine('FireSTARR');

// Unregister engine
await manager.unregisterEngine('WISE');
```

### Health Monitoring

```typescript
// Validate all registered engines
const validationResults = await manager.validateAllEngines();
validationResults.forEach((result, engineName) => {
  if (!result.valid) {
    console.error(`${engineName} validation failed:`, result.errors);
  }
});

// Test all connections
const connectionResults = await manager.testAllConnections();
connectionResults.forEach((result, engineName) => {
  console.log(`${engineName}: ${result.connected ? 'Connected' : 'Failed'}`);
  console.log(`  Latency: ${result.latency}ms`);
});

// Comprehensive health summary
const health = await manager.getEngineHealthSummary();
console.log(`Total engines: ${health.totalEngines}`);
console.log(`Valid: ${health.validEngines}`);
console.log(`Connected: ${health.connectedEngines}`);
console.log(`Active: ${health.activeEngine}`);

health.engines.forEach(engine => {
  console.log(`${engine.name} v${engine.version}:`);
  console.log(`  Valid: ${engine.valid}`);
  console.log(`  Connected: ${engine.connected}`);
  console.log(`  Capabilities: ${engine.capabilities.join(', ')}`);
});
```

**Health Summary Structure**:
```typescript
{
  totalEngines: number;
  validEngines: number;
  connectedEngines: number;
  activeEngine: string | null;
  engines: Array<{
    name: string;
    version: string;
    valid: boolean;
    connected: boolean;
    capabilities: string[];
  }>;
}
```

---

## WISE Builder Integration Pattern

### FGMJ Generation via wise_js_api

The WISEEngine uses the WISE Builder pattern to generate FGMJ (Fire Growth Model Job) files:

```typescript
private async createWISEPointIgnitionJob(
  lat: number,
  lon: number,
  duration: number,
  options?: ModelingOptions
): Promise<any> {
  const modeller = require('wise_js_api');

  // Initialize WISE model
  const prom = new modeller.wise.WISE();
  prom.setName(`Point Ignition ${lat},${lon} - ${duration}min`);

  // Configure point ignition
  const pointIgnition = prom.addPointIgnition(
    new modeller.globals.LatLon(lat, lon),
    new Date().toISOString()
  );

  // Set duration and basic scenario
  const scenario = prom.addScenario();
  scenario.setName('Point Ignition Scenario');
  scenario.setStartTime(new Date().toISOString());
  scenario.setEndTime(new Date(Date.now() + duration * 60000).toISOString());

  // Create job folder and FGMJ via Builder
  const wrapper = await prom.beginJobPromise();
  const jobName = wrapper.name.replace(/^\s+|\s+$/g, "");

  return {
    jobName,
    jobPath: `${process.env.PROJECT_JOBS_FOLDER}/${jobName}`,
    fgmjPath: `${process.env.PROJECT_JOBS_FOLDER}/${jobName}/job.fgmj`
  };
}
```

**Job Structure Created by Builder**:
```
job_20250625064422915/
├── Inputs/
│   ├── fuel_grid.tif
│   ├── elevation.tif
│   └── weather_stream.json
├── Outputs/
│   └── (populated after WISE execution)
├── job.fgmj
└── status.json
```

**Key Points**:
- Timestamped job folders ensure uniqueness
- Builder generates complete FGMJ file with all parameters
- Job path structure follows WISE requirements
- Status tracking file included for monitoring

### WISE Execution Pattern

```typescript
private async executeWISEJob(wiseJob: any): Promise<any> {
  const { jobName, jobPath, fgmjPath } = wiseJob;

  console.log(`🚀 Executing WISE job: ${jobName}`);
  console.log(`📁 Job path: ${jobPath}`);
  console.log(`📄 FGMJ file: ${fgmjPath}`);

  // Verify FGMJ file exists
  const fs = require('fs');
  if (!fs.existsSync(fgmjPath)) {
    throw new Error(`FGMJ file not found: ${fgmjPath}`);
  }

  // WISE execution via shell script (implementation specific)
  // Could use Docker container, native WISE, or remote execution
  // Returns job metadata and output locations

  return {
    jobName,
    jobPath,
    fgmjPath,
    status: 'fgmj_created',
    message: 'FGMJ file created successfully by Builder'
  };
}
```

---

## Async Job Submission and Monitoring

### Promise-Based Async Pattern

All modeling operations return Promises for async handling:

```typescript
// Fire and forget
manager.executeModelingJob('point', { lat: 45.0, lon: -114.0, duration: 120 });

// Wait for completion
const result = await manager.executeModelingJob('point', {
  lat: 45.0,
  lon: -114.0,
  duration: 120
});
console.log(`Job completed: ${result.jobId}`);

// Handle errors
try {
  const result = await manager.executeModelingJob('point', params);
} catch (error) {
  console.error('Modeling failed:', error.message);
}

// Parallel job execution (multiple independent jobs)
const [result1, result2, result3] = await Promise.all([
  manager.executeModelingJob('point', params1),
  manager.executeModelingJob('point', params2),
  manager.executeModelingJob('point', params3)
]);
```

### Optional Job Management (Advanced)

Engines can optionally implement extended job management:

```typescript
// Check if engine supports job management
const engine = manager.getActiveEngine();
if (engine?.cancelJob) {
  // Cancel running job
  const cancelled = await engine.cancelJob('wise-point-12345');
}

if (engine?.getJobStatus) {
  // Poll for status
  const status = await engine.getJobStatus('wise-point-12345');
  console.log(`Job status: ${status.status}`);

  if (status.status === 'running') {
    // Check again later
    setTimeout(async () => {
      const updated = await engine.getJobStatus('wise-point-12345');
      console.log(`Updated status: ${updated.status}`);
    }, 5000);
  }
}

if (engine?.listActiveJobs) {
  // Get all active jobs
  const activeJobs = await engine.listActiveJobs();
  console.log(`Active jobs: ${activeJobs.join(', ')}`);
}
```

**Job Status Polling Example**:
```typescript
async function waitForCompletion(
  engine: FireModelingEngine,
  jobId: string,
  pollInterval: number = 5000
): Promise<ModelingResult> {
  return new Promise((resolve, reject) => {
    const poll = setInterval(async () => {
      try {
        const result = await engine.getJobStatus!(jobId);

        if (result.status === 'completed') {
          clearInterval(poll);
          resolve(result);
        } else if (result.status === 'failed') {
          clearInterval(poll);
          reject(new Error(result.error?.message || 'Job failed'));
        }
        // If 'running', continue polling
      } catch (error) {
        clearInterval(poll);
        reject(error);
      }
    }, pollInterval);
  });
}

// Usage
const result = await waitForCompletion(engine, jobId);
```

---

## Error Handling Patterns

### Standardized Error Results

Instead of throwing exceptions, engines return error results:

```typescript
private createErrorResult(
  ignitionType: string,
  ignitionData: any,
  duration: number,
  error: any
): ModelingResult {
  const now = new Date();

  return {
    jobId: this.generateJobId(ignitionType),
    status: 'failed',
    engine: this.name,
    engineVersion: this.version,
    startTime: now,
    endTime: now,
    duration: 0,
    error: {
      code: 'WISE_EXECUTION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown WISE error',
      details: error
    },
    metadata: {
      ignitionType: ignitionType as any,
      ignitionData,
      duration,
      options: {}
    }
  };
}
```

**Error Result Structure**:
```typescript
interface ModelingResult {
  jobId: string;
  status: 'failed';  // vs 'running' | 'completed' | 'cancelled'
  engine: string;
  engineVersion: string;
  startTime: Date;
  endTime: Date;
  duration: 0;
  error: {
    code: string;          // Machine-readable error code
    message: string;       // Human-readable description
    details?: any;         // Original error object
  };
  metadata: {
    ignitionType: 'point' | 'polygon' | 'line' | 'existing';
    ignitionData: any;
    duration: number;
    options: any;
  };
}
```

### Error Handling in Client Code

```typescript
// Check result status
const result = await manager.executeModelingJob('point', params);

if (result.status === 'failed') {
  console.error(`Job ${result.jobId} failed:`);
  console.error(`  Code: ${result.error?.code}`);
  console.error(`  Message: ${result.error?.message}`);

  // Handle specific error types
  switch (result.error?.code) {
    case 'WISE_EXECUTION_ERROR':
      // WISE-specific handling
      break;
    case 'VALIDATION_ERROR':
      // Invalid input handling
      break;
    default:
      // Generic error handling
  }
} else if (result.status === 'completed') {
  // Success handling
  console.log(`Total area burned: ${result.statistics?.totalAreaBurned} ha`);
}
```

### Validation Errors

```typescript
// Engine validation
const validation = await engine.validateConfiguration();
if (!validation.valid) {
  console.error('Engine validation failed:');
  validation.errors.forEach(error => console.error(`  - ${error}`));

  if (validation.warnings) {
    console.warn('Warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
}

// Connection errors
const connection = await engine.testConnection();
if (!connection.connected) {
  console.error('Engine connection failed:');
  connection.errors.forEach(error => console.error(`  - ${error}`));
  console.log(`Latency: ${connection.latency}ms`);
}
```

---

## TypeScript Type Patterns

### Core Type Definitions

```typescript
// Coordinate types
export interface Coordinates {
  lat: number;
  lon: number;
}

export interface PolygonCoordinates {
  exterior: Coordinates[];
  holes?: Coordinates[][];  // Optional interior rings
}

export interface LineCoordinates {
  points: Coordinates[];
}

// Result types
export interface ModelingResult {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  engine: string;
  engineVersion: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;  // milliseconds

  // Fire perimeter data (optional)
  perimeters?: {
    time: Date;
    polygon: PolygonCoordinates;
    area: number;      // hectares
    perimeter: number; // meters
  }[];

  // Statistics (optional)
  statistics?: {
    totalAreaBurned: number;       // hectares
    maxRateOfSpread: number;       // m/min
    maxFireIntensity: number;      // kW/m
    totalFirelineIntensity: number; // kW/m
    finalPerimeter: number;        // meters
  };

  // Output files (optional)
  outputs?: {
    kmlFiles?: string[];
    shapeFiles?: string[];
    gridFiles?: string[];
    statisticsFiles?: string[];
    rawData?: any;
  };

  // Error info (only on failure)
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  // Always present
  metadata: {
    ignitionType: 'point' | 'polygon' | 'line' | 'existing';
    ignitionData: any;
    duration: number;  // minutes
    options: any;
    engineSpecificData?: any;
  };
}

// Options type
export interface ModelingOptions {
  // Weather and environmental conditions
  weather?: {
    temperature?: number;   // Celsius
    humidity?: number;      // percentage
    windSpeed?: number;     // km/h
    windDirection?: number; // degrees
    precipitation?: number; // mm
  };

  // Fuel and terrain
  fuelType?: string;
  elevation?: number;  // meters
  slope?: number;      // percentage
  aspect?: number;     // degrees

  // Advanced modeling options
  fuelPatches?: any[];
  weatherPatches?: any[];
  burningConditions?: any;

  // Output preferences
  outputFormats?: ('kml' | 'shapefile' | 'grid' | 'statistics')[];
  includeStatistics?: boolean;
  includePerimeters?: boolean;

  // Engine-specific options (opaque to abstraction layer)
  engineOptions?: {
    [key: string]: any;
  };
}
```

### Type Safety in Practice

```typescript
// Type checking at compile time
function analyzeResult(result: ModelingResult): void {
  // TypeScript ensures these properties exist
  console.log(`Job ${result.jobId} by ${result.engine} v${result.engineVersion}`);

  // Optional chaining for optional properties
  const burned = result.statistics?.totalAreaBurned ?? 0;
  const ros = result.statistics?.maxRateOfSpread ?? 0;

  // Type narrowing based on status
  if (result.status === 'failed' && result.error) {
    // TypeScript knows result.error exists here
    console.error(result.error.message);
  }

  // Array type safety
  result.perimeters?.forEach(p => {
    // TypeScript knows p has time, polygon, area, perimeter
    console.log(`Perimeter at ${p.time}: ${p.area} ha`);
  });
}

// Generic type for engine-specific data
interface WISESpecificData {
  builderJobName: string;
  jobPath: string;
  fgmjPath: string;
  outputsPath: string;
}

// Type assertion when you know the engine
function getWISEJobPath(result: ModelingResult): string | undefined {
  if (result.engine === 'WISE') {
    const wiseData = result.metadata.engineSpecificData as WISESpecificData;
    return wiseData?.jobPath;
  }
  return undefined;
}
```

---

## Adding New Engine Implementations

### Step-by-Step Process

**1. Create Engine Class**

```typescript
import { FireModelingEngine } from '../interfaces/FireModelingEngine';
import {
  EngineCapabilities,
  ValidationResult,
  ConnectionTestResult,
  ModelingResult,
  ModelingOptions,
  PolygonCoordinates,
  LineCoordinates
} from '../types';

export class MyNewEngine implements FireModelingEngine {
  private name: string = 'MyEngine';
  private version: string = '1.0.0';

  getName(): string {
    return this.name;
  }

  getVersion(): string {
    return this.version;
  }

  getCapabilities(): EngineCapabilities {
    return {
      pointIgnition: true,
      polygonIgnition: true,
      lineIgnition: false,        // This engine doesn't support lines
      existingFireModeling: true,
      advancedBurningConditions: true,
      fuelPatches: false,
      weatherPatches: false,
      multipleScenarios: false,
      statisticsOutputs: true
    };
  }

  // Implement required methods...
}
```

**2. Implement Required Methods**

```typescript
async pointIgnition(
  lat: number,
  lon: number,
  duration: number,
  options?: ModelingOptions
): Promise<ModelingResult> {
  try {
    // 1. Generate unique job ID
    const jobId = `myengine-point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    // 2. Translate to engine-specific format
    const engineJob = this.translateToEngineFormat({
      type: 'point',
      lat,
      lon,
      duration,
      options
    });

    // 3. Execute using engine's API/CLI
    const engineResult = await this.executeEngineJob(engineJob);

    // 4. Transform result to standard format
    const result: ModelingResult = {
      jobId,
      status: 'completed',
      engine: this.name,
      engineVersion: this.version,
      startTime,
      endTime: new Date(),
      duration: Date.now() - startTime.getTime(),

      statistics: {
        totalAreaBurned: engineResult.totalArea,
        maxRateOfSpread: engineResult.maxROS,
        maxFireIntensity: engineResult.maxFI,
        totalFirelineIntensity: engineResult.totalFLI,
        finalPerimeter: engineResult.finalPerim
      },

      outputs: {
        kmlFiles: engineResult.outputs.kml,
        shapeFiles: engineResult.outputs.shp,
        statisticsFiles: engineResult.outputs.stats
      },

      metadata: {
        ignitionType: 'point',
        ignitionData: { lat, lon },
        duration,
        options: options || {},
        engineSpecificData: {
          engineJobId: engineResult.jobId,
          engineVersion: engineResult.version
        }
      }
    };

    return result;
  } catch (error) {
    // 5. Return standardized error result
    return this.createErrorResult('point', { lat, lon }, duration, error);
  }
}

// Implement polygonIgnition, lineIgnition, existingFire similarly...
```

**3. Implement Health Check Methods**

```typescript
async validateConfiguration(): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  if (!process.env.MYENGINE_PATH) {
    errors.push('MYENGINE_PATH environment variable not set');
  }

  // Check required files exist
  const fs = require('fs');
  if (!fs.existsSync('/path/to/engine/binary')) {
    errors.push('Engine binary not found');
  }

  // Check permissions
  try {
    fs.accessSync('/path/to/engine/binary', fs.constants.X_OK);
  } catch {
    errors.push('Engine binary not executable');
  }

  // Warnings for optional features
  if (!process.env.MYENGINE_CACHE_DIR) {
    warnings.push('Cache directory not configured, performance may be reduced');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

async testConnection(): Promise<ConnectionTestResult> {
  const startTime = Date.now();

  try {
    // Ping engine or run minimal test
    const response = await this.engineHealthCheck();

    return {
      connected: true,
      latency: Date.now() - startTime,
      errors: [],
      engineInfo: {
        name: this.name,
        version: this.version,
        status: response.ready ? 'ready' : 'busy'
      }
    };
  } catch (error) {
    return {
      connected: false,
      latency: -1,
      errors: [error instanceof Error ? error.message : 'Connection test failed']
    };
  }
}
```

**4. Register and Use**

```typescript
import { EngineManager } from './core/EngineManager';
import { MyNewEngine } from './engines/MyNewEngine';

const manager = new EngineManager();
const myEngine = new MyNewEngine();

await manager.registerEngine(myEngine);
await manager.setActiveEngine('MyEngine');

const result = await manager.executeModelingJob('point', {
  lat: 45.0,
  lon: -114.0,
  duration: 120
});
```

### Engine Implementation Checklist

- [ ] Implement all required interface methods
- [ ] Handle all geometry types (point, polygon, line, existing)
- [ ] Return standardized `ModelingResult` format
- [ ] Implement error handling with standardized error results
- [ ] Implement `validateConfiguration()` to check setup
- [ ] Implement `testConnection()` to verify availability
- [ ] Document engine-specific capabilities
- [ ] Document engine-specific options in `engineOptions`
- [ ] Write unit tests for all methods
- [ ] Write integration tests with EngineManager
- [ ] Document installation and configuration requirements

---

## KML Enhancement Integration

### Brett Moore's KML Enhancement System

The abstraction layer includes utilities for enhanced KML output generation:

```typescript
import { KMLEnhancer } from './utils/KMLEnhancer';

// Enhance modeling result with KML features
const enhanced = await KMLEnhancer.enhanceModelingResult(result, {
  includeTimespan: true,      // Add time-aware features for animation
  generateLegend: true,       // Create legend overlay
  simplifyGeometry: true,     // Optimize geometry for performance
  colorRamp: ['#FF0000', '#FFFF00', '#00FF00'],  // Custom colors
  outputDirectory: './output'
});

console.log(`KML: ${enhanced.kmlPath}`);
console.log(`Legend: ${enhanced.legendPath}`);
console.log(`KMZ: ${enhanced.kmzPath}`);
```

**KML Enhancement Features**:
- **Time-Aware Placemarks**: Adds `<TimeSpan>` elements for animation in Google Earth
- **Legend Generation**: Creates graphical legend overlays
- **Color Ramps**: Customizable color gradients for fire progression
- **Geometry Simplification**: Optimizes complex geometries
- **Metadata Enrichment**: Adds fire statistics to placemark descriptions

### Brett Moore Integration Utilities

```typescript
import { BrettMooreIntegration } from './utils/KMLEnhancer';

// Convert shapefile to KML using Brett's R system
const { kmlPath, legendPath } = await BrettMooreIntegration.convertShapefileToKML(
  '/path/to/fire_perimeter.shp',
  './output'
);

// Add timespan to existing KML
const enhancedPath = await BrettMooreIntegration.addTimespanToKML(
  '/path/to/fire.kml'
);
```

**Note**: These utilities provide interfaces to Brett Moore's R-based KML enhancement system. In production, they execute actual R scripts. In the TypeScript abstraction, they provide typed interfaces and result handling.

---

## Complete Usage Example

### Full Workflow with Error Handling

```typescript
import { EngineManager, WISEEngine, KMLEnhancer } from 'wiseguy-fire-engine-abstraction';

async function runFireModel() {
  try {
    // 1. Setup
    const manager = new EngineManager();
    const wiseEngine = new WISEEngine({
      host: process.env.WISE_HOST || 'localhost',
      port: parseInt(process.env.WISE_PORT || '8080'),
      timeout: 30000
    });

    // 2. Register and validate
    console.log('Registering WISE engine...');
    await manager.registerEngine(wiseEngine);

    console.log('Testing engine health...');
    const health = await manager.getEngineHealthSummary();
    console.log(`Engines: ${health.totalEngines}`);
    console.log(`Valid: ${health.validEngines}`);
    console.log(`Connected: ${health.connectedEngines}`);

    if (health.validEngines === 0) {
      throw new Error('No valid engines available');
    }

    // 3. Set active engine
    console.log('Activating WISE engine...');
    await manager.setActiveEngine('WISE');

    // 4. Execute modeling job
    console.log('Executing fire model...');
    const result = await manager.executeModelingJob('point', {
      lat: 45.0,
      lon: -114.0,
      duration: 120
    }, {
      weather: {
        temperature: 25,
        humidity: 40,
        windSpeed: 15,
        windDirection: 270
      },
      fuelType: 'C2',
      outputFormats: ['kml', 'shapefile', 'statistics']
    });

    // 5. Check result
    if (result.status === 'failed') {
      console.error('Modeling failed:');
      console.error(`  Code: ${result.error?.code}`);
      console.error(`  Message: ${result.error?.message}`);
      return;
    }

    // 6. Process successful result
    console.log(`Job ${result.jobId} completed successfully!`);
    console.log(`Engine: ${result.engine} v${result.engineVersion}`);
    console.log(`Duration: ${result.duration}ms`);

    if (result.statistics) {
      console.log('\nFire Statistics:');
      console.log(`  Total Area Burned: ${result.statistics.totalAreaBurned} ha`);
      console.log(`  Max Rate of Spread: ${result.statistics.maxRateOfSpread} m/min`);
      console.log(`  Max Fire Intensity: ${result.statistics.maxFireIntensity} kW/m`);
      console.log(`  Final Perimeter: ${result.statistics.finalPerimeter} m`);
    }

    // 7. Enhance KML output
    if (result.outputs?.kmlFiles && result.outputs.kmlFiles.length > 0) {
      console.log('\nEnhancing KML output...');
      const enhanced = await KMLEnhancer.enhanceModelingResult(result, {
        includeTimespan: true,
        generateLegend: true,
        outputDirectory: './fire_outputs'
      });

      console.log(`Enhanced KML: ${enhanced.kmlPath}`);
      console.log(`Legend: ${enhanced.legendPath}`);
      console.log(`KMZ Package: ${enhanced.kmzPath}`);
    }

    // 8. Return result for further processing
    return result;

  } catch (error) {
    console.error('Fire modeling workflow failed:');
    console.error(error instanceof Error ? error.message : error);
    throw error;
  }
}

// Run the workflow
runFireModel()
  .then(result => {
    console.log('\n✅ Fire modeling completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fire modeling failed');
    process.exit(1);
  });
```

---

## Project Nomad Integration Recommendations

### Abstraction Layer Usage in Nomad

```typescript
// In Project Nomad backend

import { EngineManager, WISEEngine, FireSTARREngine } from 'wiseguy-fire-engine-abstraction';

class NomadFireModelingService {
  private engineManager: EngineManager;

  constructor() {
    this.engineManager = new EngineManager();
  }

  async initialize() {
    // Register both WISE and FireSTARR
    await this.engineManager.registerEngine(new WISEEngine());
    await this.engineManager.registerEngine(new FireSTARREngine());

    // Set based on configuration
    const preferredEngine = process.env.NOMAD_FIRE_ENGINE || 'WISE';
    await this.engineManager.setActiveEngine(preferredEngine);
  }

  async executeModelFromWizard(wizardData: WizardData): Promise<ModelingResult> {
    // Extract geometry type from wizard
    const { geometryType, coordinates, duration, options } = wizardData;

    // Map wizard data to abstraction layer parameters
    const parameters = this.mapWizardToEngineParameters(wizardData);

    // Execute via abstraction layer
    const result = await this.engineManager.executeModelingJob(
      geometryType,
      parameters,
      options
    );

    // Store in Nomad database
    await this.storeModelResult(result);

    // Trigger notifications
    await this.notifyCompletion(result);

    return result;
  }

  async getEngineCapabilities(): Promise<EngineCapabilities> {
    const engine = this.engineManager.getActiveEngine();
    return engine?.getCapabilities() || {};
  }

  async switchEngine(engineName: string): Promise<void> {
    await this.engineManager.setActiveEngine(engineName);
  }
}
```

### Configuration-Based Engine Selection

```typescript
// In Nomad configuration system

interface NomadConfiguration {
  deployment: {
    mode: 'SAN' | 'ACN';
    agencyId?: string;
  };
  fireModeling: {
    engine: 'WISE' | 'FireSTARR';
    engineConfig: {
      host?: string;
      port?: number;
      timeout?: number;
    };
    // Suppress engines not available/desired
    suppressEngines?: string[];
  };
}

// Load configuration and setup engines
async function setupFireModeling(config: NomadConfiguration) {
  const manager = new EngineManager();

  // Register engines not in suppress list
  if (!config.fireModeling.suppressEngines?.includes('WISE')) {
    await manager.registerEngine(new WISEEngine(config.fireModeling.engineConfig));
  }

  if (!config.fireModeling.suppressEngines?.includes('FireSTARR')) {
    await manager.registerEngine(new FireSTARREngine(config.fireModeling.engineConfig));
  }

  // Set active engine from config
  await manager.setActiveEngine(config.fireModeling.engine);

  return manager;
}
```

---

## Testing Patterns

### Unit Test Example

```typescript
import { WISEEngine } from '../src/engines/WISEEngine';
import { EngineManager } from '../src/core/EngineManager';

describe('WISE Engine', () => {
  let engine: WISEEngine;

  beforeEach(() => {
    engine = new WISEEngine();
  });

  test('should have correct name and version', () => {
    expect(engine.getName()).toBe('WISE');
    expect(engine.getVersion()).toBe('1.0.6-beta.5');
  });

  test('should report comprehensive capabilities', () => {
    const capabilities = engine.getCapabilities();
    expect(capabilities.pointIgnition).toBe(true);
    expect(capabilities.polygonIgnition).toBe(true);
    expect(capabilities.lineIgnition).toBe(true);
    expect(capabilities.existingFireModeling).toBe(true);
  });

  test('should validate configuration', async () => {
    const validation = await engine.validateConfiguration();
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  test('should execute point ignition', async () => {
    const result = await engine.pointIgnition(45.0, -114.0, 120);

    expect(result.jobId).toBeDefined();
    expect(result.engine).toBe('WISE');
    expect(result.status).toBe('completed');
    expect(result.metadata.ignitionType).toBe('point');
  });
});
```

### Integration Test Example

```typescript
describe('Engine Manager Integration', () => {
  let manager: EngineManager;
  let wiseEngine: WISEEngine;

  beforeEach(async () => {
    manager = new EngineManager();
    wiseEngine = new WISEEngine();
    await manager.registerEngine(wiseEngine);
    await manager.setActiveEngine('WISE');
  });

  test('should execute modeling job through manager', async () => {
    const result = await manager.executeModelingJob('point', {
      lat: 45.0,
      lon: -114.0,
      duration: 120
    });

    expect(result.engine).toBe('WISE');
    expect(result.status).toBe('completed');
  });

  test('should handle multiple engines', async () => {
    const firestarrEngine = new FireSTARREngine();
    await manager.registerEngine(firestarrEngine);

    const engines = manager.listEngines();
    expect(engines).toContain('WISE');
    expect(engines).toContain('FireSTARR');

    // Switch engines
    await manager.setActiveEngine('FireSTARR');
    expect(manager.getActiveEngine()?.getName()).toBe('FireSTARR');
  });
});
```

---

## Summary

The Fire Engine Abstraction Layer provides a robust, type-safe pattern for integrating fire modeling engines into applications. Key benefits:

1. **Engine Independence**: Applications are decoupled from specific engine implementations
2. **Type Safety**: Full TypeScript support with comprehensive type definitions
3. **Standardization**: Consistent result formats across all engines
4. **Health Monitoring**: Built-in validation and connection testing
5. **Extensibility**: Simple pattern for adding new engines
6. **Error Handling**: Standardized error reporting and recovery
7. **Async Operations**: Promise-based async patterns throughout
8. **Production Ready**: Proven patterns from WiseGuy implementation

For Project Nomad integration, this abstraction layer enables:
- Configuration-based engine selection
- Future-proof migration from WISE to FireSTARR
- Multi-engine support for different use cases
- Consistent API regardless of underlying engine
- Enhanced outputs via KML enhancement system

**Source Repository**: `/Users/franconogarin/localcode/wiseguy/`
**Key Files**:
- `/Users/franconogarin/localcode/wiseguy/src/interfaces/FireModelingEngine.ts`
- `/Users/franconogarin/localcode/wiseguy/src/core/EngineManager.ts`
- `/Users/franconogarin/localcode/wiseguy/src/engines/WISEEngine.ts`
- `/Users/franconogarin/localcode/wiseguy/src/types/index.ts`
- `/Users/franconogarin/localcode/wiseguy/src/utils/KMLEnhancer.ts`
