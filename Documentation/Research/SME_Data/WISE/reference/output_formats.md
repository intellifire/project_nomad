# WISE Output Formats Reference

**Document Status**: Technical Reference
**Last Updated**: 2025-11-25
**SME**: Sage (WISE Legacy Expert)

## Overview

WISE fire modeling outputs are generated in the job's `Outputs/` directory and include vector files (fire perimeters), grid files (spatial statistics), statistics files (temporal data), and summary reports. This reference documents all available output formats, their configuration, and post-processing requirements for modern visualization systems like MapBox GL.

---

## Output Directory Structure

```
{PROJECT_JOBS_FOLDER}/
└── {jobName}/                        # e.g., job_20240625064422915
    ├── job.fgmj                      # Job specification (input)
    ├── validation.json               # Pre-execution validation
    ├── status.json                   # Real-time execution status
    ├── Inputs/
    │   └── [attached input files]    # Fuel grids, weather, etc.
    └── Outputs/                      # Generated outputs (described below)
        ├── {scenario}_perim.kml      # Fire perimeter KML
        ├── {scenario}_perim.shp      # Fire perimeter Shapefile
        ├── {scenario}_MAX_ROS.tif    # Grid statistic outputs
        ├── {scenario}.txt            # Summary file
        └── {scenario}_stats.json     # Statistics file
```

**Naming Convention:**
- `{scenario}` = Scenario name defined in job (e.g., "Primary", "Scenario_1")
- `{statistic}` = Statistical output type (e.g., "MAX_ROS", "BURN_GRID")

---

## Fire Perimeter Outputs (Vector Files)

### Overview

Fire perimeters represent the fire boundary at specific time steps. WISE can output time-stepped perimeters (multiple boundaries showing fire progression) or final perimeters only.

### Supported Formats

| Format | Extension | Use Case | Time-Stepped | Attributes |
|--------|-----------|----------|--------------|------------|
| **KML** | `.kml`, `.kmz` | Google Earth, web viewers | ✅ Yes | Time, area, perimeter |
| **Shapefile** | `.shp` (+ .shx, .dbf, .prj) | GIS software, analysis | ✅ Yes | Full attribute table |
| **GeoJSON** | `.geojson` | Web mapping (via conversion) | ✅ Yes | JSON attributes |

### Configuration via API

```typescript
import * as modeller from 'wise_js_api';

// Create vector output for KML
let vectorKml = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.KML,
  'fire_perimeter.kml',
  scenarioStartTime,
  scenarioEndTime,
  scenario
);

// Configuration options
vectorKml.multPerim = true;          // Multiple time-stepped perimeters
vectorKml.removeIslands = true;      // Remove unburned holes within perimeter
vectorKml.mergeContact = true;       // Merge perimeters that touch
vectorKml.activePerim = false;       // Export all perimeters (not just active front)

// Create vector output for Shapefile
let vectorShp = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.SHP,
  'fire_perimeter.shp',
  scenarioStartTime,
  scenarioEndTime,
  scenario
);
vectorShp.multPerim = true;
vectorShp.removeIslands = true;
```

### KML Output Format

**Basic KML Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Fire Perimeters - Scenario_Primary</name>
    <Placemark>
      <name>Fire Perimeter - 2024-07-15T14:00:00</name>
      <description>
        Time: 2024-07-15T14:00:00
        Area: 125.3 hectares
        Perimeter: 4250.5 meters
      </description>
      <TimeStamp>
        <when>2024-07-15T14:00:00Z</when>
      </TimeStamp>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -117.2456,49.5123,0
              -117.2460,49.5125,0
              ...
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    <!-- Additional time-stepped perimeters -->
  </Document>
</kml>
```

**Attributes in KML:**
- Time stamp (ISO 8601)
- Area burned (hectares)
- Perimeter length (meters)
- Geometry (Polygon coordinates)

### Shapefile Output Format

**File Components:**
- `.shp` - Geometry (polygons)
- `.shx` - Spatial index
- `.dbf` - Attribute table
- `.prj` - Projection definition

**Attribute Table Schema:**
| Field | Type | Description | Units |
|-------|------|-------------|-------|
| `TIME` | DateTime | Perimeter timestamp | ISO 8601 |
| `AREA` | Float | Area burned | hectares |
| `PERIMETER` | Float | Perimeter length | meters |
| `SCENARIO` | String | Scenario name | - |
| `ACTIVE` | Boolean | Active fire front | true/false |

### Time-Stepped Perimeters

**Display Interval Control:**

The frequency of perimeter outputs is controlled by the scenario's `displayInterval`:

```typescript
scenario.displayInterval = Duration.fromISO("PT1H");  // Hourly perimeters
scenario.displayInterval = Duration.fromISO("PT15M"); // 15-minute perimeters
scenario.displayInterval = Duration.fromISO("PT6H");  // 6-hour perimeters
```

**Use Cases by Interval:**
- **15 minutes**: High-detail animation, short-duration events
- **1 hour**: Standard fire modeling output, operational planning
- **6 hours**: Extended forecasts, multi-day simulations

---

## Grid Outputs (Raster Statistics)

### Overview

Grid files contain spatial statistics computed across the entire modeling domain. WISE outputs grids as GeoTIFF or ASCII Grid format, with statistics interpolated or discretized onto the grid.

### Supported Formats

| Format | Extension | Compression | Use Case |
|--------|-----------|-------------|----------|
| **GeoTIFF** | `.tif` | JPEG, LZW, DEFLATE, None | GIS, web mapping, analysis |
| **ASCII Grid** | `.asc` | None | Legacy systems, simple parsing |

### Configuration via API

```typescript
import * as modeller from 'wise_js_api';

// Create grid output for Maximum Rate of Spread
let gridOutput = prom.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.MAX_ROS,  // Statistic type
  'max_ros.tif',                               // Output filename
  outputTime,                                  // Simulation time for output
  scenario
);

