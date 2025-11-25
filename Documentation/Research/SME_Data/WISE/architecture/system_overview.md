# WISE Fire Modeling System - Architecture Overview

## Executive Summary

**WISE** (Wildfire Intelligence System for the Environment) is a deterministic fire growth simulation system that models wildfire spread using the elliptical spread model based on the Canadian Forest Fire Behavior Prediction (FBP) System. It serves as a critical operational tool for fire behavior prediction and decision support in wildfire management.

**Current Status**: Functional but presenting maintenance challenges. Active operational use, particularly in Northwest Territories. Legacy system being abstracted for future transition to next-generation engines (FireSTARR).

**Key Characteristic**: Unlike probabilistic Monte Carlo approaches (FireSTARR), WISE produces deterministic fire perimeter predictions with configurable time-stepping, suitable for operational decision-making timeframes.

---

## System Purpose & Fire Management Context

### What WISE Does

WISE simulates fire growth from various ignition types (point, line, polygon, existing perimeter) across heterogeneous landscapes, producing time-stepped fire perimeter predictions and fire behavior statistics.

**Core Capabilities**:
- Point ignition modeling ("drop a match" scenarios)
- Polygon/line ignition (prescribed burns, existing fires)
- Multi-scenario batch execution
- Terrain effects (slope, aspect, elevation)
- Spatial weather variation (weather patches, grids)
- Fuel type modifications (fuel patches)
- Comprehensive fire behavior statistics (40+ metrics)

### Fire Management Workflows

**Operational Use Cases**:

1. **Incident Response Planning**: Predict fire growth for resource deployment
2. **Prescribed Fire Planning**: Model controlled burn scenarios
3. **Risk Assessment**: Evaluate potential fire spread under various conditions
4. **Training & Education**: Demonstrate fire behavior concepts
5. **Post-Fire Analysis**: Validate predictions against observed fire behavior

**Decision Support Timeline**:
- Real-time incident support (hours to days)
- Seasonal planning (weeks to months)
- Historical analysis and validation

**Critical Output**: Time-stepped fire perimeters overlaid on operational maps, enabling tactical decisions about:
- Evacuation timing and zones
- Resource positioning and deployment
- Control line placement
- Structure protection prioritization

---

## High-Level Architecture

### Three-Tier Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   WISE System Architecture                  │
├────────────────────────────────────────────────────────────┤
│  Layer 1: Configuration & Job Creation                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  wise_js_api (TypeScript/JavaScript)                 │  │
│  │  - Job configuration Builder pattern                 │  │
│  │  - Input validation                                  │  │
│  │  - Parameter specification                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  Layer 2: Job Orchestration                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WISE Builder Service (Node.js)                      │  │
│  │  - FGMJ file generation                              │  │
│  │  - Job folder structure creation                     │  │
│  │  - Job lifecycle management                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  Layer 3: Simulation Engine                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WISE.EXE (C++ Core)                                 │  │
│  │  - Fire growth simulation                            │  │
│  │  - FBP calculations                                  │  │
│  │  - Spatial propagation                               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

Input: Grids (fuel, DEM), weather, ignition, scenario config
Output: KML/SHP perimeters, GeoTIFF statistics, summaries
```

### Component Relationships

```
User Code / Application
         │
         ↓
    wise_js_api (TypeScript API)
         │
         ↓ prom.beginJobPromise()
    WISE Builder Service
         │
         ↓ Generates FGMJ + Job Folder
    Job Folder Structure:
         ├── job.fgmj (Fire Growth Model Job XML)
         ├── Inputs/ (attached data files)
         ├── Outputs/ (results destination)
         ├── status.json (real-time status)
         └── validation.json (pre-execution validation)
         │
         ↓ WISE.EXE execution
    Fire Simulation Results
         │
         ↓
    Outputs Folder:
         ├── *.kml, *.kmz (perimeters)
         ├── *.shp (GIS perimeters)
         ├── *.tif (statistics grids)
         └── *.txt, *.json (summaries, statistics)
