# WISE Fire Engine Abstraction Layer - Component Map

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Source Repository**: `/Users/franconogarin/localcode/wiseguy/`
**Package Version**: 1.0.0-alpha.1

## Overview

This document provides a complete inventory of all components within the WISE Fire Engine Abstraction Layer (WiseGuy repository). This abstraction layer serves as the foundation for Project Nomad's multi-engine fire modeling architecture, enabling seamless switching between WISE, FireSTARR, and future fire modeling engines.

## Architecture Pattern

```
User Code → EngineManager → FireModelingEngine Interface → Specific Engine Implementation
```

The system follows a pluggable architecture where:
- **User Code** interacts with a simple, standardized API
- **EngineManager** orchestrates job execution and engine lifecycle
- **FireModelingEngine Interface** defines the contract all engines must implement
- **Specific Engines** (WISE, FireSTARR) provide actual fire modeling capabilities

---

## Directory Structure

```
wiseguy/
├── src/                          # Core TypeScript source code
│   ├── interfaces/               # Interface definitions
│   │   └── FireModelingEngine.ts
│   ├── core/                     # Core orchestration logic
│   │   └── EngineManager.ts
│   ├── engines/                  # Engine implementations
│   │   └── WISEEngine.ts
│   ├── types/                    # Shared type definitions
│   │   └── index.ts
│   ├── utils/                    # Utility modules
│   │   └── KMLEnhancer.ts
│   └── index.ts                  # Package entry point
├── tests/                        # Test suite
│   ├── basic.test.ts
│   ├── EngineManager.test.ts
│   ├── WISEEngine.integration.test.ts
│   └── setup.ts
├── docker/                       # Docker deployment components
│   ├── README.md
│   ├── Dockerfile.dev
│   ├── Dockerfile.gateway
│   ├── .env.example
│   ├── gateway/
│   │   ├── gateway.js
│   │   └── package.json
│   └── scripts/
│       └── ssh-setup.sh
├── dist/                         # Compiled JavaScript output
├── demo.ts                       # Integration demonstration
├── docker-compose.yml            # Multi-service orchestration
├── package.json                  # NPM package configuration
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## Core Components

### 1. Interfaces (`src/interfaces/`)

#### FireModelingEngine.ts
**File**: `/Users/franconogarin/localcode/wiseguy/src/interfaces/FireModelingEngine.ts`
**Lines of Code**: 97
**Purpose**: Core interface contract that all fire modeling engines must implement

**Exports**:
- `FireModelingEngine` - Main interface for engine implementations
- `EngineManagerInterface` - Interface for the engine orchestration system

**Key Methods**:

```typescript
interface FireModelingEngine {
  // Identification
  getName(): string
  getVersion(): string
  getCapabilities(): EngineCapabilities

  // Core modeling methods
  pointIgnition(lat, lon, duration, options?): Promise<ModelingResult>
  polygonIgnition(coordinates, duration, options?): Promise<ModelingResult>
  lineIgnition(coordinates, duration, options?): Promise<ModelingResult>
  existingFire(fireId, duration, options?): Promise<ModelingResult>

  // Health and configuration
  validateConfiguration(): Promise<ValidationResult>
  testConnection(): Promise<ConnectionTestResult>

  // Optional job management
  cancelJob?(jobId): Promise<boolean>
  getJobStatus?(jobId): Promise<ModelingResult>
  listActiveJobs?(): Promise<string[]>
}
```

**Dependencies**:
- `../types` - All type definitions (Coordinates, EngineCapabilities, etc.)

**Integration Notes**:
- This interface is the foundation of the abstraction layer
- Any new fire modeling engine (FireSTARR, etc.) must implement this contract
- Optional methods (job management) allow engines to expose advanced features
- Type-safe contracts ensure consistent behavior across engines

---

### 2. Core Modules (`src/core/`)

#### EngineManager.ts
**File**: `/Users/franconogarin/localcode/wiseguy/src/core/EngineManager.ts`
**Lines of Code**: 265
**Purpose**: Central orchestration system for managing multiple fire modeling engines

**Class**: `EngineManager implements EngineManagerInterface`

**Key Responsibilities**:
- Engine registration and lifecycle management
- Active engine selection and validation
- Job execution routing to appropriate engine
- Health monitoring across all registered engines
- Capability verification and enforcement

**Key Methods**:

```typescript
class EngineManager {
  // Registration
  registerEngine(engine: FireModelingEngine): Promise<void>
  unregisterEngine(engineName: string): Promise<boolean>
  listEngines(): string[]
  getEngine(engineName: string): FireModelingEngine | null