// Configuration options
gridOutput.interpMethod = modeller.wise.Output_GridFileInterpolation.IDW;  // Interpolation method
gridOutput.compression = modeller.wise.Output_GridFileCompression.DEFLATE; // TIF compression
gridOutput.shouldStream = true;                // Stream to disk during simulation
gridOutput.minimizeBoundingBox = true;         // Crop to fire extent
```

### Available Statistics (60+ options)

WISE provides extensive grid outputs via the `GlobalStatistics` enumeration:

#### Fire Behavior Statistics

| Statistic | Units | Description | API Constant |
|-----------|-------|-------------|--------------|
| **Rate of Spread** | m/min | Maximum rate of spread | `MAX_ROS` |
| **Fire Intensity** | kW/m | Maximum fire intensity | `MAX_FI` |
| **Flame Length** | meters | Maximum flame length | `MAX_FL` |
| **Crown Fraction Burned** | 0-1 | Proportion of crown consumed | `MAX_CFB` |
| **Head ROS** | m/min | Rate of spread at fire head | `HROS` |
| **Flank ROS** | m/min | Rate of spread at fire flanks | `FROS` |
| **Back ROS** | m/min | Rate of spread at fire back | `BROS` |

#### Arrival Time & Burn Status

| Statistic | Units | Description | API Constant |
|-----------|-------|-------------|--------------|
| **Burn Grid** | boolean | Binary burned/unburned | `BURN_GRID` |
| **Fire Arrival Time** | minutes | Time fire reached each cell | `FIRE_ARRIVAL_TIME` |
| **Fire Arrival Time (MIN)** | minutes | Minimum arrival time | `FIRE_ARRIVAL_TIME_MIN` |
| **Fire Arrival Time (MAX)** | minutes | Maximum arrival time | `FIRE_ARRIVAL_TIME_MAX` |

#### Fuel Consumption

| Statistic | Units | Description | API Constant |
|-----------|-------|-------------|--------------|
| **Total Fuel Consumed** | kg/m² | Total fuel consumed (crown + surface) | `TOTAL_FUEL_CONSUMED` |
| **Crown Fuel Consumed** | kg/m² | Crown fuel consumed | `CROWN_FUEL_CONSUMED` |
| **Surface Fuel Consumed** | kg/m² | Surface fuel consumed | `SURFACE_FUEL_CONSUMED` |
| **Max Crown Fuel Consumption** | kg/m² | Maximum CFC based on ROS | `MAX_CFC` |
| **Max Surface Fuel Consumption** | kg/m² | Maximum SFC based on ROS | `MAX_SFC` |
| **Max Total Fuel Consumption** | kg/m² | Maximum TFC based on ROS | `MAX_TFC` |

#### Perimeter Statistics

| Statistic | Units | Description | API Constant |
|-----------|-------|-------------|--------------|
| **Active Perimeter** | meters | Active fire front length per cell | `ACTIVE_PERIMETER` |
| **Total Perimeter** | meters | Total perimeter length per cell | `TOTAL_PERIMETER` |
| **Exterior Perimeter** | meters | Exterior perimeter length | `EXTERIOR_PERIMETER` |

#### Weather & FWI Indices

| Statistic | Units | Description | API Constant |
|-----------|-------|-------------|--------------|
| **Temperature** | °C | Temperature at time of burning | `TEMPERATURE` |
| **Wind Speed** | km/h | Wind speed at time of burning | `WIND_SPEED` |
| **Wind Direction** | degrees | Wind direction at time of burning | `WIND_DIRECTION` |
| **Relative Humidity** | % | Relative humidity | `RELATIVE_HUMIDITY` |
| **FFMC** | 0-101 | Fine Fuel Moisture Code | `FFMC` |
| **DMC** | 0-∞ | Duff Moisture Code | `DMC` |
| **DC** | 0-∞ | Drought Code | `DC` |
| **ISI** | 0-∞ | Initial Spread Index | `ISI` |
| **BUI** | 0-∞ | Buildup Index | `BUI` |
| **FWI** | 0-∞ | Fire Weather Index | `FWI` |

#### Classified Statistics (Fire Intensity Classes)

| Statistic | Description | API Constant |
|-----------|-------------|--------------|
| **FI < 10** | Area with FI < 10 kW/m | `FI_LT_10` |
| **FI 10-500** | Area with FI 10-500 kW/m | `FI_10_500` |
| **FI 500-2000** | Area with FI 500-2000 kW/m | `FI_500_2000` |
| **FI 2000-4000** | Area with FI 2000-4000 kW/m | `FI_2000_4000` |
| **FI 4000-10000** | Area with FI 4000-10000 kW/m | `FI_4000_10000` |
| **FI > 10000** | Area with FI > 10000 kW/m | `FI_GT_10000` |

#### Classified Statistics (ROS Classes)

| Statistic | Description | API Constant |
|-----------|-------------|--------------|
| **ROS 0-1** | Area with ROS 0-1 m/min | `ROS_0_1` |
| **ROS 2-4** | Area with ROS 2-4 m/min | `ROS_2_4` |
| **ROS 5-8** | Area with ROS 5-8 m/min | `ROS_5_8` |
| **ROS 9-14** | Area with ROS 9-14 m/min | `ROS_9_14` |
| **ROS > 15** | Area with ROS > 15 m/min | `ROS_GT_15` |

#### Critical Path & Probabilities

| Statistic | Units | Description | API Constant |
|-----------|-------|-------------|--------------|
| **Critical Path** | - | Critical fire path | `CRITICAL_PATH` |
| **Critical Path Percentage** | % | Percentage along critical path | `CRITICAL_PATH_PERCENTAGE` |

**Complete Enumeration Reference:**
See `wise_js_api/dist/wiseGlobals.d.ts` for the full `GlobalStatistics` enum (60+ values).

### Interpolation Methods

Grid statistics can be interpolated using different methods:

```typescript
export enum Output_GridFileInterpolation {
  CLOSEST_VERTEX = 0,    // Nearest neighbor (fastest)
  IDW = 1,               // Inverse Distance Weighted (smooth)
  AREA_WEIGHTING = 2,    // Area-based weighting
  CALCULATE = 3,         // Calculated from polygon geometry
  DISCRETIZED = 4        // Discretized grid (required for fuel consumption)
}
```

**When to Use:**
- **CLOSEST_VERTEX**: Fast visualization, categorical data
- **IDW**: Smooth continuous fields (ROS, FI, temperature)
- **AREA_WEIGHTING**: Area-based statistics
- **CALCULATE**: Geometry-derived statistics
- **DISCRETIZED**: Required for `TOTAL_FUEL_CONSUMED`, `CROWN_FUEL_CONSUMED`, `SURFACE_FUEL_CONSUMED`, `RADIATIVE_POWER`

### Compression Options

GeoTIFF outputs support compression:

```typescript
export enum Output_GridFileCompression {
  NONE = 0,        // No compression
  JPEG = 1,        // JPEG (byte data only, lossy)
  LZW = 2,         // LZW (lossless)
  PACKBITS = 3,    // PackBits (lossless)
  DEFLATE = 4,     // DEFLATE (lossless, recommended)
  CCITTRLE = 5,    // CCITT RLE (bi-level)
  CCITTFAX3 = 6,   // CCITT FAX3
  CCITTFAX4 = 7,   // CCITT FAX4
  LZMA = 8,        // LZMA (lossless)
  ZSTD = 9,        // ZSTD (lossless, fast)
  WEBP = 10,       // WebP (lossy/lossless)
  LERC = 11        // LERC (limited error raster compression)
}
```

**Recommendations:**
- **DEFLATE**: Best general-purpose compression (lossless, broad support)
- **LZW**: Good compatibility with older GIS software
- **ZSTD**: Fastest compression/decompression (requires newer GDAL)
- **NONE**: No compression overhead, larger files

### GeoTIFF Format Details

**File Structure:**
```
GeoTIFF Header
├── Metadata
│   ├── Projection (from input grid)
│   ├── Geotransform (spatial reference)
│   ├── NoData value (-1 or grid-specific)
│   └── Units (from statistic type)
├── Raster Band
│   ├── Data type: Float32 (continuous) or Int16 (categorical)
│   ├── Color interpretation: Gray
│   └── Statistics (min, max, mean, stddev)
└── Compressed Data (if compression enabled)
```

**Reading GeoTIFF in MapBox GL:**

GeoTIFF files require conversion to MapBox-compatible formats. See "Post-Processing for MapBox GL" section below.

### ASCII Grid Format

**Format Specification:**
```
NCOLS        250
NROWS        300
XLLCORNER    450000.0
YLLCORNER    5200000.0
CELLSIZE     50.0
NODATA_value -9999
12.5 14.2 15.8 ...
13.1 15.3 16.9 ...
...
```

**Header Fields:**
- `NCOLS`: Number of columns
- `NROWS`: Number of rows
- `XLLCORNER`: X coordinate of lower-left corner
- `YLLCORNER`: Y coordinate of lower-left corner
- `CELLSIZE`: Cell size in map units
- `NODATA_value`: Value representing no data

**Data Section:**
- Space-delimited values
- Row-major order (top to bottom)
- Values correspond to selected statistic

---

## Statistics Outputs (Temporal Data)

### Overview

Statistics files provide time-series data summarizing fire behavior over the simulation period. They track metrics like total area burned, perimeter growth, and maximum fire intensity at each time step.

### Supported Formats

| Format | Extension | Structure | Use Case |
|--------|-----------|-----------|----------|
| **JSON (Row)** | `.json` | Row-oriented JSON | Web applications, JavaScript |
| **JSON (Column)** | `.json` | Column-oriented JSON | Data analysis, R/Python |
| **CSV** | `.csv` | Comma-separated values | Excel, spreadsheets, R |

### Configuration via API

```typescript
import * as modeller from 'wise_js_api';

