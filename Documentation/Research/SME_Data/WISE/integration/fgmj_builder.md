# FGMJ Builder Pattern - WISE Fire Modeling Job Construction

## Document Overview

This document provides comprehensive technical guidance on constructing WISE fire modeling jobs using the `wise_js_api` Builder pattern to programmatically generate FGMJ (Fire Growth Model JSON/XML) files.

**Target Audience**: Developers integrating WISE fire modeling into applications
**Prerequisites**: Node.js/TypeScript knowledge, understanding of fire behavior modeling concepts
**Related Documents**: See `architecture_overview.md`, `job_execution.md`

---

## Table of Contents

1. [What is FGMJ?](#what-is-fgmj)
2. [The Builder Pattern](#the-builder-pattern)
3. [Core Builder Workflow](#core-builder-workflow)
4. [Initialization and Configuration](#initialization-and-configuration)
5. [Landscape Setup](#landscape-setup)
6. [Weather Configuration](#weather-configuration)
7. [Ignition Methods](#ignition-methods)
8. [Scenario Construction](#scenario-construction)
9. [Output Configuration](#output-configuration)
10. [Job Generation](#job-generation)
11. [Job Folder Structure](#job-folder-structure)
12. [Complete Workflow Examples](#complete-workflow-examples)
13. [Validation and Error Handling](#validation-and-error-handling)
14. [Best Practices](#best-practices)

---

## What is FGMJ?

**FGMJ** (Fire Growth Model Job file) is WISE's internal job specification format that describes a complete fire modeling scenario. The format can be either JSON or XML and contains:

- **Landscape Data**: Elevation, fuel types, spatial grid definitions
- **Ignition Configuration**: Point, line, polygon, or file-based ignitions with timing
- **Weather Streams**: Hourly weather data with initial FWI (Fire Weather Index) values
- **Scenario Settings**: Temporal bounds, burning conditions, output specifications
- **Grid References**: Additional spatial data (fuel patches, weather patches, fuel breaks)

### FGMJ Purpose

FGMJ files serve as the input specification that WISE Manager uses to:

1. **Configure the WISE modeling engine** with all necessary parameters
2. **Orchestrate job execution** with proper spatial/temporal bounds
3. **Define output requirements** (KML, shapefiles, grids, statistics)
4. **Enable job reproducibility** - stored FGMJ files can be re-executed identically

### Why Use the Builder?

Direct FGMJ file creation is error-prone and complex. The `wise_js_api` Builder pattern provides:

- **Type safety** and validation during construction
- **Abstraction** over FGMJ complexity
- **Default value management** for common parameters
- **Error detection** before job submission
- **Programmatic job construction** from application data

---

## The Builder Pattern

The Builder pattern uses a fluent API where you construct a `WISE()` object, configure it through method calls, and then generate the FGMJ file via `beginJobPromise()`.

### Core Builder Components

```typescript
import * as modeller from 'WISE_JS_API';

// Initialize WISE Builder connection
modeller.globals.SocketHelper.initialize(
  builderHost,  // e.g., "localhost"
  builderPort   // e.g., 32479
);

// Create WISE job builder instance
const prom = new modeller.wise.WISE();

// Configure job through fluent methods
prom.setProjectionFile(projPath);
prom.setElevationFile(elevPath);
prom.setFuelmapFile(fuelPath);
prom.setLutFile(lutPath);

// Generate FGMJ file and job folder
const wrapper = await prom.beginJobPromise();
```

### Builder Classes Hierarchy

```
modeller.wise.WISE
├── Landscape Configuration
│   ├── setProjectionFile()
│   ├── setElevationFile()
│   ├── setFuelmapFile()
│   └── setLutFile()
├── Weather Management
│   ├── addWeatherStation()
│   └── station.addWeatherStream()
├── Ignition Methods
│   ├── addPointIgnition()
│   ├── addPolygonIgnition()
│   ├── addLineIgnition()
│   └── addFileIgnition()
├── Scenario Construction
│   ├── addScenario()
│   └── scenario.addBurningCondition()
├── Output Configuration
│   ├── addOutputVectorFileToScenario()
│   ├── addOutputGridFileToScenario()
│   └── addOutputSummaryFileToScenario()
└── Job Generation
    ├── checkValid()
    ├── validateJobPromise()
    └── beginJobPromise()
```

---

## Core Builder Workflow

### Standard Job Construction Pattern

```typescript
// 1. Initialize Connection
modeller.globals.SocketHelper.initialize(BUILDER_HOST, BUILDER_PORT);

// 2. Create WISE Instance
const prom = new modeller.wise.WISE();

// 3. Set Landscape
await prom.setProjectionFile(projectionFile);
await prom.setElevationFile(elevationFile);
await prom.setFuelmapFile(fuelMapFile);
await prom.setLutFile(lookupTableFile);
await prom.setTimezoneByValue(timezoneID);

// 4. Add Weather
const weatherStation = await prom.addWeatherStation(
  elevation,
  new modeller.globals.LatLon(lat, lon)
);
const weatherStream = await weatherStation.addWeatherStream(
  attachmentFile,
  percentConifer,
  percentDeadFir,
  hffmcMethod,
  initialFFMC,
  initialDMC,
  initialDC,
  precipitation24h,
  startDate,
  endDate
);

// 5. Add Ignition
const ignition = await prom.addPointIgnition(
  new modeller.globals.LatLon(lat, lon),
  ignitionTime
);

// 6. Create Scenario
const scenario = await prom.addScenario(
  startTime,
  endTime,
  "Scenario Description"
);
scenario.addIgnitionReference(ignition);
scenario.addWeatherStreamReference(weatherStream);

// 7. Configure Outputs
const outputKml = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.KML,
  'output.kml',
  startTime,
  endTime,
  scenario
);

// 8. Validate and Generate
const validationErrors = prom.checkValid();
if (validationErrors.length === 0) {
  const wrapper = await prom.beginJobPromise();
  const jobName = wrapper.name.trim();
  const jobPath = `${PROJECT_JOBS_FOLDER}/${jobName}`;
  const fgmjPath = `${jobPath}/job.fgmj`;
}
```

---

## Initialization and Configuration

### Connect to WISE Builder

```typescript
import * as modeller from 'WISE_JS_API';

// Configure Builder connection
const BUILDER_HOST = process.env.WISE_BUILDER_HOST || "localhost";
const BUILDER_PORT = Number(process.env.WISE_BUILDER_PORT) || 32479;

modeller.globals.SocketHelper.initialize(BUILDER_HOST, BUILDER_PORT);

// Set logging level
modeller.globals.WISELogger.getInstance().setLogLevel(
  modeller.globals.WISELogLevel.VERBOSE  // or DEBUG, INFO, WARN, NONE
);
```

### Fetch Default Values

```typescript
// Retrieve Builder defaults for metadata and common parameters
const jDefaults = await new modeller.defaults.JobDefaults().getDefaultsPromise();

// These defaults include:
// - Metadata defaults (author, organization, etc.)
// - Common FBP/FWI defaults
// - Output format preferences
```

### Configure MQTT for Job Monitoring (Optional)

```typescript
modeller.client.JobManager.setDefaults({
  host: process.env.MQTT_HOST,
  port: Number(process.env.MQTT_PORT),
  topic: process.env.MQTT_TOPIC,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
});
```

---

## Landscape Setup

The landscape defines the spatial extent and characteristics of the modeling domain.

### Required Landscape Files

```typescript
const prom = new modeller.wise.WISE();

// 1. Projection File (.prj) - Spatial reference system
await prom.setProjectionFile(projectionFilePath);

// 2. Elevation File (.asc) - Digital elevation model
await prom.setElevationFile(elevationFilePath);

// 3. Fuel Map File (.asc) - Fuel type grid
await prom.setFuelmapFile(fuelMapFilePath);

// 4. Lookup Table (.lut) - Fuel type definitions
await prom.setLutFile(lookupTableFilePath);

// 5. Timezone
await prom.setTimezoneByValue(timezoneID);
// Example timezone IDs:
// 18 = MDT (Mountain Daylight Time)
// 25 = CDT (Central Daylight Time)
```

### Using Attachments for File Content

Instead of file paths, you can attach file contents directly:

```typescript
const fs = require('fs');

// Read files as buffers
const projContents = fs.readFileSync('/path/to/elevation.prj');
const elevContents = fs.readFileSync('/path/to/elevation.asc');

// Create attachments
const projAttachment = prom.addAttachment('elevation.prj', projContents);
const elevAttachment = prom.addAttachment('elevation.asc', elevContents);

// Use attachment IDs in configuration
prom.setProjectionFile(String(projAttachment));
prom.setElevationFile(String(elevAttachment));
```

### Programmatic LUT Definition

Instead of using a `.lut` file, you can define fuel types programmatically:

```typescript
function buildFuelLUT() {
  const fuelDefinitions = [];

  let fuel = new modeller.fuels.FuelDefinition(
    "C-2 Boreal Spruce",  // Display name
    "C-2",                 // Fuel code
    2                      // Grid value
  );
  fuel.color = new modeller.fuels.RGBColor({
    red: 34,
    green: 102,
    blue: 51
  });
  fuelDefinitions.push(fuel);

  // Add more fuel types...

  return fuelDefinitions;
}

prom.setLutDefinition(buildFuelLUT());
```

### Additional Grid Files

```typescript
// Degree of curing (for grass fuels)
const degreeCuring = prom.addGridFile(
  curingFilePath,
  curingProjPath,
  modeller.wise.GridFileType.DEGREE_CURING
);

// Percent conifer (for mixed fuel types)
const percentConifer = prom.addGridFile(
  coniferFilePath,
  coniferProjPath,
  modeller.wise.GridFileType.PERCENT_CONIFER
);
```

---

## Weather Configuration

Weather data drives fire behavior through temperature, humidity, wind, and precipitation.

### Weather Station Setup

```typescript
// Create weather station at ignition location
const elevation = 450.0; // meters
const location = new modeller.globals.LatLon(62.4540, -114.3718);

const weatherStation = await prom.addWeatherStation(elevation, location);
```

### Weather Stream with Hourly Data

```typescript
// Prepare hourly weather data
const header = "HOURLY,HOUR,TEMP,RH,WD,WS,PRECIP";
const forecastLines = weatherRecords.map(r => {
  return `${r.localDate}, ${r.localHour}, ${r.temp}, ${r.rh}, ${r.wd}, ${r.ws}, ${r.precip}`;
});
forecastLines.unshift(header);

// Create attachment with weather data
const weatherAttachment = await prom.addAttachment(
  'weather_forecast.txt',
  forecastLines.join('\n')
);

// Attach weather stream to station
const weatherStream = await weatherStation.addWeatherStream(
  String(weatherAttachment),  // Weather data file/attachment
  94.0,                        // Percent conifer (%)
  17.0,                        // Percent dead fir (%)
  modeller.wise.HFFMCMethod.LAWSON,  // HFFMC calculation method
  85.0,                        // Initial FFMC
  6.0,                         // Initial DMC
  15.0,                        // Initial DC
  0.0,                         // 24-hour precipitation (mm)
  "2024-06-15",                // Start date
  "2024-06-18"                 // End date
);
```

### Initial FWI Values

The Fire Weather Index (FWI) system requires initial conditions:

- **FFMC** (Fine Fuel Moisture Code): 0-101, typically 85-90 for active fire conditions
- **DMC** (Duff Moisture Code): 0-∞, typically 6-50 depending on season
- **DC** (Drought Code): 0-∞, typically 15-800 depending on season/region
- **Precipitation**: Previous 24-hour rainfall in mm

```typescript
// Example: Early season, moderate conditions
const initialFFMC = 85.0;
const initialDMC = 6.0;
const initialDC = 15.0;

// Example: Mid-season, dry conditions
const initialFFMC = 92.0;
const initialDMC = 45.0;
const initialDC = 450.0;
```

### Weather Data Format

```
HOURLY,HOUR,TEMP,RH,WD,WS,PRECIP
2024-06-15, 13, 24.5, 35, 270, 15.0, 0.0
2024-06-15, 14, 25.1, 33, 275, 17.0, 0.0
2024-06-15, 15, 25.8, 31, 280, 18.5, 0.0
```

**Column Definitions**:
- **HOUR**: Hour of day (0-23)
- **TEMP**: Temperature (°C)
- **RH**: Relative humidity (%)
- **WD**: Wind direction (degrees, 0-360)
- **WS**: Wind speed (km/h)
- **PRECIP**: Precipitation (mm)

---

## Ignition Methods

WISE supports multiple ignition geometries for different fire scenarios.

### Point Ignition

For single-point fire starts (lightning strikes, spot fires):

```typescript
const ignitionLocation = new modeller.globals.LatLon(
  62.4540,  // latitude
  -114.3718 // longitude
);

const ignitionTime = "2024-06-15T13:00:00";

const pointIgnition = await prom.addPointIgnition(
  ignitionLocation,
  ignitionTime
);
```

### Polygon Ignition

For area ignitions (existing fire perimeters, prescribed burns):

```typescript
// Define polygon coordinates (must close: first = last)
const polygonCoords = [
  [lon1, lat1],
  [lon2, lat2],
  [lon3, lat3],
  [lon4, lat4],
  [lon1, lat1]  // Closing point
].map(pair => new modeller.globals.LatLon(pair[1], pair[0]));

const polygonIgnition = await prom.addPolygonIgnition(
  polygonCoords,
  ignitionTime
);
```

**Critical**: Polygon must be properly closed (first coordinate equals last coordinate).

### Line Ignition

For linear fire starts (dozer lines, fire lines):

```typescript
const lineCoords = [
  new modeller.globals.LatLon(lat1, lon1),
  new modeller.globals.LatLon(lat2, lon2),
  new modeller.globals.LatLon(lat3, lon3)
];

const lineIgnition = await prom.addLineIgnition(
  lineCoords,
  ignitionTime
);
```

### File-Based Ignition

For complex geometries stored in KML/KMZ or GeoJSON:

```typescript
// Method 1: Using GeoJSON attachment
const ignitionGeoJSON = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [[
      [lon1, lat1],
      [lon2, lat2],
      [lon3, lat3],
      [lon1, lat1]
    ]]
  }
};

const ignitionAttachment = prom.addAttachment(
  'ignition_polygon.json',
  JSON.stringify(ignitionGeoJSON)
);

const fileIgnition = prom.addFileIgnition(
  String(ignitionAttachment),
  ignitionTime
);

// Method 2: Using file path
const kmlIgnition = prom.addFileIgnition(
  '/path/to/ignition.kmz',
  ignitionTime
);
```

### Multiple Ignitions

Scenarios can have multiple ignition sources:

```typescript
const ignition1 = await prom.addPointIgnition(
  new modeller.globals.LatLon(lat1, lon1),
  "2024-06-15T13:00:00"
);

const ignition2 = await prom.addPointIgnition(
  new modeller.globals.LatLon(lat2, lon2),
  "2024-06-15T16:00:00"  // Later ignition time
);

// Add both to scenario
scenario.addIgnitionReference(ignition1);
scenario.addIgnitionReference(ignition2);
```

---

## Scenario Construction

Scenarios define the temporal bounds and modeling parameters for simulation.

### Basic Scenario Creation

```typescript
const scenarioStart = "2024-06-15T13:00:00";
const scenarioEnd = "2024-06-16T13:00:00";

const scenario = await prom.addScenario(
  scenarioStart,
  scenarioEnd,
  "24-Hour Worst Case Scenario"
);

scenario.setName("Fire_001_WorstCase");
```

### Adding References to Scenario

```typescript
// Link ignition(s)
scenario.addIgnitionReference(ignition);

// Link weather stream(s)
scenario.addWeatherStreamReference(weatherStream);

// Link fuel patches (if any)
scenario.addFuelPatchReference(fuelPatch, priority);

// Link grid files (if any)
scenario.addGridFileReference(degreeCuring, priority);
```

### Burning Conditions

Override default fuel moisture for specific dates:

```typescript
// Set burning conditions for June 15, 2024
scenario.addBurningCondition(
  luxon.DateTime.fromISO("2024-06-15"), // Date
  0,      // Start hour (0 = midnight)
  24,     // End hour (24 = end of day)
  19.0,   // FFMC override
  0.0,    // DMC override (0 = use default)
  95.0,   // DC override
  0.0     // Precipitation override (mm)
);
```

### FGM Options (Fire Growth Model Settings)

```typescript
scenario.setFgmOptions(
  modeller.globals.Duration.createTime(0, 2, 0, false), // Max timestep (2 min)
  1.0,    // Distance resolution multiplier
  1.0,    // Perimeter resolution multiplier
  1.0,    // Spatial threshold
  false,  // Stop at grid end
  true,   // Breaching
  true,   // Dynamic spatial threshold
  true,   // Spotting
  false,  // Purge non-displayable
  true,   // Growth percentile enable
  50.0    // Growth percentile value
);
```

### FBP Options (Fire Behavior Prediction)

```typescript
scenario.setFbpOptions(
  true,  // Use terrain effect
  true   // Use wind effect
);
```

### FMC Options (Foliar Moisture Content)

```typescript
scenario.setFmcOptions(
  -1,    // Elevation (-1 = no override)
  0.0,   // Override value (0 = no override)
  true,  // Terrain
  false  // Accurate location
);
```

### FWI Options (Fire Weather Index)

```typescript
scenario.setFwiOptions(
  false, // FWI spatial interpolation
  true,  // FWI from spacial weather
  false, // History on effective FWI
  false, // Burnable grid
  false  // FWI temporal interpolation
);
```

### Probabilistic Settings

For probabilistic modeling (Monte Carlo):

```typescript
scenario.setProbabilisticValues(
  1.0,  // dx (spatial resolution X)
  1.0,  // dy (spatial resolution Y)
  modeller.globals.Duration.createTime(0, 0, 10, false) // dt (10 sec timestep)
);
```

### Multiple Scenarios

Create multiple scenarios for comparative analysis:

```typescript
const bestCase = prom.addScenario(
  startTime,
  endTime,
  "Best Case Scenario"
);
bestCase.setName("Fire_001_BestCase");

const worstCase = prom.addScenario(
  startTime,
  endTime,
  "Worst Case Scenario"
);
worstCase.setName("Fire_001_WorstCase");

const threeDayCase = prom.addScenario(
  startTime,
  luxon.DateTime.fromISO(startTime).plus({ hours: 72 }).toISO(),
  "Three Day Scenario"
);
threeDayCase.setName("Fire_001_ThreeDay");
```

---

## Output Configuration

Configure what outputs WISE generates after simulation.

### Vector Outputs (KML, Shapefile)

```typescript
// KML output with perimeters
const outputKml = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.KML,  // Format
  'scenario_perimeters.kml',         // Filename
  scenarioStart,                     // Start time
  scenarioEnd,                       // End time
  scenario                           // Scenario reference
);

// Configure KML options
outputKml.mergeContact = true;     // Merge contact perimeters
outputKml.multPerim = true;        // Multiple perimeters
outputKml.removeIslands = true;    // Remove interior islands
outputKml.metadata = jDefaults.metadataDefaults;

// Shapefile output (recommended for GIS integration)
const outputShp = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.SHP,  // Shapefile format
  'scenario_output.shp',
  scenarioStart,
  scenarioEnd,
  scenario
);
```

**Important**: Use `VectorFileType.SHP` for shapefile outputs, which are then processed by Brett Moore's KML enhancement system for superior visualization.

### Grid Outputs (Rasters)

```typescript
// Temperature grid
const tempGrid = prom.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.TEMPERATURE,
  'temperature_grid.tif',
  scenarioEndTime,  // Timestamp for grid
  modeller.wise.Output_GridFileInterpolation.IDW,  // Interpolation method
  scenario
);

// Burn grid (fire progression)
const burnGrid = prom.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.BURN_GRID,
  'burn_grid.tif',
  scenarioEndTime,
  modeller.wise.Output_GridFileInterpolation.IDW,
  scenario
);

// Total fuel consumed (time range)
const fuelConsumed = prom.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.TOTAL_FUEL_CONSUMED,
  'fuel_consumed.tif',
  new modeller.globals.TimeRange(
    luxon.DateTime.fromISO(scenarioStart),
    luxon.DateTime.fromISO(scenarioEnd)
  ),
  modeller.wise.Output_GridFileInterpolation.DISCRETIZED,
  scenario
);
fuelConsumed.discretize = 1;  // Discretization level
```

### Summary File Output

```typescript
const summaryFile = prom.addOutputSummaryFileToScenario(
  scenario,
  'scenario_summary.txt'
);

// Configure summary content
summaryFile.outputs.outputApplication = true;
summaryFile.outputs.outputFBP = true;
summaryFile.outputs.outputFBPPatches = true;
summaryFile.outputs.outputGeoData = true;
summaryFile.outputs.outputIgnitions = true;
summaryFile.outputs.outputInputs = true;
summaryFile.outputs.outputLandscape = true;
summaryFile.outputs.outputScenario = true;
summaryFile.outputs.outputScenarioComments = true;
summaryFile.outputs.outputWxPatches = true;
summaryFile.outputs.outputWxStreams = true;
summaryFile.outputs.outputAssetInfo = true;
summaryFile.outputs.outputWxData = true;
```

### Statistics File Output

```typescript
const statsFile = prom.addOutputStatsFileToScenario(
  scenario,
  'scenario_stats.json'
);
```

### Timestep Statistics

Request specific statistics at each timestep:

```typescript
prom.timestepSettings.addStatistic(
  modeller.globals.GlobalStatistics.TOTAL_BURN_AREA
);
prom.timestepSettings.addStatistic(
  modeller.globals.GlobalStatistics.DATE_TIME
);
prom.timestepSettings.addStatistic(
  modeller.globals.GlobalStatistics.SCENARIO_NAME
);
```

---

## Job Generation

### Validation Before Generation

```typescript
// Check for validation errors
const errors = prom.checkValid();

if (errors.length > 0) {
  console.error("Job validation failed:");
  errors.forEach(node => {
    handleErrorNode(node);
  });
  throw new Error("Invalid WISE job configuration");
}

function handleErrorNode(node) {
  if (node.children.length === 0) {
    // Leaf node - actual error
    console.error(
      `'${node.getValue()}' is invalid for '${node.propertyName}': "${node.message}"`
    );
  } else {
    // Branch node - recurse
    node.children.forEach(child => handleErrorNode(child));
  }
}
```

### Generate FGMJ File

```typescript
// Generate job folder and FGMJ file
const wrapper = await prom.beginJobPromise();

// Extract job information
const jobName = wrapper.name.trim();
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');

// Job paths
const jobPath = `${PROJECT_JOBS_FOLDER}/${jobName}`;
const fgmjPath = `${jobPath}/job.fgmj`;
const inputsPath = `${jobPath}/Inputs`;
const outputsPath = `${jobPath}/Outputs`;
const statusPath = `${jobPath}/status.json`;

console.log(`FGMJ created: ${fgmjPath}`);
```

### Verify FGMJ Creation

```typescript
const fs = require('fs');

if (!fs.existsSync(fgmjPath)) {
  throw new Error(`FGMJ file not created: ${fgmjPath}`);
}

console.log(`✅ FGMJ file created successfully`);
console.log(`📁 Job folder: ${jobPath}`);
```

---

## Job Folder Structure

When `beginJobPromise()` executes, Builder creates a timestamped job folder:

```
/shared/wise_data/
├── job_20240625064422915/
│   ├── Inputs/
│   │   ├── elevation.asc
│   │   ├── elevation.prj
│   │   ├── fuel_map.asc
│   │   ├── lookup_table.lut
│   │   ├── weather_forecast.txt
│   │   └── ignition_polygon.json
│   ├── Outputs/
│   │   ├── scenario_perimeters.kml
│   │   ├── scenario_output.shp
│   │   ├── burn_grid.tif
│   │   ├── scenario_summary.txt
│   │   └── scenario_stats.json
│   ├── job.fgmj
│   ├── status.json
│   └── validation.json
```

### Folder Component Descriptions

- **`Inputs/`**: All input files referenced in FGMJ (landscape, weather, ignition data)
- **`Outputs/`**: Results generated after WISE execution (created during execution)
- **`job.fgmj`**: The generated Fire Growth Model Job file
- **`status.json`**: Job status tracking (updated during execution)
- **`validation.json`**: Validation results from WISE Manager

### Job Naming Convention

Jobs are automatically named with timestamp:

```
job_<YYYYMMDDHHMMSSmmm>
```

Example: `job_20240625064422915` = June 25, 2024 at 06:44:22.915

---

## Complete Workflow Examples

### Example 1: Simple Point Ignition

```typescript
import * as modeller from 'WISE_JS_API';
import * as luxon from 'luxon';

async function createSimplePointIgnitionJob(
  lat: number,
  lon: number,
  duration: number
) {
  // Initialize Builder
  modeller.globals.SocketHelper.initialize(
    process.env.WISE_BUILDER_HOST,
    Number(process.env.WISE_BUILDER_PORT)
  );

  const prom = new modeller.wise.WISE();

  // Set landscape
  await prom.setProjectionFile('/dataset/dogrib.prj');
  await prom.setElevationFile('/dataset/elevation.asc');
  await prom.setFuelmapFile('/dataset/fuels.asc');
  await prom.setLutFile('/dataset/fuel_lut.lut');
  await prom.setTimezoneByValue(18); // MDT

  // Add weather station
  const weatherStation = await prom.addWeatherStation(
    450.0,
    new modeller.globals.LatLon(lat, lon)
  );

  // Prepare weather data
  const weatherData = `HOURLY,HOUR,TEMP,RH,WD,WS,PRECIP
2024-06-15, 13, 24, 35, 270, 15, 0.0
2024-06-15, 14, 25, 33, 275, 17, 0.0`;

  const weatherAttachment = await prom.addAttachment(
    'weather.txt',
    weatherData
  );

  const weatherStream = await weatherStation.addWeatherStream(
    String(weatherAttachment),
    94.0, 17.0,
    modeller.wise.HFFMCMethod.LAWSON,
    85.0, 6.0, 15.0, 0.0,
    "2024-06-15", "2024-06-15"
  );

  // Add point ignition
  const ignitionTime = "2024-06-15T13:00:00";
  const ignition = await prom.addPointIgnition(
    new modeller.globals.LatLon(lat, lon),
    ignitionTime
  );

  // Create scenario
  const endTime = luxon.DateTime.fromISO(ignitionTime)
    .plus({ minutes: duration })
    .toISO();

  const scenario = await prom.addScenario(
    ignitionTime,
    endTime,
    `Point Ignition ${duration}min`
  );
  scenario.setName("PointIgnition");
  scenario.addIgnitionReference(ignition);
  scenario.addWeatherStreamReference(weatherStream);

  // Configure outputs
  const outputKml = prom.addOutputVectorFileToScenario(
    modeller.wise.VectorFileType.KML,
    'output.kml',
    ignitionTime,
    endTime,
    scenario
  );

  // Validate and generate
  const errors = prom.checkValid();
  if (errors.length > 0) {
    throw new Error("Validation failed");
  }

  const wrapper = await prom.beginJobPromise();
  const jobName = wrapper.name.trim();

  return {
    jobName,
    jobPath: `${process.env.PROJECT_JOBS_FOLDER}/${jobName}`,
    fgmjPath: `${process.env.PROJECT_JOBS_FOLDER}/${jobName}/job.fgmj`
  };
}
```

### Example 2: Polygon Ignition with Multiple Scenarios

```typescript
async function createMultiScenarioJob(
  polygonCoords: number[][],
  durationHours: number
) {
  const prom = new modeller.wise.WISE();

  // Landscape setup (omitted for brevity)
  // Weather setup (omitted for brevity)

  // Create polygon ignition
  const ignitionCoords = polygonCoords.map(
    pair => new modeller.globals.LatLon(pair[1], pair[0])
  );
  // Ensure closed polygon
  if (ignitionCoords[0].lat !== ignitionCoords[ignitionCoords.length-1].lat) {
    ignitionCoords.push(ignitionCoords[0]);
  }

  const ignitionTime = "2024-06-15T13:00:00";
  const ignition = await prom.addPolygonIgnition(
    ignitionCoords,
    ignitionTime
  );

  // Create three scenarios
  const scenarios = [];
  const scenarioNames = ['BestCase', 'Typical', 'WorstCase'];

  for (const name of scenarioNames) {
    const endTime = luxon.DateTime.fromISO(ignitionTime)
      .plus({ hours: durationHours })
      .toISO();

    const scenario = await prom.addScenario(
      ignitionTime,
      endTime,
      `${name} Scenario`
    );
    scenario.setName(name);
    scenario.addIgnitionReference(ignition);
    scenario.addWeatherStreamReference(weatherStream);

    // Add outputs for each scenario
    prom.addOutputVectorFileToScenario(
      modeller.wise.VectorFileType.SHP,
      `${name}_output.shp`,
      ignitionTime,
      endTime,
      scenario
    );

    scenarios.push(scenario);
  }

  const wrapper = await prom.beginJobPromise();
  return wrapper;
}
```

### Example 3: Using File-Based Ignition from GeoJSON

```typescript
async function createFileIgnitionJob(ignitionGeoJSON: any) {
  const prom = new modeller.wise.WISE();

  // Landscape and weather setup (omitted)

  // Create attachment from GeoJSON
  const ignitionAttachment = prom.addAttachment(
    'ignition_polygon.json',
    JSON.stringify(ignitionGeoJSON)
  );

  const ignitionTime = "2024-06-15T13:00:00";
  const fileIgnition = prom.addFileIgnition(
    String(ignitionAttachment),
    ignitionTime
  );

  // Scenario creation
  const scenario = await prom.addScenario(
    ignitionTime,
    luxon.DateTime.fromISO(ignitionTime).plus({ hours: 24 }).toISO(),
    "File-Based Ignition"
  );
  scenario.addIgnitionReference(fileIgnition);
  scenario.addWeatherStreamReference(weatherStream);

  // Output configuration
  prom.addOutputVectorFileToScenario(
    modeller.wise.VectorFileType.SHP,
    'output.shp',
    ignitionTime,
    scenario.endTime,
    scenario
  );

  const wrapper = await prom.beginJobPromise();
  return wrapper;
}
```

---

## Validation and Error Handling

### Pre-Generation Validation

```typescript
const errors = prom.checkValid();

if (errors.length > 0) {
  console.error("❌ Job validation failed:");

  errors.forEach(node => {
    if (node.children.length === 0) {
      console.error(`  - ${node.propertyName}: ${node.message}`);
      console.error(`    Value: ${node.getValue()}`);
    }
  });

  throw new Error(`Validation failed with ${errors.length} error(s)`);
}
```

### Common Validation Errors

**1. Unclosed Polygon**
```
Error: 'coordinates' is invalid for 'polygonIgnition': "Polygon must be closed"
```
**Fix**: Ensure first coordinate equals last coordinate.

**2. Missing Required Files**
```
Error: 'projectionFile' is invalid for 'WISE': "Projection file required"
```
**Fix**: Call `setProjectionFile()` before validation.

**3. Invalid Time Range**
```
Error: 'endTime' is invalid for 'scenario': "End time must be after start time"
```
**Fix**: Check scenario temporal bounds.

**4. Missing Scenario References**
```
Error: 'ignitions' is invalid for 'scenario': "At least one ignition required"
```
**Fix**: Call `scenario.addIgnitionReference()`.

### Post-Generation Validation

```typescript
const wrapper = await prom.validateJobPromise();

if (!wrapper.validation.success) {
  console.error("❌ WISE validation failed");
  console.error(wrapper.validation.error_list);
  throw new Error("Job validation by WISE failed");
}

if (!wrapper.validation.valid) {
  console.error("❌ Job is invalid");
  console.error(wrapper.validation.error_list);
  throw new Error("Generated job failed WISE validation");
}

console.log("✅ Job validated successfully by WISE");
```

---

## Best Practices

### 1. Always Use Timestamped Job Names

```typescript
const jobTimestamp = new Date().toISOString()
  .replace(/[-:]/g, '')
  .replace(/\..+/, '');

const jobDescription = `Fire_${fireId}_${jobTimestamp}`;
```

### 2. Validate Polygon Closure

```typescript
function ensurePolygonClosed(coords: modeller.globals.LatLon[]): void {
  const first = coords[0];
  const last = coords[coords.length - 1];

  if (first.lat !== last.lat || first.lon !== last.lon) {
    coords.push(first);
  }
}
```

### 3. Check FGMJ File Creation

```typescript
const fs = require('fs');

if (!fs.existsSync(fgmjPath)) {
  throw new Error(`FGMJ file not created: ${fgmjPath}`);
}

const stats = fs.statSync(fgmjPath);
if (stats.size === 0) {
  throw new Error(`FGMJ file is empty: ${fgmjPath}`);
}
```

### 4. Use Shapefile Output for KML Enhancement

```typescript
// Always generate shapefile output for processing by Brett's KML enhancement
prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.SHP,  // NOT KML
  'output.shp',
  startTime,
  endTime,
  scenario
);
```

### 5. Set Appropriate Logging Level

```typescript
// Production
modeller.globals.WISELogger.getInstance().setLogLevel(
  modeller.globals.WISELogLevel.WARN
);

// Development
modeller.globals.WISELogger.getInstance().setLogLevel(
  modeller.globals.WISELogLevel.DEBUG
);
```

### 6. Sanitize Weather Data

```typescript
function sanitizeCFFDRS(cffdrs: any): void {
  // Check for null values
  if (cffdrs.ffmc === null || cffdrs.dmc === null || cffdrs.dc === null) {
    console.warn("Null CFFDRS values detected, using defaults");
    cffdrs.ffmc = 85;
    cffdrs.dmc = 6;
    cffdrs.dc = 15;
  }

  // Check for invalid values
  if (cffdrs.ffmc <= 0 || cffdrs.dmc <= 0 || cffdrs.dc <= 0) {
    console.warn("Invalid CFFDRS values detected, using defaults");
    cffdrs.ffmc = 85;
    cffdrs.dmc = 6;
    cffdrs.dc = 15;
  }
}
```

### 7. Standardize Date/Time Handling

```typescript
import * as luxon from 'luxon';

// Always use ISO format with timezone
const startTime = luxon.DateTime.fromISO('2024-06-15T13:00:00-06:00').toISO();

// Calculate end time with duration
const endTime = luxon.DateTime.fromISO(startTime)
  .plus({ hours: 24 })
  .toISO();
```

### 8. Error Recovery Pattern

```typescript
async function createJobWithRetry(
  config: JobConfig,
  maxRetries: number = 3
): Promise<JobWrapper> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const prom = new modeller.wise.WISE();
      // ... configure job ...

      const errors = prom.checkValid();
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.length} errors`);
      }

      const wrapper = await prom.beginJobPromise();
      return wrapper;

    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
      lastError = error;

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError;
}
```

---

## Summary

The WISE Builder pattern provides a robust, type-safe approach to constructing fire modeling jobs:

1. **Initialize** connection to WISE Builder
2. **Configure landscape** with spatial data files
3. **Add weather** stations and streams
4. **Define ignition** using point, polygon, line, or file methods
5. **Create scenarios** with temporal bounds and modeling parameters
6. **Configure outputs** for visualization and analysis
7. **Validate** job before generation
8. **Generate FGMJ** file via `beginJobPromise()`
9. **Execute** WISE using generated FGMJ file
10. **Process results** from job output folder

This pattern abstracts FGMJ complexity while providing programmatic control over all modeling parameters, enabling integration into modern fire modeling applications like Project Nomad.

---

## References

- **WISE JS API Documentation**: [wise_js_api npm package]
- **Related SME Docs**: `architecture_overview.md`, `job_execution.md`, `dataset_generation.md`
- **WiseGuy Repository**: `/Users/franconogarin/localcode/wiseguy/`
- **Franco's Implementation**: `wiseguy/franco-wise-code/fireModel.js`

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Author**: Sage (AI SME) - WISE Fire Modeling System Documentation
**Reviewer**: Franco Nogarin (GNWT Fire Modeling Expert)