  // Active engine management
  setActiveEngine(engineName: string): Promise<void>
  getActiveEngine(): FireModelingEngine | null

  // Job execution (routes to active engine)
  executeModelingJob(jobType, parameters, options?): Promise<ModelingResult>

  // Health monitoring
  validateAllEngines(): Promise<Map<string, ValidationResult>>
  testAllConnections(): Promise<Map<string, ConnectionTestResult>>
  getEngineHealthSummary(): Promise<HealthSummary>
}
```

**Internal State**:
- `private engines: Map<string, FireModelingEngine>` - Registry of all engines
- `private activeEngine: FireModelingEngine | null` - Currently selected engine

**Validation Logic**:
- Validates engine configuration before registration
- Tests connection before setting as active engine
- Verifies engine capabilities match requested job type
- Throws typed errors for invalid operations

**Dependencies**:
- `../interfaces/FireModelingEngine` - Interface definitions
- `../types` - Type definitions

**Integration Notes**:
- Single source of truth for engine management
- Prevents invalid engine states (disconnected active engines)
- Provides comprehensive health monitoring for system dashboards
- Project Nomad will use this for multi-engine support

---

### 3. Engine Implementations (`src/engines/`)

#### WISEEngine.ts
**File**: `/Users/franconogarin/localcode/wiseguy/src/engines/WISEEngine.ts`
**Lines of Code**: 462
**Purpose**: WISE fire modeling engine adapter using Builder pattern for FGMJ generation

**Class**: `WISEEngine implements FireModelingEngine`

**Key Features**:
- Wraps `wise_js_api` package (v1.0.6-beta.5)
- Uses Builder pattern to generate FGMJ (Fire Growth Model JSON) files
- Creates timestamped job folders with standard structure
- Integrates with shell script execution for actual WISE modeling

**Configuration**:
```typescript
constructor(config?: {
  host?: string
  port?: number
  timeout?: number
})
```

**Capabilities**:
```typescript
getCapabilities(): EngineCapabilities {
  pointIgnition: true
  polygonIgnition: true
  lineIgnition: true
  existingFireModeling: true
  advancedBurningConditions: true
  fuelPatches: true
  weatherPatches: true
  multipleScenarios: true
  statisticsOutputs: true
}
```

**Job Creation Process**:
1. Initialize WISE model via `wise_js_api.wise.WISE()`
2. Configure ignition geometry (point/polygon/line)
3. Set temporal parameters (start time, end time, duration)
4. Add scenarios and burning conditions
5. Execute `beginJobPromise()` to create job folder and FGMJ file
6. Return job metadata for shell execution

**Job Folder Structure**:
```
job_YYYYMMDDHHMMSSMMM/
├── job.fgmj              # Fire Growth Model JSON (generated by Builder)
├── Inputs/               # Input data files
├── Outputs/              # Model outputs (populated after execution)
└── status.json           # Job execution status
```

**Private Methods**:
- `initializeWISE()` - Initialize WISE client connection
- `performWISEValidation()` - WISE-specific validation logic
- `createWISEPointIgnitionJob()` - Builder pattern for point ignition FGMJ
- `createWISEPolygonIgnitionJob()` - Polygon ignition job creation
- `createWISELineIgnitionJob()` - Line ignition job creation
- `createWISEExistingFireJob()` - Existing fire continuation job
- `executeWISEJob()` - Job execution and FGMJ verification
- `transformWISEResult()` - Convert WISE output to standard format
- `createErrorResult()` - Standardized error handling
- `generateJobId()` - Unique job identifier generation

**Dependencies**:
- `wise_js_api` - WISE JavaScript API (external package)
- `../interfaces/FireModelingEngine` - Interface contract
- `../types` - Type definitions
- `fs` - File system operations (Node.js)

**Integration Notes**:
- Job folder creation follows existing WISE conventions
- FGMJ files compatible with WISE shell script execution
- Output transformation provides standardized results for KML enhancement
- Shell execution pattern allows ARM64 Mac to delegate to x86_64 WISE servers

---

### 4. Type Definitions (`src/types/`)

#### index.ts
**File**: `/Users/franconogarin/localcode/wiseguy/src/types/index.ts`
**Lines of Code**: 140
**Purpose**: Standardized data structures for fire modeling results and configurations

**Exported Types**:

**Geometric Types**:
```typescript
interface Coordinates {
  lat: number
  lon: number
}