// Create statistics file output
let stats = prom.addOutputStatsFileToScenario(scenario, 'fire_stats.json');

// File format selection
stats.fileType = modeller.wise.StatsFileType.JSON_ROW;

// Add statistics columns to track
stats.addColumn(modeller.globals.GlobalStatistics.DATE_TIME);
stats.addColumn(modeller.globals.GlobalStatistics.ELAPSED_TIME);
stats.addColumn(modeller.globals.GlobalStatistics.TOTAL_BURN_AREA);
stats.addColumn(modeller.globals.GlobalStatistics.AREA_GROWTH_RATE);
stats.addColumn(modeller.globals.GlobalStatistics.EXTERIOR_PERIMETER);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_ROS);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_FI);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_FL);

// Optional: embed critical path data
stats.embeddedPath = true;  // Include critical fire path in output
```

### File Format Types

```typescript
export enum StatsFileType {
  AUTO = 0,          // Auto-detect from extension (.json = JSON_ROW)
  JSON_ROW = 1,      // Row-oriented JSON (default)
  JSON_COLUMN = 2,   // Column-oriented JSON
  CSV = 3,           // Comma-separated values
  CSV_NO_HEADER = 4  // CSV without header row
}
```

### JSON Row Format

**Structure:**
```json
{
  "scenario": "Primary_Scenario",
  "job": "job_20240625064422915",
  "timesteps": [
    {
      "time": "2024-07-15T14:00:00Z",
      "elapsed_seconds": 0,
      "total_area": 0.5,
      "area_growth_rate": 0.0,
      "perimeter": 125.4,
      "max_ros": 0.0,
      "max_fi": 0.0,
      "max_fl": 0.0
    },
    {
      "time": "2024-07-15T15:00:00Z",
      "elapsed_seconds": 3600,
      "total_area": 125.3,
      "area_growth_rate": 2.08,
      "perimeter": 4250.5,
      "max_ros": 12.5,
      "max_fi": 3500.2,
      "max_fl": 4.8
    }
    // ... additional timesteps
  ]
}
```

**Use Case:** Direct consumption in web applications, real-time charting

### JSON Column Format

**Structure:**
```json
{
  "scenario": "Primary_Scenario",
  "job": "job_20240625064422915",
  "data": {
    "time": [
      "2024-07-15T14:00:00Z",
      "2024-07-15T15:00:00Z",
      "2024-07-15T16:00:00Z"
    ],
    "total_area": [0.5, 125.3, 487.2],
    "area_growth_rate": [0.0, 2.08, 6.03],
    "perimeter": [125.4, 4250.5, 8920.3],
    "max_ros": [0.0, 12.5, 15.8],
    "max_fi": [0.0, 3500.2, 4200.7],
    "max_fl": [0.0, 4.8, 5.2]
  }
}
```

**Use Case:** Data analysis in R/Python (easy to convert to data frames)

### CSV Format

**Structure:**
```csv
time,elapsed_seconds,total_area,area_growth_rate,perimeter,max_ros,max_fi,max_fl
2024-07-15T14:00:00Z,0,0.5,0.0,125.4,0.0,0.0,0.0
2024-07-15T15:00:00Z,3600,125.3,2.08,4250.5,12.5,3500.2,4.8
2024-07-15T16:00:00Z,7200,487.2,6.03,8920.3,15.8,4200.7,5.2
```

**Use Case:** Excel analysis, R/Python data import, legacy systems

### Available Statistics for Tracking

All `GlobalStatistics` values can be tracked in statistics files:

**Temporal Metrics:**
- `DATE_TIME`: Simulation timestamp
- `ELAPSED_TIME`: Seconds since simulation start
- `TIME_STEP_DURATION`: Duration of time step

**Area Metrics:**
- `TOTAL_BURN_AREA`: Total area burned (m²)
- `AREA_GROWTH_RATE`: Rate of area growth (m²/min)
- `TIMESTEP_BURN_AREA`: Area burned in current timestep

**Perimeter Metrics:**
- `EXTERIOR_PERIMETER`: Total exterior perimeter (m)
- `ACTIVE_PERIMETER`: Active burning perimeter (m)
- `TOTAL_PERIMETER`: Total perimeter including interior (m)
- `EXTERIOR_PERIMETER_GROWTH_RATE`: Perimeter growth rate (m/min)

**Fire Behavior:**
- `MAX_ROS`: Maximum rate of spread (m/min)
- `MAX_FI`: Maximum fire intensity (kW/m)
- `MAX_FL`: Maximum flame length (m)
- `MAX_CFB`: Maximum crown fraction burned (0-1)

**Weather Conditions:**
- `TEMPERATURE`: Air temperature (°C)
- `WIND_SPEED`: Wind speed (km/h)
- `WIND_DIRECTION`: Wind direction (degrees)
- `RELATIVE_HUMIDITY`: Relative humidity (%)

**FWI System:**
- `FFMC`, `DMC`, `DC`, `ISI`, `BUI`, `FWI`

---

## Summary Outputs

### Overview

Summary files provide human-readable text reports of the simulation, including inputs, landscape data, weather conditions, and final results.

### Configuration via API

```typescript
import * as modeller from 'wise_js_api';

