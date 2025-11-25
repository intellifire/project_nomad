# WISE Fire Modeling System - Data Flow Architecture

## Document Overview

This document provides comprehensive technical documentation of data flow through the WISE fire modeling system, from initial input requirements through the Builder pattern to FGMJ generation, execution, and final output processing.

**Primary Audience**: Technical implementers, system architects, and developers integrating WISE into fire modeling applications.

**Related Documentation**:
- `wise_io.md` - Input/Output specifications
- `fire_modeling_system_architecture.md` - Overall system design
- `FireModelingEngine.ts` - Interface contracts

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Input Data Flow](#input-data-flow)
3. [Builder Pattern & FGMJ Generation](#builder-pattern--fgmj-generation)
4. [Execution Pipeline](#execution-pipeline)
5. [Output Data Flow](#output-data-flow)
6. [Data Transformation Points](#data-transformation-points)
7. [Error Handling & Validation](#error-handling--validation)
8. [Complete Flow Diagram](#complete-flow-diagram)

---

## System Overview

### High-Level Data Flow

```
User Input → Engine Abstraction → Builder API → FGMJ Generation →
WISE Execution → Raw Outputs → KML Enhancement → Final Outputs
```

### Key Components

| Component | Role | Data Format |
|-----------|------|-------------|
| **Fire Modeling API** | Accept user ignition requests | JSON (standardized) |
| **Engine Manager** | Route requests to active engine | Internal objects |
| **WISE Engine Adapter** | Transform to WISE-specific format | wise_js_api objects |
| **Builder Service** | Generate FGMJ job files | FGMJ (XML-based) |
| **WISE Execution** | Run fire simulation | Binary/Grid formats |
| **Output Processor** | Parse WISE outputs | KML/Shapefile/GeoTIFF |
| **KML Enhancer** | Optimize visualization | Enhanced KML/KMZ |

---

## Input Data Flow

### 1. User Request Entry Point

**Standard API Call Pattern:**

```typescript
// Example: Point ignition request
const result = await manager.executeModelingJob('point', {
  lat: 49.5123,
  lon: -117.2456,
  duration: 120  // minutes
}, {
  weather: {
    temperature: 28.5,
    humidity: 25.0,
    windSpeed: 15.0,
    windDirection: 270
  },
  includeStatistics: true,
  outputFormats: ['kml', 'shapefile', 'grid']
});
```

**Data Structure:**
```typescript
interface ModelingRequest {
  jobType: 'point' | 'polygon' | 'line' | 'existing';
  parameters: {
    lat?: number;
    lon?: number;
    coordinates?: PolygonCoordinates | LineCoordinates;
    fireId?: string;
    duration: number;  // minutes
  };
  options?: ModelingOptions;
}
```

### 2. Engine Manager Routing

**Routing Logic:**

```
User Request
    ↓
EngineManager.executeModelingJob()
    ↓
1. Validate active engine exists
2. Check engine capabilities support job type
3. Route to appropriate engine method:
   - point    → engine.pointIgnition()
   - polygon  → engine.polygonIgnition()
   - line     → engine.lineIgnition()
   - existing → engine.existingFire()
```

**Capability Verification:**
```typescript
const capabilities = engine.getCapabilities();
// Returns:
{
  pointIgnition: true,
  polygonIgnition: true,
  lineIgnition: true,
  existingFireModeling: true,
  advancedBurningConditions: true,
  fuelPatches: true,
  weatherPatches: true,
  multipleScenarios: true,
  statisticsOutputs: true
}
```

### 3. Input Data Requirements

#### Spatial Data (Required)

**Fuel Grid:**
```
Format: GeoTIFF (.tif) or ASCII Grid (.asc)
Data Type: Integer (Int16/UInt16)
Values: Fuel type codes from LUT (1-100+)
Projection: Must have matching .prj file
```

**Fuel Look-Up Table (LUT):**
```typescript
// Canadian FBP fuel types
FuelDefinition {
  name: "C-2 Boreal Spruce",
  code: "C-2",
  numeric_id: 2,
  color: RGBColor { red: 34, green: 102, blue: 51 }
}
```

**Elevation (Optional but Recommended):**
```
Format: GeoTIFF or ASCII Grid
Data Type: Float32 or Int16
Units: Meters above sea level
Purpose: Terrain effects on fire spread (slope/aspect)
```

#### Temporal Data (Required)

**Weather Stream:**
```
weather_data.txt (plain text, space-delimited):
Temp  RH    WS    WD    Precip
28.5  25.0  15.0  270   0.0
29.2  23.0  18.0  265   0.0
30.1  21.0  20.0  260   0.0
```

| Column | Type | Units | Range |
|--------|------|-------|-------|
| Temp | float | °C | -50 to 60 |
| RH | float | % | 0 to 100 |
| WS | float | km/h | 0 to 150 |
| WD | float | degrees | 0 to 360 (meteorological, "from") |
| Precip | float | mm | 0+ (hourly accumulation) |

**FWI Starting Values:**
```typescript
WeatherStream {
  starting_ffmc: 89.5,     // Fine Fuel Moisture Code [0-101]
  starting_dmc: 45.2,      // Duff Moisture Code [0-∞)
  starting_dc: 320.1,      // Drought Code [0-∞)
  starting_precip: 0.0,    // Previous day precip (mm)
  hffmc: 85.0,             // Hourly FFMC value
  hffmc_hour: 13,          // HFFMC calculation hour (13:00)
  hffmc_method: HFFMCMethod.VAN_WAGNER
}
```

#### Ignition Data (Required)

**Point Ignition:**
```typescript
LatLon {
  lat: 49.5123,  // WGS84 decimal degrees
  lon: -117.2456
}
StartTime: DateTime.fromISO("2024-07-15T14:00:00")
```

**Polygon Ignition:**
```typescript
PolygonCoordinates {
  exterior: [
    { lat: 49.50, lon: -117.20 },
    { lat: 49.51, lon: -117.20 },
    { lat: 49.51, lon: -117.21 },
    { lat: 49.50, lon: -117.21 }
    // Automatically closes to first point
  ],
  holes?: []  // Optional interior rings (unburned islands)
}
```

**Line Ignition:**
```typescript
LineCoordinates {
  points: [
    { lat: 49.50, lon: -117.20 },
    { lat: 49.51, lon: -117.21 },
    { lat: 49.52, lon: -117.22 }
  ]
}
```

#### Scenario Configuration (Required)

```typescript
Scenario {
  id: "Primary_Scenario",
  startTime: DateTime.fromISO("2024-07-15T12:00:00"),
  endTime: DateTime.fromISO("2024-07-16T18:00:00"),
  displayInterval: Duration.fromISO("PT1H"),  // Hourly outputs

  // Link to ignition
  ignitionReferences: ["Point_Ignition_1"],

  // Link to weather
  weatherStationReferences: [{
    stationId: "Station_1",
    streamId: "Main_Stream"
  }]
}
```

---

## Builder Pattern & FGMJ Generation

### 1. WISE Engine Adapter Transformation

**API Call → Builder Objects:**

```typescript
// WISEEngine.pointIgnition() receives:
{
  lat: 49.5123,
  lon: -117.2456,
  duration: 120,
  options: { weather: {...}, ... }
}

// Transforms to wise_js_api Builder objects:
const modeller = require('wise_js_api');
const prom = new modeller.wise.WISE();

// Set metadata
prom.setName("Point Ignition 49.5123,-117.2456 - 120min");
prom.timezone = new Timezone(-7); // UTC-7 (MST)

// Create point ignition
const ignition = prom.addPointIgnition(
  new modeller.globals.LatLon(lat, lon),
  DateTime.fromISO("2024-07-15T14:00:00")
);
ignition.id = "Point_Ignition_1";
```

### 2. Builder Configuration Assembly

**Layer Information (Spatial Data):**

```typescript
const layer = prom.getLayerInfo();

// Fuel grid + projection
layer.fuelmapFile = "/path/to/fuel.tif";
layer.projFile = "/path/to/fuel.prj";
layer.lutFile = "/path/to/fuel.lut";

// Elevation (optional)
layer.elevationFile = "/path/to/elevation.tif";
layer.elevationProjFile = "/path/to/elevation.prj";
```

**Weather Configuration:**

```typescript
// Create weather station
const station = new modeller.wise.WeatherStation();
station.id = "Station_1";
station.location = new modeller.globals.LatLon(49.5123, -117.2456);
station.elevation = 650;  // meters

// Attach weather stream
const stream = station.addWeatherStream(
  "/path/to/weather_data.txt",
  85.0,                                // HFFMC value
  13,                                  // HFFMC hour
  modeller.wise.HFFMCMethod.VAN_WAGNER,
  89.5,                                // Starting FFMC
  45.2,                                // Starting DMC
  320.1,                               // Starting DC
  0.0,                                 // Starting precip
  DateTime.fromISO("2024-07-15"),     // Stream start
  DateTime.fromISO("2024-07-16"),     // Stream end
  "Main weather stream"
);
stream.id = "Main_Stream";

prom.addWeatherStation(station);
```

**Scenario Assembly:**

```typescript
const scenario = prom.addScenario(
  DateTime.fromISO("2024-07-15T12:00:00"),  // Scenario start
  DateTime.fromISO("2024-07-16T18:00:00")   // Scenario end
);
scenario.setName("Primary_Scenario");
scenario.displayInterval = Duration.fromISO("PT1H");

// Link ignition
scenario.addIgnitionReference(ignition.id);

// Link weather
scenario.addStationStream(station.id, stream.id, true);
```

**Output Configuration:**

```typescript
// Vector outputs (KML/Shapefile)
const vectorKml = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.KML,
  'fire_perimeter.kml',
  scenario.lStartTime,
  scenario.lEndTime,
  scenario
);
vectorKml.multPerim = true;       // Multiple time-stepped perimeters
vectorKml.removeIslands = true;   // Remove unburned holes

// Grid outputs (statistics)
const gridOutput = prom.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.MAX_ROS,
  'max_ros.tif',
  scenario.lEndTime,
  scenario
);

// Summary file
const summary = prom.addOutputSummaryFileToScenario(
  scenario,
  "summary.txt"
);
summary.outputs.outputInputs = true;
summary.outputs.outputLandscape = true;
summary.outputs.outputWxData = true;

// Statistics file (JSON)
const stats = prom.addOutputStatsFileToScenario(
  scenario,
  'stats.json'
);
stats.fileType = modeller.wise.StatsFileType.JSON_ROW;
stats.addColumn(modeller.globals.GlobalStatistics.TOTAL_BURN_AREA);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_ROS);
```

### 3. Pre-Execution Validation

**Validation Check:**

```typescript
const validation = prom.checkValid();

if (validation.length > 0) {
  validation.forEach(error => {
    console.error(`${error.propertyName}: ${error.message}`);
  });
  throw new Error("Job configuration invalid");
}

// Common validation errors:
// - "Fuel map file not found"
// - "Projection file missing"
// - "Weather stream does not cover simulation period"
// - "Ignition point in non-fuel cell"
// - "Invalid starting FFMC value"
```

### 4. FGMJ File Generation

**Builder Execution:**

```typescript
const wrapper = await prom.beginJobPromise();
const jobName = wrapper.name.replace(/^\s+|\s+$/g, "");
// Returns: "job_20240715064422915"
```

**Job Folder Structure Created:**

```
${PROJECT_JOBS_FOLDER}/
└── job_20240715064422915/
    ├── job.fgmj                 # Fire Growth Model Job (XML format)
    ├── validation.json          # Pre-execution validation results
    ├── status.json              # Real-time job status (created at start)
    ├── Inputs/
    │   ├── fuel.tif            # Copied from source
    │   ├── fuel.prj
    │   ├── fuel.lut
    │   ├── elevation.tif
    │   ├── elevation.prj
    │   └── weather_data.txt
    └── Outputs/
        └── [empty until execution completes]
```

**FGMJ File Structure (XML):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CWFGM_Project version="1.0.0">
  <ProjectName>Point Ignition 49.5123,-117.2456 - 120min</ProjectName>
  <Comments>Generated via WISE Builder API</Comments>

  <GridFiles>
    <FuelGrid>
      <Filename>Inputs/fuel.tif</Filename>
      <Projection>Inputs/fuel.prj</Projection>
      <LUT>Inputs/fuel.lut</LUT>
    </FuelGrid>
    <ElevationGrid>
      <Filename>Inputs/elevation.tif</Filename>
      <Projection>Inputs/elevation.prj</Projection>
    </ElevationGrid>
  </GridFiles>

  <WeatherStations>
    <Station id="Station_1">
      <Location lat="49.5123" lon="-117.2456"/>
      <Elevation>650</Elevation>
      <Stream id="Main_Stream">
        <Filename>Inputs/weather_data.txt</Filename>
        <StartingFFMC>89.5</StartingFFMC>
        <StartingDMC>45.2</StartingDMC>
        <StartingDC>320.1</StartingDC>
        <DateRange>2024-07-15 to 2024-07-16</DateRange>
      </Stream>
    </Station>
  </WeatherStations>

  <Ignitions>
    <Ignition id="Point_Ignition_1" type="POINT">
      <Location lat="49.5123" lon="-117.2456"/>
      <StartTime>2024-07-15T14:00:00-07:00</StartTime>
    </Ignition>
  </Ignitions>

  <Scenarios>
    <Scenario id="Primary_Scenario">
      <StartTime>2024-07-15T12:00:00-07:00</StartTime>
      <EndTime>2024-07-16T18:00:00-07:00</EndTime>
      <DisplayInterval>PT1H</DisplayInterval>
      <IgnitionRef>Point_Ignition_1</IgnitionRef>
      <WeatherStationRef station="Station_1" stream="Main_Stream"/>
      <Outputs>
        <VectorFile format="KML" multPerim="true">
          Outputs/fire_perimeter.kml
        </VectorFile>
        <GridFile statistic="MAX_ROS">
          Outputs/max_ros.tif
        </GridFile>
        <SummaryFile>Outputs/summary.txt</SummaryFile>
        <StatsFile format="JSON">Outputs/stats.json</StatsFile>
      </Outputs>
    </Scenario>
  </Scenarios>
</CWFGM_Project>
```

**FGMJ Purpose & Benefits:**

1. **Portability**: Complete job specification in single file
2. **Reproducibility**: Can re-run identical simulation
3. **Archive**: Job configuration preserved for auditing
4. **Debugging**: Human-readable XML for troubleshooting
5. **Batch Processing**: Can queue multiple FGMJ files for execution

---

## Execution Pipeline

### 1. Job Submission

**Status File Initialization:**

```json
// status.json (created at start)
{
  "status": "Submitted",
  "jobName": "job_20240715064422915",
  "submittedAt": "2024-07-15T06:44:22.915Z",
  "scenario": "Primary_Scenario",
  "progress": 0.0
}
```

### 2. WISE Execution Process

**Execution Methods:**

**Option A: Shell Script Execution (Current Pattern)**

```bash
#!/bin/bash
# Execute WISE via command-line interface

WISE_CLI="/usr/local/bin/wise_cli"
FGMJ_PATH="${PROJECT_JOBS_FOLDER}/job_20240715064422915/job.fgmj"

$WISE_CLI execute "$FGMJ_PATH"
```

**Option B: WISE Manager Service (Container-Based)**

```typescript
// Execute via WISE Manager API
const response = await fetch('http://wise-manager:8080/api/jobs', {
  method: 'POST',
  body: JSON.stringify({
    fgmjPath: '/jobs/job_20240715064422915/job.fgmj'
  })
});

const { jobId } = await response.json();
```

### 3. Runtime Status Tracking

**Status File Updates (Real-Time):**

```json
// status.json (during execution)
{
  "status": "Running",
  "jobName": "job_20240715064422915",
  "submittedAt": "2024-07-15T06:44:22.915Z",
  "startedAt": "2024-07-15T06:44:25.103Z",
  "scenario": "Primary_Scenario",
  "currentTime": "2024-07-15T18:00:00-07:00",
  "progress": 45.2,
  "elapsedSeconds": 152.3,
  "estimatedRemaining": 185.7
}
```

**Monitoring Pattern:**

```typescript
// Polling approach
const fs = require('fs');
const statusPath = `${jobPath}/status.json`;

while (true) {
  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

  if (status.status === 'Complete') {
    console.log('Job completed successfully');
    break;
  }

  if (status.status === 'Failed') {
    throw new Error(`Job failed: ${status.errorMessage}`);
  }

  console.log(`Progress: ${status.progress.toFixed(1)}%`);
  await sleep(5000);  // Poll every 5 seconds
}
```

**Alternative: MQTT Subscription (Event-Driven)**

```typescript
import { JobManager } from 'wise_js_api/dist/client';

const manager = new JobManager(jobName);

manager.on('simulationComplete', (args) => {
  console.log('Job completed successfully');
  console.log(`Final area: ${args.totalAreaBurned} hectares`);
  manager.dispose();
});

manager.on('simulationFailed', (args) => {
  console.error(`Job failed: ${args.errorMessage}`);
  manager.dispose();
});

manager.on('progressUpdate', (args) => {
  console.log(`Progress: ${args.progress.toFixed(1)}%`);
});

await manager.start();
```

### 4. Completion Status

**Success:**

```json
{
  "status": "Complete",
  "jobName": "job_20240715064422915",
  "submittedAt": "2024-07-15T06:44:22.915Z",
  "startedAt": "2024-07-15T06:44:25.103Z",
  "completedAt": "2024-07-15T06:49:47.856Z",
  "scenario": "Primary_Scenario",
  "progress": 100.0,
  "elapsedSeconds": 322.7,
  "outputs": {
    "kml": "Outputs/fire_perimeter.kml",
    "grid": "Outputs/max_ros.tif",
    "summary": "Outputs/summary.txt",
    "stats": "Outputs/stats.json"
  }
}
```

**Failure:**

```json
{
  "status": "Failed",
  "jobName": "job_20240715064422915",
  "submittedAt": "2024-07-15T06:44:22.915Z",
  "startedAt": "2024-07-15T06:44:25.103Z",
  "failedAt": "2024-07-15T06:44:28.442Z",
  "scenario": "Primary_Scenario",
  "progress": 2.1,
  "errorCode": "IGNITION_IN_NONFUEL",
  "errorMessage": "Ignition point is located in non-fuel cell (fuel type 102 - Water)",
  "failureType": "runtime"
}
```

---

## Output Data Flow

### 1. Raw WISE Outputs

**Output File Generation (in Outputs/ folder):**

| Output Type | Format | Filename Pattern | Purpose |
|-------------|--------|------------------|---------|
| Fire perimeters | KML | `{scenario}_perim.kml` | Visualization (Google Earth) |
| Fire perimeters | Shapefile | `{scenario}_perim.shp` (.shx, .dbf, .prj) | GIS integration |
| Statistics grids | GeoTIFF | `{scenario}_{statistic}.tif` | Spatial analysis |
| Summary | Text | `{scenario}.txt` | Human-readable report |
| Time-series stats | JSON/CSV | `stats.json` or `stats.csv` | Data analysis |

**Example Output Directory After Completion:**

```
Outputs/
├── Primary_Scenario_perim.kml
├── Primary_Scenario_perim.shp
├── Primary_Scenario_perim.shx
├── Primary_Scenario_perim.dbf
├── Primary_Scenario_perim.prj
├── Primary_Scenario_MAX_ROS.tif
├── Primary_Scenario_MAX_FI.tif
├── Primary_Scenario_BURN_GRID.tif
├── Primary_Scenario_FIRE_ARRIVAL_TIME.tif
├── Primary_Scenario.txt
└── stats.json
```

### 2. KML Output Structure

**Basic KML (WISE Native Output):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Fire Perimeters</name>

    <!-- Time-stepped perimeters -->
    <Placemark>
      <name>Fire at 2024-07-15T15:00:00</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -117.2456,49.5123,0
              -117.2455,49.5124,0
              -117.2454,49.5123,0
              -117.2456,49.5123,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>

    <Placemark>
      <name>Fire at 2024-07-15T16:00:00</name>
      <!-- Next perimeter... -->
    </Placemark>
  </Document>
</kml>
```

### 3. Shapefile Output Structure

**Shapefile Components:**

| File | Purpose | Content |
|------|---------|---------|
| `.shp` | Geometry | Polygon vertices (binary) |
| `.shx` | Index | Geometry offsets for fast access |
| `.dbf` | Attributes | Time, area, perimeter, statistics |
| `.prj` | Projection | CRS definition (ESRI format) |

**Attribute Table (.dbf):**

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `TIME` | DateTime | `2024-07-15 15:00:00` | Perimeter timestamp |
| `AREA` | Double | `125.3` | Area in hectares |
| `PERIMETER` | Double | `4523.7` | Perimeter length (m) |
| `MAX_ROS` | Double | `12.5` | Max rate of spread (m/min) |
| `MAX_FI` | Double | `8450.2` | Max fire intensity (kW/m) |

### 4. Grid Output Structure

**GeoTIFF Statistics Grids:**

**MAX_ROS.tif (Maximum Rate of Spread):**
```
Format: GeoTIFF (Float32)
Units: m/min
Value Range: 0.0 to 50.0+
NoData: -9999.0
Projection: Inherited from input fuel grid
Resolution: Inherited from input fuel grid
```

**Cell Values:**
- `0.0` - No fire spread
- `5.0` - Moderate spread rate
- `15.0` - High spread rate
- `50.0+` - Extreme fire behavior

**BURN_GRID.tif (Binary Burned/Unburned):**
```
Format: GeoTIFF (Byte/Int8)
Values: 0 (unburned), 1 (burned)
Purpose: Fire extent mask
```

**FIRE_ARRIVAL_TIME.tif:**
```
Format: GeoTIFF (Float32)
Units: Minutes since ignition
Value Range: 0.0 to simulation_duration
Purpose: Isochrone analysis
```

### 5. Summary Text Output

**summary.txt Structure:**

```
WISE Fire Growth Model - Simulation Summary
============================================

Job Information:
  Job Name: job_20240715064422915
  Scenario: Primary_Scenario
  Started: 2024-07-15 06:44:25
  Completed: 2024-07-15 06:49:47
  Duration: 322.7 seconds

Simulation Parameters:
  Start Time: 2024-07-15 12:00:00 MST
  End Time: 2024-07-16 18:00:00 MST
  Duration: 30 hours
  Display Interval: 1 hour

Ignition:
  Type: Point
  Location: 49.5123°N, 117.2456°W
  Start Time: 2024-07-15 14:00:00 MST

Landscape:
  Fuel Grid: fuel.tif (1000x1000 cells, 10m resolution)
  Elevation: elevation.tif (1000x1000 cells, 10m resolution)
  Projection: NAD83 UTM Zone 11N

Weather:
  Station: Station_1 (49.5123°N, 117.2456°W, 650m)
  Stream: 2024-07-15 to 2024-07-16 (hourly)
  Starting Indices: FFMC=89.5, DMC=45.2, DC=320.1

Final Statistics:
  Total Area Burned: 1,247.3 hectares
  Final Perimeter: 18,523.7 meters
  Max Rate of Spread: 24.8 m/min (2024-07-15 18:00:00)
  Max Fire Intensity: 12,456.3 kW/m (2024-07-15 18:00:00)
  Max Flame Length: 8.2 meters
  Total Fuel Consumed: 15,234.7 tonnes

Output Files:
  KML: Primary_Scenario_perim.kml
  Shapefile: Primary_Scenario_perim.shp
  Grids: Primary_Scenario_MAX_ROS.tif, Primary_Scenario_MAX_FI.tif
  Statistics: stats.json
```

### 6. Statistics JSON Output

**stats.json Structure:**

```json
{
  "jobName": "job_20240715064422915",
  "scenario": "Primary_Scenario",
  "simulationStart": "2024-07-15T12:00:00-07:00",
  "simulationEnd": "2024-07-16T18:00:00-07:00",
  "timesteps": [
    {
      "time": "2024-07-15T14:00:00-07:00",
      "totalAreaBurned": 0.0,
      "totalPerimeter": 0.0,
      "maxRateOfSpread": 0.0,
      "maxFireIntensity": 0.0
    },
    {
      "time": "2024-07-15T15:00:00-07:00",
      "totalAreaBurned": 12.5,
      "totalPerimeter": 1247.3,
      "maxRateOfSpread": 8.2,
      "maxFireIntensity": 3245.7
    },
    {
      "time": "2024-07-15T16:00:00-07:00",
      "totalAreaBurned": 52.3,
      "totalPerimeter": 2843.5,
      "maxRateOfSpread": 15.7,
      "maxFireIntensity": 7892.4
    }
    // ... continues for each timestep
  ],
  "summary": {
    "finalAreaBurned": 1247.3,
    "finalPerimeter": 18523.7,
    "maxRateOfSpread": 24.8,
    "maxFireIntensity": 12456.3,
    "maxFlameLength": 8.2,
    "totalFuelConsumed": 15234.7
  }
}
```

---

## Data Transformation Points

### 1. API Input → Engine Format

**Transformation: Standard API → WISE Builder**

```typescript
// Input (standardized)
{
  lat: 49.5123,
  lon: -117.2456,
  duration: 120,
  options: {
    weather: { temperature: 28.5, humidity: 25.0 }
  }
}

// Output (WISE Builder objects)
{
  ignition: wise.Ignition {
    type: IgnitionType.POINT,
    location: LatLon(49.5123, -117.2456),
    startTime: DateTime
  },
  scenario: wise.Scenario {
    startTime: DateTime(now),
    endTime: DateTime(now + 120min),
    displayInterval: Duration("PT1H")
  }
}
```

**Key Transformations:**

| Input | WISE Format | Notes |
|-------|-------------|-------|
| `lat, lon` (WGS84) | `LatLon` object | No reprojection needed |
| `duration` (minutes) | `endTime` (DateTime) | `endTime = startTime + duration` |
| Coordinates array | `addPoint()` calls | Multiple vertices |
| ISO 8601 strings | `DateTime` objects | Luxon library |
| Options object | Builder methods | Conditional configuration |

### 2. Builder Objects → FGMJ XML

**Transformation: JavaScript Objects → XML**

```typescript
// Builder object
prom = {
  name: "Point Ignition...",
  ignitions: [{ type: POINT, location: {...} }],
  scenarios: [{ startTime: ..., endTime: ... }],
  weatherStations: [...]
}

// XML output (FGMJ)
<CWFGM_Project>
  <ProjectName>Point Ignition...</ProjectName>
  <Ignitions>
    <Ignition type="POINT">
      <Location lat="..." lon="..."/>
    </Ignition>
  </Ignitions>
  <Scenarios>...</Scenarios>
</CWFGM_Project>
```

**Serialization Process:**
1. Builder validates all objects via `checkValid()`
2. Builder serializes to XML via `beginJobPromise()`
3. Files copied to job folder `Inputs/` directory
4. Relative paths embedded in FGMJ

### 3. WISE Output → Standardized Result

**Transformation: Raw Files → ModelingResult**

```typescript
// Raw WISE outputs
{
  jobPath: "/jobs/job_20240715064422915",
  outputs: [
    "Outputs/Primary_Scenario_perim.kml",
    "Outputs/Primary_Scenario_perim.shp",
    "Outputs/Primary_Scenario_MAX_ROS.tif",
    "Outputs/stats.json"
  ],
  status: "Complete"
}

// Standardized ModelingResult
{
  jobId: "wise-point-1721034262915-7x3k2m9",
  status: "completed",
  engine: "WISE",
  engineVersion: "1.0.6-beta.5",
  startTime: Date("2024-07-15T06:44:22.915Z"),
  endTime: Date("2024-07-15T06:49:47.856Z"),
  duration: 322741,  // milliseconds

  perimeters: [
    {
      time: Date("2024-07-15T15:00:00-07:00"),
      polygon: { exterior: [...], holes: [] },
      area: 12.5,
      perimeter: 1247.3
    },
    // ... parsed from KML/Shapefile
  ],

  statistics: {
    totalAreaBurned: 1247.3,
    maxRateOfSpread: 24.8,
    maxFireIntensity: 12456.3,
    totalFirelineIntensity: 89234.7,
    finalPerimeter: 18523.7
  },

  outputs: {
    kmlFiles: ["Primary_Scenario_perim.kml"],
    shapeFiles: ["Primary_Scenario_perim.shp"],
    gridFiles: ["Primary_Scenario_MAX_ROS.tif"],
    statisticsFiles: ["stats.json"],
    rawData: { jobPath: "...", builderJobName: "..." }
  },

  metadata: {
    ignitionType: "point",
    ignitionData: { lat: 49.5123, lon: -117.2456 },
    duration: 120,
    options: { weather: {...} },
    engineSpecificData: {
      builderJobName: "job_20240715064422915",
      fgmjPath: "/jobs/job_20240715064422915/job.fgmj"
    }
  }
}
```

**Parsing Requirements:**

1. **KML Parsing**: Extract perimeter coordinates and times
2. **Shapefile Parsing**: Read attribute table for statistics
3. **GeoTIFF Reading**: Extract grid statistics (optional)
4. **JSON Parsing**: Load time-series data

### 4. KML Enhancement Transformation

**Brett Moore's KML Enhancement System**

**Problem**: WISE's native KML output is:
- Inefficient (100x slower than alternatives)
- Broken GDAL integration
- Missing legends and metadata
- No time-aware features for animation

**Solution**: Shapefile → R Script → Enhanced KML/KMZ

```
WISE Shapefile Output
    ↓
Shp_To_KML.R Script
    ↓
1. Read shapefile geometries + attributes
2. Generate color ramp based on time progression
3. Create KML with TimeSpan elements
4. Generate legend image (JPG)
5. Package KML + Legend → KMZ
    ↓
Enhanced KML/KMZ Output
```

**Enhanced KML Features:**

```xml
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Fire Modeling Results</name>

    <!-- Legend overlay (top-right corner) -->
    <ScreenOverlay>
      <name>Legend</name>
      <Icon><href>Legend.jpg</href></Icon>
      <overlayXY x="1" y="1" xunits="fraction" yunits="fraction"/>
      <screenXY x="1" y="1" xunits="fraction" yunits="fraction"/>
    </ScreenOverlay>

    <!-- Time-aware perimeters -->
    <Placemark>
      <name>Fire Perimeter 1</name>
      <TimeSpan>
        <begin>2024-07-15T14:00:00-07:00</begin>
        <end>2024-07-15T15:00:00-07:00</end>
      </TimeSpan>
      <Style>
        <LineStyle><Color>ff2820ef</Color></LineStyle>
        <PolyStyle><Color>4d2820ef</Color></PolyStyle>
      </Style>
      <Polygon>...</Polygon>
    </Placemark>
  </Document>
</kml>
```

**Performance Improvement:**
- **WISE Native KML**: ~10 minutes for complex fire
- **Brett's System**: ~1 minute (90% reduction)

**Integration Point in WISEEngine:**

```typescript
// After WISE execution completes
const shapefilePath = `${jobPath}/Outputs/Primary_Scenario_perim.shp`;

// Apply Brett Moore's enhancement
const enhanced = await BrettMooreIntegration.convertShapefileToKML(
  shapefilePath,
  `${jobPath}/Outputs`
);

// Update result with enhanced outputs
result.outputs.kmlFiles.push(enhanced.kmlPath);
result.outputs.legendFiles = [enhanced.legendPath];
```

---

## Error Handling & Validation

### 1. Pre-Execution Validation

**Validation Checkpoints:**

```typescript
// 1. Engine Manager validation
if (!activeEngine) {
  throw Error("No active engine set");
}

if (!capabilities[jobType]) {
  throw Error(`Engine does not support ${jobType} ignition`);
}

// 2. WISE Builder validation
const validation = prom.checkValid();
if (validation.length > 0) {
  throw Error(`FGMJ validation failed: ${errors}`);
}

// 3. File existence checks
if (!fs.existsSync(fuelGridPath)) {
  throw Error("Fuel grid file not found");
}

// 4. Spatial validation
const fuelType = getFuelTypeAtPoint(lat, lon);
if (fuelType === NONFUEL) {
  throw Error("Ignition point in non-fuel cell");
}
```

**Common Validation Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Fuel map file not found` | Missing file path | Verify file exists |
| `Projection file missing` | Missing .prj | Add projection file |
| `Weather stream does not cover period` | Date mismatch | Extend weather data |
| `Ignition in non-fuel cell` | Point in water/rock | Move ignition point |
| `Invalid FFMC value` | Out of range [0-101] | Correct FWI indices |
| `Missing LUT file` | No fuel definitions | Add fuel lookup table |

### 2. Runtime Error Detection

**Status Monitoring:**

```typescript
const status = parseStatusFile();

if (status.status === 'Failed') {
  const error = {
    code: status.errorCode,
    message: status.errorMessage,
    failureType: status.failureType,
    progress: status.progress
  };

  handleExecutionError(error);
}
```

**Error Categories:**

| Type | When | Example |
|------|------|---------|
| **Configuration** | Pre-execution | Invalid fuel type code |
| **Runtime** | During simulation | Ignition in water |
| **Resource** | System limits | Out of memory |
| **Timeout** | Job too long | Exceeded max duration |
| **Connection** | Network/service | Builder service down |

### 3. Output Validation

**Post-Execution Checks:**

```typescript
// Verify expected outputs exist
const expectedOutputs = [
  `${jobPath}/Outputs/Primary_Scenario_perim.kml`,
  `${jobPath}/Outputs/Primary_Scenario_MAX_ROS.tif`,
  `${jobPath}/Outputs/stats.json`
];

for (const output of expectedOutputs) {
  if (!fs.existsSync(output)) {
    throw Error(`Expected output not generated: ${output}`);
  }
}

// Validate output file sizes (detect truncation)
const kmlSize = fs.statSync(kmlPath).size;
if (kmlSize < 1000) {
  throw Error("KML output suspiciously small - possible error");
}

// Parse and validate statistics
const stats = JSON.parse(fs.readFileSync(statsPath));
if (stats.summary.finalAreaBurned === 0) {
  console.warn("Warning: No area burned - check ignition point");
}
```

### 4. Error Recovery Strategies

**Automatic Retry Logic:**

```typescript
async function executeWithRetry(job, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeWISEJob(job);
    } catch (error) {
      if (isRetryable(error) && attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying...`);
        await sleep(5000 * attempt);  // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

function isRetryable(error) {
  const retryableErrors = [
    'ECONNREFUSED',     // Connection failed
    'ETIMEDOUT',        // Timeout
    'BUILDER_BUSY'      // Builder service busy
  ];
  return retryableErrors.some(code => error.message.includes(code));
}
```

**Graceful Degradation:**

```typescript
// If KML enhancement fails, fall back to native WISE KML
try {
  const enhanced = await enhanceKML(wiseKML);
  return enhanced;
} catch (error) {
  console.warn("KML enhancement failed, using native output", error);
  return wiseKML;
}

// If optional grid outputs fail, continue with perimeters
try {
  const grids = await generateGridOutputs(scenario);
  result.outputs.gridFiles = grids;
} catch (error) {
  console.warn("Grid generation failed, perimeters available", error);
  // Continue - perimeters are sufficient for basic use
}
```

---

## Complete Flow Diagram

### End-to-End Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INPUT LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│  API Call: executeModelingJob('point', {lat, lon, duration}, options)  │
│                                                                          │
│  Input Data:                                                            │
│  • Ignition: Point/Polygon/Line coordinates                            │
│  • Duration: Simulation time (minutes)                                  │
│  • Options: Weather, fuel, output preferences                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                     ENGINE ABSTRACTION LAYER                            │
├─────────────────────────────────────────────────────────────────────────┤
│  EngineManager.executeModelingJob()                                     │
│  ↓                                                                       │
│  1. Validate active engine exists                                       │
│  2. Check engine capabilities                                           │
│  3. Route to: activeEngine.pointIgnition()                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       WISE ENGINE ADAPTER                               │
├─────────────────────────────────────────────────────────────────────────┤
│  WISEEngine.pointIgnition(lat, lon, duration, options)                  │
│  ↓                                                                       │
│  Transform to WISE Builder objects:                                     │
│  • Create wise.WISE() instance                                          │
│  • Add PointIgnition(LatLon)                                            │
│  • Configure LayerInfo (fuel grid, DEM, LUT)                           │
│  • Add WeatherStation + WeatherStream                                   │
│  • Create Scenario (start/end times, outputs)                          │
│  • Add output requests (KML, grids, stats)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        BUILDER VALIDATION                               │
├─────────────────────────────────────────────────────────────────────────┤
│  prom.checkValid()                                                      │
│  ↓                                                                       │
│  Validation Checks:                                                     │
│  ✓ Fuel grid file exists                                               │
│  ✓ Projection file present                                             │
│  ✓ Weather stream covers simulation period                             │
│  ✓ Ignition not in non-fuel cell                                       │
│  ✓ FWI indices within valid ranges                                     │
│  ✓ Start time < End time                                               │
│                                                                          │
│  IF INVALID → Throw Error (exit flow)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         FGMJ GENERATION                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  await prom.beginJobPromise()                                           │
│  ↓                                                                       │
│  1. Generate timestamped job folder: job_YYYYMMDDHHMMSSMS/            │
│  2. Copy input files to Inputs/ subfolder                              │
│  3. Serialize Builder objects → XML (FGMJ format)                      │
│  4. Write job.fgmj to job folder                                        │
│  5. Create validation.json (pre-execution report)                      │
│  6. Initialize status.json (status: "Submitted")                       │
│  7. Create empty Outputs/ folder                                        │
│                                                                          │
│  Output: Job folder with FGMJ + Inputs + placeholders                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         JOB SUBMISSION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Execute WISE via shell/API:                                            │
│  • Shell: wise_cli execute /path/to/job.fgmj                           │
│  • API: POST /jobs {fgmjPath: "..."}                                   │
│                                                                          │
│  Status: "Submitted" → "Running"                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         WISE EXECUTION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  WISE Fire Simulation Engine:                                           │
│  ↓                                                                       │
│  1. Parse FGMJ (read job configuration)                                │
│  2. Load input grids (fuel, elevation)                                 │
│  3. Initialize fire at ignition location                               │
│  4. Time-stepping loop:                                                 │
│     • Calculate fire spread for current timestep                       │
│     • Apply weather conditions                                         │
│     • Compute fire behavior statistics                                 │
│     • Update fire perimeter                                            │
│     • Write outputs at display intervals                               │
│     • Update status.json (progress, currentTime)                       │
│  5. Generate final outputs                                              │
│                                                                          │
│  Real-time updates: status.json polling or MQTT events                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         OUTPUT GENERATION                               │
├─────────────────────────────────────────────────────────────────────────┤
│  WISE writes to Outputs/ folder:                                        │
│  ↓                                                                       │
│  Vector Outputs:                                                        │
│  • Primary_Scenario_perim.kml (fire perimeters)                        │
│  • Primary_Scenario_perim.shp + .shx/.dbf/.prj                         │
│                                                                          │
│  Grid Outputs:                                                          │
│  • Primary_Scenario_MAX_ROS.tif (rate of spread)                       │
│  • Primary_Scenario_MAX_FI.tif (fire intensity)                        │
│  • Primary_Scenario_BURN_GRID.tif (burn mask)                          │
│  • Primary_Scenario_FIRE_ARRIVAL_TIME.tif                               │
│                                                                          │
│  Statistics:                                                            │
│  • stats.json (time-series data)                                       │
│  • Primary_Scenario.txt (summary report)                                │
│                                                                          │
│  Status: "Running" → "Complete"                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      KML ENHANCEMENT (Optional)                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Brett Moore's KML Enhancement System:                                  │
│  ↓                                                                       │
│  1. Read shapefile output                                               │
│  2. Generate color ramp (time-based)                                   │
│  3. Create enhanced KML with:                                           │
│     • TimeSpan elements (animation support)                            │
│     • Color-coded perimeters                                           │
│     • Metadata in descriptions                                         │
│  4. Generate legend image (JPG)                                         │
│  5. Package → KMZ (KML + Legend)                                       │
│                                                                          │
│  Performance: 90% faster than WISE native KML                          │
│  Output: Enhanced KML/KMZ with legend overlay                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       OUTPUT PARSING                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  WISEEngine.transformWISEResult()                                       │
│  ↓                                                                       │
│  1. Parse KML → extract perimeter coordinates & times                  │
│  2. Parse Shapefile → read attribute table statistics                  │
│  3. Parse stats.json → load time-series data                           │
│  4. Read summary.txt → extract final statistics                        │
│  5. Collect output file paths                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    STANDARDIZED RESULT                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Return ModelingResult:                                                 │
│  {                                                                       │
│    jobId: "wise-point-1721034262915-7x3k2m9",                          │
│    status: "completed",                                                 │
│    engine: "WISE",                                                      │
│    engineVersion: "1.0.6-beta.5",                                       │
│    startTime: Date,                                                     │
│    endTime: Date,                                                       │
│    duration: 322741,  // milliseconds                                   │
│                                                                          │
│    perimeters: [                                                        │
│      { time, polygon, area, perimeter },                               │
│      ...                                                                │
│    ],                                                                    │
│                                                                          │
│    statistics: {                                                        │
│      totalAreaBurned: 1247.3,                                          │
│      maxRateOfSpread: 24.8,                                            │
│      maxFireIntensity: 12456.3,                                        │
│      ...                                                                │
│    },                                                                    │
│                                                                          │
│    outputs: {                                                           │
│      kmlFiles: [...],                                                   │
│      shapeFiles: [...],                                                 │
│      gridFiles: [...],                                                  │
│      statisticsFiles: [...],                                            │
│      rawData: { jobPath, builderJobName, ... }                         │
│    },                                                                    │
│                                                                          │
│    metadata: {                                                          │
│      ignitionType: "point",                                             │
│      ignitionData: { lat, lon },                                       │
│      duration: 120,                                                     │
│      options: {...},                                                    │
│      engineSpecificData: {...}                                          │
│    }                                                                     │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER APPLICATION                               │
├─────────────────────────────────────────────────────────────────────────┤
│  • Display fire perimeters on map                                       │
│  • Show statistics in UI                                                │
│  • Export outputs (KML download, GIS integration)                       │
│  • Archive job data for historical analysis                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Format Reference

### Input Data Formats

| Data Type | Format | Extension | Required | Notes |
|-----------|--------|-----------|----------|-------|
| Fuel Grid | GeoTIFF | `.tif` | ✅ | Integer fuel type codes |
| Fuel Grid | ASCII Grid | `.asc` | ✅ | Alternative format |
| Projection | ESRI Projection | `.prj` | ✅ | Must match all grids |
| Fuel LUT | CSV/JSON | `.csv`, `.lut` | ✅ | Fuel type definitions |
| Elevation | GeoTIFF | `.tif` | ⬜ | Float32 elevation (m) |
| Weather | Plain Text | `.txt` | ✅ | Space-delimited columns |
| Ignition | API Object | - | ✅ | Point/Polygon/Line |

### Output Data Formats

| Output Type | Format | Extension | Content |
|-------------|--------|-----------|---------|
| Perimeters | KML | `.kml` | Time-stepped polygons |
| Perimeters | KMZ | `.kmz` | KML + Legend (compressed) |
| Perimeters | Shapefile | `.shp` | GIS-compatible vectors |
| Statistics | GeoTIFF | `.tif` | Spatial grids (ROS, FI, etc.) |
| Time-series | JSON | `.json` | Timestamped statistics |
| Time-series | CSV | `.csv` | Tabular data |
| Summary | Plain Text | `.txt` | Human-readable report |

### Coordinate Systems

| Context | System | Format |
|---------|--------|--------|
| API Input | WGS84 | Decimal degrees (lat, lon) |
| Grid Files | Projected | Match projection file |
| Internal WISE | Projected | Converted from WGS84 |
| KML Output | WGS84 | Decimal degrees (lon, lat, alt) |

---

## Performance Considerations

### Data Flow Bottlenecks

| Stage | Bottleneck | Mitigation |
|-------|------------|------------|
| **Builder Generation** | File I/O for copying inputs | Use symbolic links instead of copies |
| **WISE Execution** | Fire spread calculation (CPU-bound) | No practical mitigation (inherent to simulation) |
| **KML Generation** | WISE native KML (100x slow) | Use Brett Moore's R-based enhancement |
| **Output Parsing** | Reading large GeoTIFF grids | Parse only requested statistics |
| **Network Transfer** | Large output files | Compress before download, use streaming |

### Optimization Strategies

**Caching:**
```typescript
// Cache dataset files for repeated simulations in same area
const datasetKey = `${lat}_${lon}_${radius}`;
if (datasetCache.has(datasetKey)) {
  return datasetCache.get(datasetKey);
}
```

**Parallel Processing:**
```typescript
// Run multiple scenarios in parallel (different weather conditions)
const scenarios = await Promise.all([
  executeScenario('typical'),
  executeScenario('worst_case'),
  executeScenario('best_case')
]);
```

**Selective Output Generation:**
```typescript
// Only generate requested outputs
if (options.includeStatistics) {
  await generateStatisticsGrids();
}
if (options.outputFormats.includes('kml')) {
  await generateKML();
}
```

---

## Troubleshooting Guide

### Data Flow Verification

**Step 1: Verify Input Data Availability**
```bash
# Check fuel grid exists
ls -lh /data/fuel.tif
ls -lh /data/fuel.prj
ls -lh /data/fuel.lut

# Verify weather file format
head -n 5 /data/weather_data.txt
```

**Step 2: Validate Builder Configuration**
```typescript
const validation = prom.checkValid();
console.log(`Validation: ${validation.length} errors`);
validation.forEach(err => console.error(err));
```

**Step 3: Monitor Job Execution**
```bash
# Watch status file
watch -n 2 "cat ${PROJECT_JOBS_FOLDER}/${jobName}/status.json | jq"

# Check WISE process
ps aux | grep wise
```

**Step 4: Verify Output Generation**
```bash
# List outputs
ls -lh ${PROJECT_JOBS_FOLDER}/${jobName}/Outputs/

# Check KML validity
xmllint --noout Primary_Scenario_perim.kml
```

### Common Data Flow Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Validation fails immediately | Missing input files | Check all file paths exist |
| Job stuck at 0% progress | WISE execution failed | Check logs for error message |
| No outputs generated | Job failed silently | Read `status.json` error field |
| KML is empty | Ignition in non-fuel | Verify ignition point location |
| Statistics show zero area | Fire didn't spread | Check weather/fuel conditions |

---

## Appendix: FGMJ Schema Summary

**FGMJ File Structure (Simplified):**

```
CWFGM_Project
├── ProjectName (string)
├── Comments (string)
├── GridFiles
│   ├── FuelGrid (filename, projection, LUT)
│   └── ElevationGrid (filename, projection)
├── WeatherStations
│   └── Station[] (id, location, elevation)
│       └── Stream[] (id, filename, FWI indices, dates)
├── Ignitions
│   └── Ignition[] (id, type, location/file, startTime)
├── Scenarios
│   └── Scenario[] (id, startTime, endTime, displayInterval)
│       ├── IgnitionRef (id)
│       ├── WeatherStationRef (station, stream)
│       └── Outputs
│           ├── VectorFile[] (format, filename, options)
│           ├── GridFile[] (statistic, filename)
│           ├── SummaryFile (filename)
│           └── StatsFile (format, filename, columns)
└── Metadata (timestamps, builder version, etc.)
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-25 | Sage (AI SME) | Initial comprehensive data flow documentation |

---

**End of Document**