interface PolygonCoordinates {
  exterior: Coordinates[]
  holes?: Coordinates[][]
}

interface LineCoordinates {
  points: Coordinates[]
}
```

**Capability and Health Types**:
```typescript
interface EngineCapabilities {
  pointIgnition: boolean
  polygonIgnition: boolean
  lineIgnition: boolean
  existingFireModeling: boolean
  advancedBurningConditions: boolean
  fuelPatches: boolean
  weatherPatches: boolean
  multipleScenarios: boolean
  statisticsOutputs: boolean
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

interface ConnectionTestResult {
  connected: boolean
  latency: number
  errors: string[]
  engineInfo?: {
    name: string
    version: string
    status: 'ready' | 'busy' | 'error'
  }
}
```

**Modeling Result Type**:
```typescript
interface ModelingResult {
  jobId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  engine: string
  engineVersion: string
  startTime: Date
  endTime?: Date
  duration?: number

  // Fire perimeter data (time series)
  perimeters?: Array<{
    time: Date
    polygon: PolygonCoordinates
    area: number      // hectares
    perimeter: number // meters
  }>

  // Fire statistics
  statistics?: {
    totalAreaBurned: number         // hectares
    maxRateOfSpread: number         // m/min
    maxFireIntensity: number        // kW/m
    totalFirelineIntensity: number  // kW/m
    finalPerimeter: number          // meters
  }

  // Output file paths
  outputs?: {
    kmlFiles?: string[]
    shapeFiles?: string[]
    gridFiles?: string[]
    statisticsFiles?: string[]
    rawData?: any
  }

  // Error information
  error?: {
    code: string
    message: string
    details?: any
  }

  // Metadata
  metadata: {
    ignitionType: 'point' | 'polygon' | 'line' | 'existing'
    ignitionData: any
    duration: number // minutes
    options: any
    engineSpecificData?: any
  }
}
```

**Modeling Options Type**:
```typescript
interface ModelingOptions {
  // Weather and environmental conditions
  weather?: {
    temperature?: number    // Celsius
    humidity?: number       // percentage
    windSpeed?: number      // km/h
    windDirection?: number  // degrees
    precipitation?: number  // mm
  }

  // Fuel and terrain
  fuelType?: string
  elevation?: number        // meters
  slope?: number            // percentage
  aspect?: number           // degrees

  // Advanced modeling
  fuelPatches?: any[]
  weatherPatches?: any[]
  burningConditions?: any

  // Output preferences
  outputFormats?: ('kml' | 'shapefile' | 'grid' | 'statistics')[]
  includeStatistics?: boolean
  includePerimeters?: boolean

  // Engine-specific options
  engineOptions?: {
    [key: string]: any
  }
}
```

**Job Parameters Type**:
```typescript
interface JobParameters {
  ignitionType: 'point' | 'polygon' | 'line' | 'existing'
  coordinates?: Coordinates | PolygonCoordinates | LineCoordinates
  fireId?: string  // for existing fire modeling
  duration: number // minutes
  options?: ModelingOptions
}
```

**Integration Notes**:
- All interfaces are exported from single `types/index.ts` for easy importing
- Type system ensures consistency across all engines
- Supports both simple and advanced use cases via optional fields
- Engine-specific data can be included via `engineOptions` and `engineSpecificData`
- Project Nomad will extend these types for additional UI requirements

---

### 5. Utility Modules (`src/utils/`)

#### KMLEnhancer.ts
**File**: `/Users/franconogarin/localcode/wiseguy/src/utils/KMLEnhancer.ts`
**Lines of Code**: 360
**Purpose**: KML output enhancement utilities inspired by Brett Moore's CFS visualization system

**Classes**:
- `KMLEnhancer` - Main enhancement class with static methods
- `BrettMooreIntegration` - Integration with Brett Moore's R-based KML system

**Key Features**:
- Time-aware KML generation with TimeSpan elements
- Color ramp application for fire progression visualization
- Legend generation (placeholder for image generation)
- KMZ archive creation (placeholder for zip implementation)
- Integration points for Brett Moore's R scripts

**KMLEnhancer Methods**:

```typescript
class KMLEnhancer {
  static async enhanceModelingResult(
    result: ModelingResult,
    options?: KMLEnhancementOptions
  ): Promise<{
    kmlPath: string
    kmzPath?: string
    legendPath?: string
  }>