// Create summary file output
let summary = prom.addOutputSummaryFileToScenario(scenario, "simulation_summary.txt");

// Configure what to include
summary.outputs.outputInputs = true;        // Include input parameters
summary.outputs.outputLandscape = true;     // Include landscape/fuel info
summary.outputs.outputWxData = true;        // Include weather data
summary.outputs.outputScenario = true;      // Include scenario settings
summary.outputs.outputScenarioComments = true;  // Include comments
summary.outputs.outputFBPPatches = true;    // Include fuel patches
summary.outputs.outputWxPatches = true;     // Include weather patches
summary.outputs.outputIgnitions = true;     // Include ignition details
summary.outputs.outputWxStreams = true;     // Include weather streams
summary.outputs.outputFBP = true;           // Include FBP calculations
```

### Summary File Format

**Text Structure:**
```
================================================================================
WISE FIRE SIMULATION SUMMARY
================================================================================

JOB INFORMATION
  Job Name: job_20240625064422915
  Scenario: Primary_Scenario
  Execution Date: 2024-06-25 06:44:22

SIMULATION PERIOD
  Start Time: 2024-07-15 14:00:00
  End Time: 2024-07-16 18:00:00
  Duration: 28 hours
  Display Interval: 1 hour

LANDSCAPE INPUTS
  Fuel Grid: /data/fuels/bc_fuel_grid.tif
  Projection: NAD83 / UTM Zone 11N
  Grid Resolution: 50m x 50m
  Extent: 12.5 km x 15.0 km
  Elevation Grid: /data/dem/bc_elevation.tif

FUEL TYPES
  C-2 (Boreal Spruce): 45.2% of area
  C-3 (Mature Jack/Lodgepole Pine): 28.7% of area
  D-1 (Leafless Aspen): 15.3% of area
  M-2 (Boreal Mixedwood - Green): 8.1% of area
  Non-fuel: 2.7% of area

WEATHER STATION
  Station ID: Station_1
  Location: 49.5123°N, 117.2456°W
  Elevation: 650 m
  Weather Stream: weather_data_20240715.txt
  Period: 2024-07-15 to 2024-07-16

INITIAL FWI VALUES
  FFMC: 89.5
  DMC: 45.2
  DC: 320.1

IGNITION
  Type: Point
  Location: 49.5123°N, 117.2456°W
  Start Time: 2024-07-15 14:00:00

FIRE BEHAVIOR SUMMARY
  Final Area Burned: 1,247.5 hectares
  Final Perimeter: 18,450.2 meters
  Maximum Rate of Spread: 18.7 m/min
  Maximum Fire Intensity: 5,200.3 kW/m
  Maximum Flame Length: 6.2 meters
  Total Fuel Consumed: 45,250 kg