```

---

## Key Components

### 1. wise_js_api (Configuration Layer)

**Technology**: TypeScript/JavaScript npm package
**Role**: High-level API for job configuration using Builder pattern

**Core Classes**:
- `WISE`: Main entry point for model configuration
- `GridFile`: Fuel grids, elevation (DEM), projection files
- `WeatherStation` / `WeatherStream`: Weather data configuration
- `Ignition`: Point, polygon, polyline, or file-based ignition
- `Scenario`: Temporal bounds, burning conditions, output configuration
- `VectorFile`, `Output_GridFile`, `SummaryFile`, `StatsFile`: Output specifications

**Pattern**: Fluent API with validation (`checkValid()`) before submission

**Example**:
```typescript
const wise = new modeller.wise.WISE();
wise.setFuelmapFile("fuel.tif");
wise.setProjectionFile("fuel.prj");
const ignition = wise.addPointIgnition(lat, lon, startTime);
const scenario = wise.addScenario(startTime, endTime);
const job = await wise.beginJobPromise(); // Submits to Builder
```

### 2. WISE Builder (Orchestration Layer)

**Technology**: Node.js service
**Role**: Job lifecycle orchestration and FGMJ generation

**Responsibilities**:
- Convert wise_js_api configuration to FGMJ (Fire Growth Model Job) XML format
- Create timestamped job folders (e.g., `job_20240625064422915/`)
- Establish job directory structure (`Inputs/`, `Outputs/`, status files)
- Validate job configuration pre-execution
- Provide job status tracking (MQTT subscription, status.json polling)

**Job Folder Structure**:
```
{PROJECT_JOBS_FOLDER}/
└── job_20240625064422915/
    ├── job.fgmj                    # WISE job specification (XML)
    ├── validation.json             # Pre-execution validation results
    ├── status.json                 # Real-time execution status
    ├── Inputs/                     # Attached input files
    │   ├── fuel.tif
    │   ├── weather.txt
    │   └── ...
    └── Outputs/                    # Generated results
        ├── Primary_perim.kml
        ├── Primary_perim.shp
        ├── Primary_MAX_ROS.tif
        └── ...
```

**Communication**: Exposes job submission API, MQTT event stream for job progress

### 3. WISE.EXE (Simulation Engine)

**Technology**: C++ executable
**Role**: Core fire growth simulation engine

**Inputs**: FGMJ file specifying complete job configuration
**Outputs**: Fire perimeters, behavior grids, statistics written to `Outputs/` folder

**Simulation Algorithm**:
- Elliptical fire spread based on FBP System equations
- Huygens' principle for wave propagation
- Grid-based spatial representation
- Time-stepping with configurable output intervals
- Deterministic results (same inputs → same outputs)

**Fire Behavior Calculations**:
- Rate of Spread (ROS): Head, Flank, Back
- Fire Intensity (FI)
- Flame Length (FL)
- Crown Fraction Burned (CFB)
- Fuel Consumption (surface, crown, total)
- Fire Weather Indices (FFMC, DMC, DC, ISI, BUI, FWI)

**Performance**: Runtime depends on grid resolution, fire size, simulation duration. No stochastic convergence—fixed computational cost per scenario.

---

## Data Flow & Execution Pipeline

### Input Requirements

**Spatial Data (Raster Grids)**:
| Data Type | Format | Requirement | Purpose |
|-----------|--------|-------------|---------|
| Fuel Grid | GeoTIFF (.tif) | Required | FBP fuel type classification |
| Projection | ESRI .prj | Required | Coordinate reference system |
| Fuel LUT | Text file | Required | Fuel code → FBP type mapping |
| Elevation (DEM) | GeoTIFF | Optional | Slope/aspect effects |
| Percent Conifer | GeoTIFF | Optional | M-1/M-2 mixedwood parameter |
| Percent Dead Fir | GeoTIFF | Optional | M-3/M-4 dead fir parameter |

**Weather Data**:
- Hourly observations: Temperature, Relative Humidity, Wind Speed/Direction, Precipitation
- Starting FWI indices: FFMC, DMC, DC (previous day values)
- Station metadata: Location (lat/lon), elevation

**Ignition Specification**:
- Point: Single lat/lon coordinate
- Polygon: Closed polygon vertices (WGS84)
- Polyline: Linear ignition path
- File: Shapefile import

**Temporal Configuration**:
- Scenario start/end times (ISO 8601)
- Ignition start time
- Display interval (output frequency, e.g., PT1H for hourly)

### Execution Workflow

```
1. Configure
   User Code → wise_js_api configuration