  private static async generateEnhancedKML(result, options): Promise<string>
  private static async generateLegend(perimeters, legendPath, colorRamp): Promise<string>
  private static async createKMZ(kmlPath, legendPath, kmzPath): Promise<string>
  private static hexToKMLColor(hex: string): string
  private static formatKMLTime(date: Date): string
  private static coordinatesToKML(coordinates: Coordinates[]): string
}
```

**Enhancement Options**:
```typescript
interface KMLEnhancementOptions {
  includeTimespan?: boolean
  generateLegend?: boolean
  simplifyGeometry?: boolean
  colorRamp?: string[]
  outputDirectory?: string
}
```

**Default Color Ramp**:
```typescript
['#EF2820', '#F89E46', '#F1FB7C', '#A6CAAD', '#38A1D0']
// Red → Orange → Yellow → Light Green → Blue
// Represents fire progression over time
```

**Brett Moore Integration Methods**:

```typescript
class BrettMooreIntegration {
  static async convertShapefileToKML(
    shapefilePath: string,
    outputDir?: string
  ): Promise<{
    kmlPath: string
    legendPath: string
  }>

  static async addTimespanToKML(kmlPath: string): Promise<string>
}
```

**KML Features Generated**:
- Document metadata (engine version, execution time, statistics)
- Style definitions with color progression
- ScreenOverlay for legend positioning
- Placemark elements for each fire perimeter with:
  - Descriptive name and statistics
  - TimeSpan elements for time-aware visualization
  - Polygon geometry with proper coordinate ordering
  - Color-coded styling based on temporal progression

**Integration Notes**:
- Currently uses placeholder methods for legend image generation
- Production implementation would integrate Brett Moore's R scripts
- R script integration points documented for future implementation
- KMZ creation would use `archiver` or similar ZIP library
- Legend generation would use `sharp` or `canvas` for image creation
- Brett Moore's original R scripts located at: `contributions/brett_moore_CFS/Shp_To_KML.R`

**Dependencies**:
- `fs` - File system operations
- `path` - Path manipulation
- `../types` - Type definitions
- Future: Image generation library (sharp/canvas)
- Future: Zip library for KMZ creation (archiver)

---

### 6. Package Entry Point (`src/`)

#### index.ts
**File**: `/Users/franconogarin/localcode/wiseguy/src/index.ts`
**Lines of Code**: 43
**Purpose**: Main package entry point with all public exports

**Exports**:

```typescript
// Core interfaces
export {
  FireModelingEngine,
  EngineManagerInterface
} from './interfaces/FireModelingEngine'

// Type definitions
export {
  Coordinates,
  PolygonCoordinates,
  LineCoordinates,
  EngineCapabilities,
  ValidationResult,
  ConnectionTestResult,
  ModelingResult,
  ModelingOptions,
  JobParameters
} from './types'

// Core implementations
export { EngineManager } from './core/EngineManager'

// Engine implementations
export { WISEEngine } from './engines/WISEEngine'

// Utility modules
export {
  KMLEnhancer,
  BrettMooreIntegration,
  KMLEnhancementOptions,
  KMLTimeframe
} from './utils/KMLEnhancer'

// Version and metadata
export const VERSION = '1.0.0-alpha.2'
export const BUILD_DATE = new Date().toISOString()
export const DESCRIPTION = 'Fire Engine Abstraction Layer - Democratizing Fire Modeling with WISE Integration'
```

**Integration Notes**:
- Single import point for all package functionality
- Version metadata exported for runtime version checking
- Clean public API with all implementation details encapsulated

---

## Test Components

### Test Suite (`tests/`)

**Files**:
- `basic.test.ts` - Basic functionality tests
- `EngineManager.test.ts` - EngineManager unit tests
- `WISEEngine.integration.test.ts` - WISE integration tests
- `setup.ts` - Jest test configuration

**Test Coverage Areas**:
- Engine registration and lifecycle
- Active engine selection and validation
- Job execution routing
- Capability verification
- Error handling and edge cases
- Connection testing
- Health monitoring

**Test Commands**:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## Docker Deployment Components

### Docker Architecture

The system uses a 5-service containerized architecture designed for ARM64 Mac M2 development with x86_64 WISE server execution.

#### Service Inventory

**1. wise-dev** (Development Environment)
- **Base**: Node.js 18 Alpine (ARM64)
- **Purpose**: Local development environment for abstraction layer
- **Ports**: 3000, 3001, 9229
- **Volumes**: Source code, data, outputs
- **Dockerfile**: `docker/Dockerfile.dev`

**2. wise-api-gateway** (SSH Tunnel Gateway)
- **Base**: Node.js 18 Alpine (ARM64)
- **Purpose**: SSH tunnel proxy for remote WISE server access
- **Ports**: 6100, 6101
- **Features**: Automatic tunnel establishment, health monitoring, API proxy
- **Dockerfile**: `docker/Dockerfile.gateway`
- **Implementation**: `docker/gateway/gateway.js`

**3. kml-enhancer** (KML Enhancement Service)
- **Base**: Node.js 18 Alpine (ARM64)
- **Purpose**: Brett Moore KML enhancement system (future service)
- **Port**: 3002
- **Scripts**: Brett Moore's R scripts

**4. wise-db** (PostgreSQL Database)
- **Base**: PostgreSQL 15 Alpine (ARM64)
- **Purpose**: Job management and results storage
- **Port**: 5432
- **Volume**: `wise_db_data`

**5. wise-redis** (Redis Cache)
- **Base**: Redis 7 Alpine (ARM64)
- **Purpose**: Job queuing and session management
- **Port**: 6379
- **Volume**: `wise_redis_data`

### Docker Files

#### docker-compose.yml
**File**: `/Users/franconogarin/localcode/wiseguy/docker-compose.yml`
**Purpose**: Multi-service orchestration with networking and volume management

**Key Configuration**:
- Custom network: `wise-network` (bridge driver)
- Persistent volumes: `wise_db_data`, `wise_redis_data`
- Environment variable substitution from `.env`
- Platform specification for ARM64 compatibility

#### Dockerfile.dev
**File**: `/Users/franconogarin/localcode/wiseguy/docker/Dockerfile.dev`
**Purpose**: ARM64 development environment with TypeScript and testing tools

#### Dockerfile.gateway
**File**: `/Users/franconogarin/localcode/wiseguy/docker/Dockerfile.gateway`
**Purpose**: SSH tunnel gateway service for remote WISE access

#### Gateway Implementation
**File**: `/Users/franconogarin/localcode/wiseguy/docker/gateway/gateway.js`
**Purpose**: Express server with SSH tunnel management and HTTP proxy

**Gateway Endpoints**:
- `GET /health` - Gateway health check
- `GET /tunnel/status` - Tunnel connection status
- `POST /tunnel/connect` - Establish SSH tunnel
- `POST /tunnel/disconnect` - Close SSH tunnel
- `ALL /api/wise/*` - Proxy to remote WISE server

#### SSH Setup Script
**File**: `/Users/franconogarin/localcode/wiseguy/docker/scripts/ssh-setup.sh`
**Purpose**: SSH key generation and configuration utility

**Commands**:
```bash
./ssh-setup.sh generate   # Generate SSH keys
./ssh-setup.sh configure  # Configure connection
./ssh-setup.sh test       # Test connection
```

### Docker Documentation
**File**: `/Users/franconogarin/localcode/wiseguy/docker/README.md`
**Lines**: 287
**Purpose**: Comprehensive Docker deployment guide

**Sections**:
- Architecture overview
- Quick start guide
- Service descriptions
- SSH tunnel management
- Development workflow
- Troubleshooting
- Security considerations
- Production deployment guidelines

---

## Configuration Files

### package.json
**File**: `/Users/franconogarin/localcode/wiseguy/package.json`
**Package Name**: `wiseguy-fire-engine-abstraction`
**Version**: 1.0.0-alpha.1

**Scripts**:
```json
{
  "SYM:MemSave": "bash documentation/persist/saveMemory.sh",
  "build": "tsc",
  "build:watch": "tsc --watch",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "lint": "eslint src/**/*.ts",
  "clean": "rm -rf dist",
  "dev": "npm run build:watch"
}
```

**Dependencies**:
- `wise_js_api` - GitHub package (WISE-Developers/WISE_JS_API#1.0.6-beta.5)

**DevDependencies**:
- TypeScript 5.0+
- Jest 29.5+ with ts-jest
- ESLint with TypeScript support
- Type definitions (@types/jest, @types/node)

### tsconfig.json
**File**: `/Users/franconogarin/localcode/wiseguy/tsconfig.json`
**Purpose**: TypeScript compiler configuration

**Key Settings**:
- Target: ES2020
- Module: CommonJS
- Output: `dist/` directory
- Declaration files: Enabled
- Source maps: Enabled
- Strict mode: Enabled

### jest.config.js
**File**: `/Users/franconogarin/localcode/wiseguy/jest.config.js`
**Purpose**: Jest test framework configuration

**Configuration**:
- Preset: ts-jest
- Test environment: Node
- Coverage collection from `src/` directory

---

## Demonstration Code

### demo.ts
**File**: `/Users/franconogarin/localcode/wiseguy/demo.ts`
**Lines of Code**: 158
**Purpose**: Complete integration demonstration showing typical usage patterns

**Demonstration Steps**:
1. Initialize EngineManager
2. Register WISE engine
3. Set active engine
4. Display engine capabilities
5. Validate configuration
6. Test connection
7. Execute point ignition scenario
8. Execute polygon ignition scenario
9. Generate enhanced KML with Brett Moore system
10. Display system health summary

**Example Usage**:
```typescript
import { EngineManager, WISEEngine, KMLEnhancer } from './src'