EXECUTION STATUS
  Status: Completed Successfully
  Computation Time: 3 minutes 42 seconds

================================================================================
```

### Use Cases

- **Documentation**: Permanent record of simulation parameters and results
- **Quality Control**: Verify inputs were correctly interpreted
- **Reporting**: Include in operational reports to agencies
- **Debugging**: Identify parameter issues when results are unexpected

---

## Brett Moore KML Enhancement System

### Overview

Brett Moore (Canadian Forest Service) developed an R-based KML enhancement system that converts WISE shapefiles to enhanced KML/KMZ files with:
- Time-aware visualization
- Color-coded fire progression
- Legend generation
- Multi-perimeter support

This system is referenced in the Fire Engine Abstraction Layer for integration into Project Nomad.

### Enhancement Features

**Color-Coded Progression:**
Fire perimeters are colored by time using a gradient:
- **Red** (`#EF2820`): Early fire (initial ignition)
- **Orange** (`#F89E46`): Early growth
- **Yellow** (`#F1FB7C`): Mid-growth
- **Light Green** (`#A6CAAD`): Late growth
- **Blue** (`#38A1D0`): Final perimeter

**Legend Generation:**
Automatic legend image showing:
- Color ramp with time labels
- Fire progression timestamps
- Area statistics per perimeter

**Time-Aware Features:**
- KML `<TimeSpan>` elements for temporal playback
- Google Earth timeline slider compatibility
- Animation support in GIS viewers

### Integration Pattern (from WiseGuy)

```typescript
import { KMLEnhancer, BrettMooreIntegration } from './utils/KMLEnhancer';

// Enhanced KML generation from ModelingResult
const enhancedKML = await KMLEnhancer.enhanceModelingResult(
  modelingResult,
  {
    includeTimespan: true,
    generateLegend: true,
    colorRamp: ['#EF2820', '#F89E46', '#F1FB7C', '#A6CAAD', '#38A1D0'],
    outputDirectory: './output'
  }
);

// Output files
console.log(`KML: ${enhancedKML.kmlPath}`);
console.log(`Legend: ${enhancedKML.legendPath}`);
console.log(`KMZ: ${enhancedKML.kmzPath}`);

// Shapefile to KML conversion (calls Brett's R script)
const { kmlPath, legendPath } = await BrettMooreIntegration.convertShapefileToKML(
  './outputs/Primary_perim.shp',
  './enhanced_output'
);

// Add timespan to existing KML
const enhancedPath = await BrettMooreIntegration.addTimespanToKML(
  './outputs/fire_perimeter.kml'
);
```

### R Script Reference

**Original System Location:**
```
contributions/brett_moore_CFS/Shp_To_KML.R
```

**Key Functions:**
- `convert_shapefile_to_kml()`: Main conversion function
- `generate_color_ramp()`: Create time-based color gradient
- `create_legend_image()`: Generate legend PNG/JPG
- `add_timespan()`: Add KML TimeSpan elements
- `create_kmz_archive()`: Package KML + legend into KMZ

**Production Integration:**
In Project Nomad, this R system should be:
1. Called via shell script from Node.js backend
2. Integrated into output post-processing pipeline
3. Triggered automatically after WISE job completion
4. Optional based on user export preferences

---

## Configuring Output Generation

### Output Selection Strategy

**Minimal Outputs (Fast Execution):**
```typescript
// Only final perimeter
let vectorKml = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.KML,
  'final_perimeter.kml',
  scenarioEndTime,  // Only end time
  scenarioEndTime,
  scenario
);
vectorKml.multPerim = false;  // Single perimeter only
```

**Standard Outputs (Balanced):**
```typescript
// Time-stepped perimeters + key statistics
let vectorKml = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.KML,
  'perimeters.kml',
  scenarioStartTime,
  scenarioEndTime,
  scenario
);
vectorKml.multPerim = true;

// Statistics file
let stats = prom.addOutputStatsFileToScenario(scenario, 'stats.json');
stats.addColumn(modeller.globals.GlobalStatistics.TOTAL_BURN_AREA);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_ROS);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_FI);

// Summary
let summary = prom.addOutputSummaryFileToScenario(scenario, 'summary.txt');
summary.outputs.outputInputs = true;
summary.outputs.outputScenario = true;
```

**Comprehensive Outputs (Full Analysis):**
```typescript
// Multiple vector formats
let kml = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.KML, 'perimeters.kml',
  scenarioStartTime, scenarioEndTime, scenario
);
kml.multPerim = true;

let shp = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.SHP, 'perimeters.shp',
  scenarioStartTime, scenarioEndTime, scenario
);
shp.multPerim = true;

// Grid statistics
let maxRos = prom.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.MAX_ROS,
  'max_ros.tif', scenarioEndTime, scenario
);
let burnGrid = prom.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.BURN_GRID,
  'burn_grid.tif', scenarioEndTime, scenario
);
let fireIntensity = prom.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.MAX_FI,
  'max_fi.tif', scenarioEndTime, scenario
);
let arrivalTime = prom.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.FIRE_ARRIVAL_TIME,
  'arrival_time.tif', scenarioEndTime, scenario
);

// Full statistics
let stats = prom.addOutputStatsFileToScenario(scenario, 'stats.json');
stats.addColumn(modeller.globals.GlobalStatistics.DATE_TIME);
stats.addColumn(modeller.globals.GlobalStatistics.TOTAL_BURN_AREA);
stats.addColumn(modeller.globals.GlobalStatistics.AREA_GROWTH_RATE);
stats.addColumn(modeller.globals.GlobalStatistics.EXTERIOR_PERIMETER);
stats.addColumn(modeller.globals.GlobalStatistics.ACTIVE_PERIMETER);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_ROS);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_FI);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_FL);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_CFB);

// Full summary
let summary = prom.addOutputSummaryFileToScenario(scenario, 'summary.txt');
summary.outputs.outputInputs = true;
summary.outputs.outputLandscape = true;
summary.outputs.outputWxData = true;
summary.outputs.outputScenario = true;
summary.outputs.outputIgnitions = true;
```