2. Validate
   wise.checkValid() → ValidationError[]

3. Submit
   wise.beginJobPromise() → Builder creates FGMJ + job folder

4. Monitor
   - Option A: Poll status.json for {"status": "Running"|"Complete"|"Failed"}
   - Option B: MQTT subscription to job events

5. Collect Results
   - Read Outputs/ folder when status.json shows "Complete"
   - Parse KML/SHP perimeters, GeoTIFF grids, statistics files
```

### Output Formats

**Vector Outputs (Fire Perimeters)**:
- KML/KMZ: Time-stepped perimeters with Google Earth compatibility
- Shapefile: GIS-standard format with attribute table

**Grid Outputs (Statistics)**:
- GeoTIFF format with same projection as input grids
- 40+ available statistics (ROS, FI, FL, fuel consumption, weather indices)
- Configurable output times (e.g., final perimeter, hourly snapshots)

**Tabular Outputs**:
- Summary files (.txt): Human-readable job summary
- Statistics files (.csv, .json): Time-series fire metrics

---

## Integration Patterns

### Black Box Integration Approach

**Recommended Pattern**: Treat WISE as a configurable black box

```
Input Specification → WISE System → Output Collection
                      (internals abstracted)
```

**Integration Layers**:

1. **Job Configuration**: Use wise_js_api to specify inputs
2. **Job Submission**: Call `beginJobPromise()` to submit to Builder
3. **Status Monitoring**: Poll `status.json` or subscribe to MQTT events
4. **Result Retrieval**: Read files from `Outputs/` folder when complete

**Critical Files**:
- `job.fgmj`: Complete job specification (generated by Builder)
- `status.json`: Real-time execution status
- `Outputs/*`: All simulation results

### Fire Engine Abstraction Layer (WiseGuy Project)

**Strategic Context**: WISE is being wrapped in a standardized Fire Engine Abstraction Layer to enable future transition to FireSTARR and other engines.

**Abstraction Pattern**:
```
Application Code
       ↓
FireModelingEngine Interface
       ↓
EngineManager (orchestration)
       ↓
WISEEngine Implementation ← wraps wise_js_api + Builder + WISE.EXE
```

**Benefits**:
- Application code unchanged during engine migration
- Standardized ModelingResult format across engines
- Engine capability detection and validation
- Multi-engine support (side-by-side testing, gradual migration)

**Key Abstraction Methods**:
- `pointIgnition(lat, lon, duration, options)`
- `polygonIgnition(coordinates, duration, options)`
- `lineIgnition(coordinates, duration, options)`
- `existingFire(fireId, duration, options)`
- `validateConfiguration()`, `testConnection()`

**Reference Implementation**: `/Users/franconogarin/localcode/wiseguy/` (WiseGuy repository)

---

## Operational Constraints & Considerations

### Platform Requirements

**WISE.EXE Architecture**: x86_64 only (no ARM64 support)

**Deployment Options**:
- Native x86_64 servers
- x86_64 virtual machines
- Docker containers (x86_64 or emulated)
- Remote execution via SSH tunnel from ARM64 development environments

### Performance Characteristics

**Runtime Factors**:
- Grid resolution (finer grids = longer execution)
- Fire perimeter size (larger fires = more computation)
- Simulation duration (longer scenarios = proportional runtime)
- Fuel heterogeneity (complex landscapes = more calculations)

**Typical Ranges**:
- Simple point ignition (100m grid, 24hr): minutes
- Complex multi-scenario batch (50m grid, 72hr): hours
- Large landscape analysis: variable (depends heavily on fire size)

### Known Limitations

**Technical Issues**:
- KML output generation: slow and GDAL bugs (mitigated by Brett Moore's R-based KML enhancement system—90% faster)
- x86_64 architecture lock-in (prevents native ARM64 deployment)
- JavaScript API complexity (requires Builder pattern expertise)

**Operational Constraints**:
- Ignition points in non-fuel cells (water, non-burnable) cause execution failure
- Weather data must cover entire scenario timeframe
- All grid files must share identical projection
- Deterministic only (no probabilistic burn probability outputs)

### Maintenance Status

**Current State**:
- Functional for operational use
- Limited active development
- Community support via WISEKB documentation
- Strategic transition to FireSTARR planned (future)

**Risk Mitigation**:
- Abstraction layer isolates application code from WISE internals
- Franco Nogarin's expertise encoded in WiseGuy abstraction layer
- Brett Moore's KML enhancement addresses critical performance bottleneck

---

## WISE vs FireSTARR Comparison

### Architecture Differences

| Aspect | WISE | FireSTARR |
|--------|------|-----------|
| **Simulation Type** | Deterministic | Probabilistic (Monte Carlo) |
| **Primary Output** | Time-stepped fire perimeters | Burn probability surfaces |
| **Language** | C++ core + JavaScript API | C++/Python |
| **Job Format** | FGMJ (XML) + Builder service | CLI arguments |
| **Monitoring** | MQTT + status.json | Log file parsing |
| **Execution Time** | Fixed (deterministic) | Variable (stochastic convergence) |

### Workflow Implications

**WISE Workflow**:
1. Configure via wise_js_api Builder pattern
2. Submit to Builder → generates FGMJ
3. WISE.EXE executes deterministic simulation
4. Collect perimeters and statistics from Outputs/

**FireSTARR Workflow** (future):
1. Configure via CLI arguments or Python wrapper
2. Execute FireSTARR with scenario parameters
3. Monitor log files for convergence status
4. Collect burn probability grids and replicated scenarios

### Strategic Transition Path

**Abstraction Layer Strategy**:
- Phase 1: Wrap WISE in FireModelingEngine interface (current)
- Phase 2: Implement FireSTARR engine with same interface (future)
- Phase 3: Side-by-side testing and validation
- Phase 4: Gradual migration to FireSTARR
- Phase 5: WISE deprecation (optional—can coexist indefinitely)

**Zero-Impact Migration**: Application code unchanged during transition due to abstraction layer

---

## Technical Reference

### Core APIs & Interfaces

**wise_js_api Key Classes**:
- `WISE`: Main model configuration class
- `GridFile`, `WeatherStation`, `WeatherStream`, `Ignition`, `Scenario`: Input configuration
- `VectorFile`, `Output_GridFile`, `SummaryFile`, `StatsFile`: Output configuration
- `LatLon`, `Duration`, `Timezone`: Data types

**Validation Methods**:
```typescript
const errors = wise.checkValid();
// Returns ValidationError[] with propertyName and message
```

**Job Submission**:
```typescript
const job = await wise.beginJobPromise();
// Returns StartJobWrapper with job.name (timestamped job ID)
```

**Status Monitoring**:
```typescript
// Polling approach
const status = JSON.parse(fs.readFileSync(`${jobPath}/status.json`));
if (status.status === 'Complete') { /* collect results */ }