const manager = new EngineManager()
const wiseEngine = new WISEEngine()

await manager.registerEngine(wiseEngine)
await manager.setActiveEngine('WISE')

const result = await manager.executeModelingJob('point', {
  lat: 45.0,
  lon: -114.0,
  duration: 120
}, {
  weather: {
    temperature: 25,
    humidity: 35,
    windSpeed: 12,
    windDirection: 270
  },
  fuelType: 'C2'
})

const kml = await KMLEnhancer.enhanceModelingResult(result, {
  includeTimespan: true,
  generateLegend: true
})
```

**Integration Notes**:
- Demonstrates complete workflow from engine registration to KML output
- Shows both simple (point) and complex (polygon) ignition scenarios
- Illustrates health monitoring and system status reporting
- Provides template for Project Nomad integration

---

## Supporting Documentation

### Architecture Documentation
**File**: `/Users/franconogarin/localcode/wiseguy/fire_modeling_system_architecture.md`
**Purpose**: Complete system design and architectural decisions

**Key Sections**:
- Project vision and mission
- High-level component architecture
- Component responsibilities
- FireSTARR integration strategy
- Technology stack decisions

### Development Plan
**File**: `/Users/franconogarin/localcode/wiseguy/development_plan.md`
**Purpose**: 16-week sprint roadmap for implementation

### README
**File**: `/Users/franconogarin/localcode/wiseguy/README.md`
**Purpose**: Project overview and API reference

### Handoff Documentation
**File**: `/Users/franconogarin/localcode/wiseguy/HANDOFF.md`
**Purpose**: Session continuity and current state documentation

---

## Component Dependencies

### Dependency Graph

```
index.ts
├── interfaces/FireModelingEngine.ts
│   └── types/index.ts
├── core/EngineManager.ts
│   ├── interfaces/FireModelingEngine.ts
│   └── types/index.ts
├── engines/WISEEngine.ts
│   ├── interfaces/FireModelingEngine.ts
│   ├── types/index.ts
│   ├── wise_js_api (external)
│   └── fs (Node.js)
└── utils/KMLEnhancer.ts
    ├── types/index.ts
    ├── fs (Node.js)
    └── path (Node.js)