### Performance Considerations

**Factors Affecting Output Generation Time:**
- **Grid resolution**: Finer grids = more data to write
- **Number of statistics**: Each grid file requires separate computation
- **Compression**: Compression adds processing time but reduces file size
- **Multi-perimeter KML**: More timesteps = larger files
- **File format**: Shapefile slower than KML due to multiple file writes

**Optimization Strategies:**
1. **Minimize grid outputs**: Only generate grids needed for analysis
2. **Use compression**: DEFLATE reduces file size with minimal overhead
3. **Limit perimeter frequency**: Use longer display intervals (e.g., 1 hour vs 15 min)
4. **Defer grid generation**: Generate grids only on-demand for specific analyses

---

## Output File Naming Conventions

### Automatic Naming Pattern

WISE uses the following naming pattern for outputs:

```
{scenarioName}_{outputType}[_{statistic}].{extension}
```

**Components:**
- `{scenarioName}`: Scenario ID/name (e.g., "Primary", "Scenario_1")
- `{outputType}`: Output category (e.g., "perim", "stats", "summary")
- `{statistic}`: Grid statistic type (e.g., "MAX_ROS", "BURN_GRID")
- `{extension}`: File format (.kml, .shp, .tif, .json, .txt)

### Examples

| Output Type | Example Filename | Notes |
|-------------|------------------|-------|
| KML Perimeter | `Primary_perim.kml` | Scenario "Primary" |
| Shapefile Perimeter | `Scenario_1_perim.shp` | Also generates .shx, .dbf, .prj |
| Max ROS Grid | `Primary_MAX_ROS.tif` | GeoTIFF grid |
| Burn Grid | `Primary_BURN_GRID.tif` | Binary raster |
| Statistics File | `Primary_stats.json` | JSON time series |
| Summary File | `Primary_summary.txt` | Text report |

### Custom Naming

Filenames can be customized via API:

```typescript
// Custom perimeter filename
let vectorKml = prom.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.KML,
  'custom_fire_boundary_2024.kml',  // Custom name
  scenarioStartTime,
  scenarioEndTime,
  scenario
);

// Custom grid filename
let gridOutput = prom.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.MAX_ROS,
  'rate_of_spread_maximum.tif',  // Custom name
  outputTime,
  scenario
);
```

**Best Practices:**
- Use descriptive names for custom outputs
- Include date/scenario identifier in name
- Avoid spaces (use underscores or hyphens)
- Keep names under 255 characters
- Use standard extensions for compatibility

---

## Post-Processing for MapBox GL Visualization

### Overview

WISE outputs are optimized for GIS software but require conversion for modern web mapping libraries like MapBox GL. This section describes the conversion pipeline.

### Vector Data (Fire Perimeters)

**Required Conversion: Shapefile/KML → GeoJSON**

MapBox GL natively supports GeoJSON. Convert WISE vector outputs using GDAL:

```bash
# Shapefile to GeoJSON
ogr2ogr -f GeoJSON \
  -t_srs EPSG:4326 \
  perimeters.geojson \
  Primary_perim.shp

# KML to GeoJSON
ogr2ogr -f GeoJSON \
  -t_srs EPSG:4326 \
  perimeters.geojson \
  Primary_perim.kml
```

**GeoJSON Output Structure:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "time": "2024-07-15T14:00:00Z",
        "area": 125.3,
        "perimeter": 4250.5,
        "scenario": "Primary"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-117.2456, 49.5123],
            [-117.2460, 49.5125],
            ...
          ]
        ]
      }
    }
  ]
}
```

**MapBox GL Integration:**
```javascript
// Add GeoJSON source
map.addSource('fire-perimeters', {
  type: 'geojson',
  data: '/outputs/perimeters.geojson'
});

// Add fill layer
map.addLayer({
  id: 'fire-perimeter-fill',
  type: 'fill',
  source: 'fire-perimeters',
  paint: {
    'fill-color': '#ff0000',
    'fill-opacity': 0.4
  }
});

// Add outline layer
map.addLayer({
  id: 'fire-perimeter-outline',
  type: 'line',
  source: 'fire-perimeters',
  paint: {
    'line-color': '#ff0000',
    'line-width': 2
  }
});
```

### Raster Data (Grid Statistics)

**Required Conversion: GeoTIFF → Raster Tiles or PNG**

MapBox GL can display rasters via:
1. **Raster tiles (MBTiles)** - Best for large datasets
2. **PNG overlays** - Best for small single-purpose grids
3. **Vector tiles** - Best for interactive grids (requires additional conversion)

#### Option 1: Raster Tiles (MBTiles)

```bash
# Convert GeoTIFF to MBTiles using GDAL
gdal_translate -of MBTiles \
  -co TILE_FORMAT=PNG \
  -co ZOOM_LEVEL_STRATEGY=AUTO \
  Primary_MAX_ROS.tif \
  max_ros_tiles.mbtiles

# Or use rio-mbtiles
rio mbtiles Primary_MAX_ROS.tif -o max_ros_tiles.mbtiles --format PNG
```

**MapBox GL Integration:**
```javascript
map.addSource('max-ros-raster', {
  type: 'raster',
  url: 'mbtiles://max_ros_tiles.mbtiles'
});

map.addLayer({
  id: 'max-ros-layer',
  type: 'raster',
  source: 'max-ros-raster',
  paint: {
    'raster-opacity': 0.7
  }
});
```

#### Option 2: PNG Overlay

```bash
# Convert GeoTIFF to georeferenced PNG
gdalwarp -of PNG \
  -t_srs EPSG:3857 \
  -ts 2048 2048 \
  Primary_MAX_ROS.tif \
  max_ros.png