// MQTT approach
const manager = new JobManager(jobName);
manager.on('simulationComplete', (args) => { /* handle completion */ });
await manager.start();
```

### Data Format Specifications

**Weather Data File Format** (plain text, tab/space delimited):
```
Temp    RH      WS      WD      Precip
28.5    25.0    15.0    270     0.0
29.2    23.0    18.0    265     0.0
...
```

**FWI Starting Values**:
- FFMC: [0, 101] - Fine Fuel Moisture Code
- DMC: [0, ∞) - Duff Moisture Code
- DC: [0, ∞) - Drought Code
- Starting Precip: [0, ∞) mm

**Fuel Grid Requirements**:
- Integer cell values matching LUT fuel codes
- NoData value: -1 or grid-specific
- Must have matching .prj projection file
- Canadian FBP fuel types: C-1 to C-7 (conifer), D-1/D-2 (deciduous), M-1 to M-4 (mixedwood), S-1 to S-3 (slash), O-1a/O-1b (grass), Non/Water (non-fuel)

### Error Handling

**Common Errors**:
1. **Ignition in non-fuel**: status.json shows `"Failed"` with message identifying fuel type
2. **Missing weather data**: Validation error before submission
3. **Projection mismatch**: Validation error for inconsistent grid projections
4. **Builder unavailable**: Connection refused error from wise_js_api

**Error Detection Points**:
- Pre-submission: `wise.checkValid()` catches configuration errors
- Post-submission: `validation.json` contains Builder validation results
- During execution: `status.json` updates with error messages
- Post-execution: Missing output files indicate partial failure

---

## Documentation & Resources

### Official Documentation
- WISE JS API: https://github.com/WISE-Developers/WISE_JS_API
- WISE Builder Reference: WISEKB documentation portal
- FBP System: Forestry Canada ST-X-3 publication
- Canadian Fire Weather Index (FWI) System: CWFIS background documentation

### WiseGuy Abstraction Layer (Local)
- **Location**: `/Users/franconogarin/localcode/wiseguy/`
- **Key Files**:
  - `README.md`: Project overview and quick start
  - `fire_modeling_system_architecture.md`: Complete abstraction architecture
  - `development_plan.md`: 16-week implementation roadmap
  - `src/interfaces/FireModelingEngine.ts`: Standard engine interface
  - `src/engines/WISEEngine.ts`: WISE implementation
  - `src/core/EngineManager.ts`: Multi-engine orchestration

### Project Nomad Integration Context
- **Location**: `/Users/franconogarin/localcode/project_nomad/Documentation/Research/`
- **Onboarding Docs**:
  - `Onboarding/wise_tech_summary.md`: Technical integration guide
  - `Onboarding/wise_io.md`: Input/output specifications
- **SME Documentation**:
  - `SME_Data/WISE/architecture/system_overview.md`: This document

### Subject Matter Experts

**Franco Nogarin** (GNWT)
- Fire modeling expertise and operational workflows
- WISE integration patterns and automation systems
- Dataset generation (cookie-cutter system)
- NWT-specific data sources and requirements

**Brett Moore** (Canadian Forest Service)
- KML enhancement system (R-based conversion)
- Operational fire modeling workflows
- WISE output optimization

**Jordan Evans** (Canadian Forest Service)
- FireSTARR architecture and future integration
- Probabilistic modeling approach
- Research-grade validation methods

---

## Strategic Context

### Mission Alignment

**Fire Modeling Democratization**: Make sophisticated fire modeling accessible to organizations beyond elite specialist teams, supporting life-saving operational decisions.

**WISE's Role**: Proven operational system serving as foundation while next-generation engines (FireSTARR) mature. Abstraction layer preserves investment during transition.

### Current Status Assessment

**Strengths**:
- Functional and operationally proven
- Deterministic outputs suitable for tactical decisions
- Comprehensive FBP System implementation
- Established workflows and user base

**Challenges**:
- Maintenance and support limitations
- Performance bottlenecks (KML generation—mitigated)
- x86_64 architecture constraints
- Complex API requiring expertise

**Strategic Response**:
- Wrap in abstraction layer (WiseGuy project)
- Preserve operational workflows while enabling engine transition
- Encode expertise in standardized interfaces
- Future-proof applications against technology changes

### Future Trajectory

**Near-term** (2025-2026):
- Complete Fire Engine Abstraction Layer (WiseGuy)
- Integrate into Project Nomad GUI
- Operational deployment with WISE backend

**Mid-term** (2026-2027):
- FireSTARR engine implementation in abstraction layer
- Side-by-side validation against WISE
- Gradual operational transition

**Long-term** (2027+):
- FireSTARR as primary engine
- WISE available for legacy scenario validation
- Additional engines as fire science advances

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Author**: Sage (AI SME), based on WiseGuy repository analysis and Franco Nogarin's operational expertise
**Status**: Technical reference for Project Nomad integration planning