```

### External Dependencies

**Runtime Dependencies**:
- `wise_js_api@1.0.6-beta.5` - WISE JavaScript API from GitHub
- Node.js built-ins: `fs`, `path`

**Development Dependencies**:
- TypeScript compiler and toolchain
- Jest testing framework
- ESLint linting tools
- Type definitions for Node.js and Jest

---

## Integration Points for Project Nomad

### 1. Engine Manager Integration
Project Nomad will use EngineManager as the central orchestration point:
- Register both WISE and FireSTARR engines at startup
- Allow users to select active engine via configuration
- Display engine capabilities in UI
- Route modeling jobs based on user selection

### 2. Type System Extension
Project Nomad may extend these types for UI requirements:
- Add UI-specific metadata to ModelingOptions
- Extend ModelingResult with visualization preferences
- Add progress tracking interfaces for long-running jobs

### 3. KML Enhancement Integration
Project Nomad will consume KMLEnhancer for result visualization:
- Generate time-aware KML for MapBox GL display
- Create legend overlays for fire progression
- Support export to KMZ for external use (Google Earth)

### 4. Docker Deployment
Project Nomad can leverage existing Docker architecture:
- wise-dev for development environment
- wise-api-gateway for remote WISE access
- wise-db for job persistence
- wise-redis for job queuing

### 5. Health Monitoring
Project Nomad dashboards can use health monitoring APIs:
- Display engine availability status
- Show connection latency
- Report configuration validation errors
- Track job execution statistics

---

## Future Extension Points

### 1. Additional Engines
To add new engines (e.g., FireSTARR):
1. Create `src/engines/FireSTARREngine.ts`
2. Implement `FireModelingEngine` interface
3. Export from `src/index.ts`
4. Register with EngineManager

### 2. Enhanced KML Features
Future KML enhancements:
- Actual legend image generation (using sharp/canvas)
- KMZ archive creation (using archiver)
- Integration with Brett Moore's R scripts
- 3D terrain visualization
- Ember zone overlays

### 3. Advanced Job Management
Optional features to implement:
- Job cancellation
- Real-time status updates
- Job queuing and prioritization
- Historical job retrieval

### 4. Data Source Integration
Future abstraction layers:
- Weather API connectors
- Fuel database adapters
- GIS service integration
- DEM data providers

---

## Version History

**1.0.0-alpha.2** (Current)
- Core abstraction layer complete
- WISE engine implementation with Builder pattern
- KML enhancement utilities (placeholder implementations)
- Docker deployment architecture
- Comprehensive test suite

**Future Versions**:
- 1.0.0-alpha.3: Complete KML image generation
- 1.0.0-beta.1: FireSTARR engine implementation
- 1.0.0: Production release with full documentation

---

## Component Statistics

**Total TypeScript Files**: 6 core files + 3 test files
**Total Lines of Code** (src/): ~1,300 lines
**Test Coverage**: EngineManager, WISEEngine, basic functionality
**Docker Services**: 5 containerized services
**External Dependencies**: 1 runtime (wise_js_api)
**DevDependencies**: 7 packages

**Code Distribution**:
- Interfaces: 97 lines
- Core: 265 lines
- Engines: 462 lines
- Types: 140 lines
- Utils: 360 lines
- Entry Point: 43 lines

---

## Summary

The WISE Fire Engine Abstraction Layer provides a clean, type-safe architecture for fire modeling that:

1. **Abstracts Engine Complexity**: Simple API hides WISE, FireSTARR, and future engine differences
2. **Enables Engine Switching**: EngineManager allows runtime engine selection without code changes
3. **Standardizes Results**: Common ModelingResult format works across all engines
4. **Supports Enhancement**: KMLEnhancer provides visualization capabilities
5. **Facilitates Deployment**: Docker architecture supports ARM64 dev with x86_64 production
6. **Ensures Type Safety**: Comprehensive TypeScript types prevent runtime errors
7. **Provides Testing**: Jest test suite validates core functionality

This component map serves as the definitive reference for all components within the WISE abstraction layer, enabling Project Nomad developers to understand and integrate this critical fire modeling infrastructure.

---

**Document Prepared By**: Sage (Fourth Daughter, Wild Unicorn)
**Role**: Dual SME - WISE Fire Modeling & Project Nomad Architecture
**Mission**: Bridging legacy WISE knowledge into modern Nomad architecture to democratize fire modeling and save lives