# Extract bounds for MapBox
gdalinfo -json Primary_MAX_ROS.tif | jq '.wgs84Extent.coordinates'
```

**MapBox GL Integration:**
```javascript
map.addSource('max-ros-png', {
  type: 'image',
  url: '/outputs/max_ros.png',
  coordinates: [
    [-117.3, 49.6],  // Top-left
    [-117.1, 49.6],  // Top-right
    [-117.1, 49.4],  // Bottom-right
    [-117.3, 49.4]   // Bottom-left
  ]
});

map.addLayer({
  id: 'max-ros-overlay',
  type: 'raster',
  source: 'max-ros-png',
  paint: {
    'raster-opacity': 0.7,
    'raster-fade-duration': 0
  }
});
```

#### Option 3: Vector Tiles (Interactive Grids)

For grids that need interactive querying (e.g., click to get value):

```bash
# Convert GeoTIFF to contour polygons
gdal_contour -p \
  -amax MAX_ROS -amin MIN_ROS \
  -i 5.0 \
  Primary_MAX_ROS.tif \
  max_ros_contours.shp

# Convert to GeoJSON
ogr2ogr -f GeoJSON max_ros_contours.geojson max_ros_contours.shp

# Convert to vector tiles (Tippecanoe)
tippecanoe -o max_ros.mbtiles \
  -z14 -Z6 \
  --drop-densest-as-needed \
  max_ros_contours.geojson
```

**MapBox GL Integration:**
```javascript
map.addSource('max-ros-contours', {
  type: 'vector',
  url: 'mbtiles://max_ros.mbtiles'
});

map.addLayer({
  id: 'max-ros-fill',
  type: 'fill',
  source: 'max-ros-contours',
  'source-layer': 'max_ros_contours',
  paint: {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'MAX_ROS'],
      0, '#ffffcc',
      5, '#ffeda0',
      10, '#feb24c',
      15, '#f03b20',
      20, '#bd0026'
    ],
    'fill-opacity': 0.6
  }
});
```

### Color Ramps for Fire Intensity

**Recommended Color Schemes:**

**Rate of Spread (m/min):**
```javascript
const rosColorRamp = [
  'interpolate', ['linear'], ['get', 'MAX_ROS'],
  0, '#ffffcc',   // Light yellow (slow)
  2, '#ffeda0',
  5, '#fed976',
  8, '#feb24c',
  12, '#fd8d3c',
  15, '#fc4e2a',
  20, '#e31a1c',
  25, '#bd0026',
  30, '#800026'   // Dark red (fast)
];
```

**Fire Intensity (kW/m):**
```javascript
const fiColorRamp = [
  'interpolate', ['linear'], ['get', 'MAX_FI'],
  0, '#ffffcc',      // Very Low
  10, '#ffeda0',
  500, '#feb24c',    // Low
  2000, '#fd8d3c',   // Moderate
  4000, '#fc4e2a',   // High
  10000, '#e31a1c',  // Very High
  20000, '#bd0026',
  50000, '#800026'   // Extreme
];
```

**Flame Length (m):**
```javascript
const flColorRamp = [
  'interpolate', ['linear'], ['get', 'MAX_FL'],
  0, '#ffffcc',    // < 1m
  1, '#ffeda0',
  2, '#fed976',
  3, '#feb24c',    // 3m (suppression difficulty threshold)
  4, '#fd8d3c',
  6, '#fc4e2a',
  8, '#e31a1c',
  10, '#bd0026',
  15, '#800026'    // > 15m (extreme)
];
```

### Statistics File Integration

**Loading JSON Statistics:**
```javascript
// Fetch statistics file
const stats = await fetch('/outputs/Primary_stats.json').then(r => r.json());

// Create time-series chart (using Chart.js)
const ctx = document.getElementById('fireChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: stats.timesteps.map(t => new Date(t.time)),
    datasets: [
      {
        label: 'Area Burned (hectares)',
        data: stats.timesteps.map(t => t.total_area / 10000), // m² to ha
        borderColor: '#ff0000',
        fill: false
      },
      {
        label: 'Perimeter (km)',
        data: stats.timesteps.map(t => t.perimeter / 1000), // m to km
        borderColor: '#0000ff',
        fill: false
      }
    ]
  },
  options: {
    scales: {
      x: { type: 'time' }
    }
  }
});
```

### Time-Stepped Perimeter Animation

**Animate Fire Growth:**
```javascript
// Load GeoJSON with time-stepped perimeters
const perimeters = await fetch('/outputs/perimeters.geojson').then(r => r.json());

// Sort features by time
perimeters.features.sort((a, b) =>
  new Date(a.properties.time) - new Date(b.properties.time)
);

// Animation controller
let currentFrame = 0;
const animate = () => {
  const feature = perimeters.features[currentFrame];

  // Update map source
  map.getSource('current-perimeter').setData({
    type: 'FeatureCollection',
    features: [feature]
  });

  // Update time display
  document.getElementById('time-display').textContent = feature.properties.time;

  // Next frame
  currentFrame = (currentFrame + 1) % perimeters.features.length;
  setTimeout(animate, 1000); // 1 second per frame
};

animate();
```

---

## Quick Reference Tables

### Output Types Summary

| Type | Formats | Time-Stepped | Spatial | Use Case |
|------|---------|--------------|---------|----------|
| **Vector** | KML, SHP | ✅ Yes | Perimeters | Fire boundaries, Google Earth |
| **Grid** | TIF, ASC | ❌ Single time | Entire domain | Statistics, analysis |
| **Statistics** | JSON, CSV | ✅ Yes | Whole fire | Time series, charts |
| **Summary** | TXT | ❌ No | - | Documentation, reports |

### File Extensions

| Extension | Format | Tool | Use |
|-----------|--------|------|-----|
| `.kml` | KML | Google Earth, GIS | Vector perimeters |
| `.kmz` | KMZ (zipped KML) | Google Earth | KML + legend |
| `.shp` | Shapefile | GIS software | Vector analysis |
| `.tif` | GeoTIFF | GIS, GDAL | Raster statistics |
| `.asc` | ASCII Grid | Legacy GIS | Simple raster |
| `.json` | JSON | Web apps, scripts | Statistics, GeoJSON |
| `.csv` | CSV | Excel, R, Python | Spreadsheet analysis |
| `.txt` | Text | Any editor | Summary report |

### Recommended Output Sets by Use Case

#### Operational Fire Modeling
```
✓ KML perimeters (time-stepped, hourly)
✓ Statistics file (JSON)
✓ Summary file (TXT)
✓ MAX_ROS grid (TIF)
✓ MAX_FI grid (TIF)
```

#### Research & Analysis
```
✓ Shapefile perimeters (all timesteps)
✓ Statistics file (CSV)
✓ Summary file (TXT)
✓ All grid statistics:
  - MAX_ROS, MAX_FI, MAX_FL, MAX_CFB
  - BURN_GRID, FIRE_ARRIVAL_TIME
  - TOTAL_FUEL_CONSUMED
  - Weather grids (TEMPERATURE, WIND_SPEED, etc.)
```

#### Web Visualization (MapBox GL)
```
✓ GeoJSON perimeters (converted from KML)
✓ Statistics file (JSON)
✓ PNG or MBTiles rasters (converted from TIF):
  - MAX_ROS
  - MAX_FI
  - BURN_GRID
```

#### Google Earth Visualization
```
✓ KMZ perimeters (enhanced with Brett Moore system)
✓ Legend image (JPG/PNG)
✓ Time-aware KML with color ramp
```

---

## References

### WISE API Documentation
- `wise_js_api` TypeScript package: [npm](https://www.npmjs.com/package/wise_js_api)
- `wiseInterface.d.ts`: Output class definitions
- `wiseGlobals.d.ts`: GlobalStatistics enumeration

### Fire Engine Abstraction Layer
- WiseGuy repository: `/Users/franconogarin/localcode/wiseguy/`
- KMLEnhancer utilities: `src/utils/KMLEnhancer.ts`
- WISEEngine implementation: `src/engines/WISEEngine.ts`

### GDAL Tools
- GeoTIFF conversion: [GDAL documentation](https://gdal.org/)
- Vector conversion: `ogr2ogr` command
- Raster processing: `gdalwarp`, `gdal_translate`

### MapBox GL JS
- Raster layers: [MapBox docs](https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#raster)
- GeoJSON sources: [MapBox docs](https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson)
- Data-driven styling: [MapBox expressions](https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/)

### Brett Moore KML System
- Original R implementation: `contributions/brett_moore_CFS/Shp_To_KML.R`
- TypeScript integration: `src/utils/KMLEnhancer.ts`
- Canadian Forest Service collaboration

---

## Appendix: Complete GlobalStatistics List

For reference, the complete enumeration of available statistics from WISE:

```typescript
enum GlobalStatistics {
  // Temporal
  DATE_TIME = 0,
  ELAPSED_TIME = 1,
  TIME_STEP_DURATION = 2,

  // Weather
  TEMPERATURE = 3,
  DEW_POINT = 4,
  RELATIVE_HUMIDITY = 5,
  WIND_SPEED = 6,
  WIND_DIRECTION = 7,
  PRECIPITATION = 8,

  // FWI Indices
  HFFMC = 9,
  HISI = 10,
  DMC = 11,
  DC = 12,
  HFWI = 13,
  BUI = 14,
  FFMC = 15,
  ISI = 16,
  FWI = 17,

  // Area Metrics
  TIMESTEP_AREA = 18,
  TIMESTEP_BURN_AREA = 19,
  TOTAL_AREA = 20,
  TOTAL_BURN_AREA = 21,
  AREA_GROWTH_RATE = 22,

  // Perimeter Metrics
  EXTERIOR_PERIMETER = 23,
  EXTERIOR_PERIMETER_GROWTH_RATE = 24,
  ACTIVE_PERIMETER = 25,
  ACTIVE_PERIMETER_GROWTH_RATE = 26,
  TOTAL_PERIMETER = 27,
  TOTAL_PERIMETER_GROWTH_RATE = 28,

  // Fire Intensity Classes
  FI_LT_10 = 29,
  FI_10_500 = 30,
  FI_500_2000 = 31,
  FI_2000_4000 = 32,
  FI_4000_10000 = 33,
  FI_GT_10000 = 34,

  // ROS Classes
  ROS_0_1 = 35,
  ROS_2_4 = 36,
  ROS_5_8 = 37,
  ROS_9_14 = 38,
  ROS_GT_15 = 39,

  // Fire Behavior
  MAX_ROS = 40,
  MAX_FI = 41,
  MAX_FL = 42,
  MAX_CFB = 43,
  MAX_CFC = 44,
  MAX_SFC = 45,
  MAX_TFC = 46,

  // Fuel Consumption
  TOTAL_FUEL_CONSUMED = 47,
  CROWN_FUEL_CONSUMED = 48,
  SURFACE_FUEL_CONSUMED = 49,

  // Vertex Counts
  NUM_ACTIVE_VERTICES = 50,
  NUM_VERTICES = 51,

  // Additional fire behavior metrics
  HROS = 52,              // Head Rate of Spread
  FROS = 53,              // Flank Rate of Spread
  BROS = 54,              // Back Rate of Spread
  FIRE_ARRIVAL_TIME = 55,
  FIRE_ARRIVAL_TIME_MIN = 56,
  FIRE_ARRIVAL_TIME_MAX = 57,
  BURN_GRID = 58,
  RADIATIVE_POWER = 59,
  CRITICAL_PATH = 60,
  CRITICAL_PATH_PERCENTAGE = 61
}
```

**Note:** Exact enumeration values may vary by WISE version. Consult `wiseGlobals.d.ts` for definitive list.

---

**Document Prepared By**: Sage, WISE SME
**For**: Project Nomad Development Team
**Purpose**: Technical reference for WISE output integration into modern fire modeling GUI

