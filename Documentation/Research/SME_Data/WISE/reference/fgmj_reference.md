# FGMJ File Format Reference

## Document Overview

This reference provides comprehensive documentation for the FGMJ (Fire Growth Model Job) file format used by the WISE fire modeling system. FGMJ files are XML-based job specification files that define all aspects of a fire simulation including landscape data, weather inputs, ignition configurations, scenarios, and output requirements.

**Audience**: Developers integrating WISE into Project Nomad or other fire modeling applications.

**Last Updated**: 2025-11-25

---

## What is FGMJ?

**FGMJ** = **Fire Growth Model Job**

| Property | Description |
|----------|-------------|
| **Format** | XML-based job specification |
| **Created By** | WISE Builder service via `wise_js_api` |
| **Purpose** | Portable, self-contained job package for WISE execution |
| **Location** | `{PROJECT_JOBS_FOLDER}/{jobName}/job.fgmj` |
| **Execution** | Consumed by WISE.EXE (C++ core engine) |

### FGMJ in the WISE Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ WISE Job Execution Pipeline                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Configure via wise_js_api (TypeScript/JavaScript)          │
│     └─> Build job specification using Builder pattern           │
│                                                                  │
│  2. Generate FGMJ via beginJobPromise()                         │
│     └─> Builder creates job folder with job.fgmj                │
│                                                                  │
│  3. Execute WISE against FGMJ                                   │
│     └─> wise.exe job.fgmj                                       │
│                                                                  │
│  4. Monitor execution                                            │
│     └─> status.json (polling) or MQTT (real-time)              │
│                                                                  │
│  5. Collect results                                              │
│     └─> Outputs/ folder (KML, SHP, TIF, TXT)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Job Folder Structure

When Builder creates an FGMJ job via `beginJobPromise()`, it generates a complete job folder:

```
{PROJECT_JOBS_FOLDER}/
└── job_20240625064422915/          # Timestamped job name
    ├── job.fgmj                    # Job specification (XML)
    ├── validation.json             # Pre-execution validation results
    ├── status.json                 # Real-time execution status
    ├── Inputs/                     # Attached input files
    │   ├── fuel_map.tif
    │   ├── elevation.tif
    │   ├── dataset.prj
    │   ├── dataset.lut
    │   ├── weather_data.txt
    │   └── ignition_polygon.json
    └── Outputs/                    # Generated output files
        ├── fire_perimeters.kml
        ├── fire_perimeters.shp
        ├── max_ros.tif
        └── summary.txt
```

### File Descriptions

| File | Purpose | Created By |
|------|---------|------------|
| `job.fgmj` | Complete job specification | Builder (via API) |
| `validation.json` | Pre-execution validation report | WISE CLI (`--validate`) |
| `status.json` | Real-time execution status | WISE.EXE (during run) |
| `Inputs/*` | Referenced data files | Copied by Builder |
| `Outputs/*` | Simulation results | WISE.EXE (on completion) |

---

## FGMJ File Structure

FGMJ files are XML documents with a hierarchical structure defining all job components.

### Conceptual Structure

```xml
<fgmj version="7.0">
  <project>
    <!-- Project metadata and settings -->
  </project>

  <inputs>
    <!-- Landscape data: grids, projections, fuel types -->
  </inputs>

  <weather>
    <!-- Weather stations and data streams -->
  </weather>

  <ignitions>
    <!-- Fire start locations and timing -->
  </ignitions>

  <scenarios>
    <!-- Simulation scenarios with parameters -->
  </scenarios>

  <outputs>
    <!-- Output file specifications -->
  </outputs>
</fgmj>
```

---

## Key FGMJ Sections

### 1. Project Settings Section

The project section contains metadata and global configuration:

#### Project Metadata Elements

```xml
<project>
  <name>Fire Simulation Job</name>
  <version>7.0</version>
  <comments>72-hour fire spread forecast</comments>

  <timezone>
    <id>25</id>              <!-- Timezone identifier (e.g., 25 = CDT) -->
    <name>America/Winnipeg</name>
    <offset>-06:00</offset>
  </timezone>

  <loadBalancing>
    <type>LOCAL_CORES</type>  <!-- CPU utilization strategy -->
  </loadBalancing>
</project>
```

#### Common Project Parameters

| Parameter | Type | Purpose |
|-----------|------|---------|
| `name` | String | Job identifier for tracking |
| `version` | String | FGMJ format version |
| `timezone` | ID/Name | Temporal reference for all dates/times |
| `loadBalancing` | Enum | CPU core allocation strategy |
| `comments` | String | Job description/metadata |

---

### 2. Inputs Section (Landscape Data)

The inputs section defines all spatial data layers required for fire modeling.

#### Grid Files Subsection

```xml
<inputs>
  <gridFiles>
    <!-- Fuel Type Grid (REQUIRED) -->
    <gridFile type="FUEL_GRID">
      <filename>Inputs/fuel_map.tif</filename>
      <projection>Inputs/dataset.prj</projection>
      <comment>FBP fuel type classification</comment>
    </gridFile>

    <!-- Elevation Grid (OPTIONAL but recommended) -->
    <gridFile type="ELEVATION">
      <filename>Inputs/elevation.tif</filename>
      <projection>Inputs/dataset.prj</projection>
      <comment>Digital elevation model for slope/aspect</comment>
    </gridFile>

    <!-- Additional Optional Grids -->
    <gridFile type="PERCENT_CONIFER">
      <filename>Inputs/percent_conifer.tif</filename>
      <projection>Inputs/dataset.prj</projection>
      <comment>For M-1/M-2 mixed fuel calculations</comment>
    </gridFile>

    <gridFile type="CROWN_BASE_HEIGHT">
      <filename>Inputs/cbh.tif</filename>
      <projection>Inputs/dataset.prj</projection>
      <comment>Crown fire initiation parameter</comment>
    </gridFile>
  </gridFiles>

  <!-- Fuel Lookup Table (REQUIRED) -->
  <lookupTable>
    <filename>Inputs/dataset.lut</filename>
    <comment>Maps grid cell values to FBP fuel types</comment>
  </lookupTable>
</inputs>
```

#### Grid File Types

| Grid Type | Required | Data Type | Purpose |
|-----------|----------|-----------|---------|
| `FUEL_GRID` | Yes | Integer | FBP fuel type codes |
| `ELEVATION` | No | Float32/Int16 | Terrain elevation (meters ASL) |
| `PERCENT_CONIFER` | No | Float | M-1/M-2 fuel parameter (0-100%) |
| `PERCENT_DEAD_FIR` | No | Float | M-3/M-4 fuel parameter (0-100%) |
| `CROWN_BASE_HEIGHT` | No | Float | Crown fire threshold (meters) |

#### Projection File Format

Projection files (`.prj`) use ESRI format:

```
PROJCS["NAD_1983_UTM_Zone_11N",
  GEOGCS["GCS_North_American_1983",
    DATUM["D_North_American_1983",
      SPHEROID["GRS_1980",6378137.0,298.257222101]],
    PRIMEM["Greenwich",0.0],
    UNIT["Degree",0.0174532925199433]],
  PROJECTION["Transverse_Mercator"],
  PARAMETER["Central_Meridian",-117.0],
  PARAMETER["Scale_Factor",0.9996],
  UNIT["Meter",1.0]]
```

**Critical**: All grids must use the same projection.

---

### 3. Weather Section

Weather data provides temporal meteorological forcing for fire behavior calculations.

#### Weather Station Definition

```xml
<weather>
  <weatherStations>
    <station id="WX_STATION_1">
      <name>Main Weather Station</name>
      <location>
        <latitude>49.5123</latitude>
        <longitude>-117.2456</longitude>
      </location>
      <elevation>650.0</elevation>  <!-- meters ASL -->

      <!-- Weather Stream -->
      <weatherStream id="STREAM_1">
        <filename>Inputs/weather_data.txt</filename>
        <startDate>2024-07-15T00:00:00</startDate>
        <endDate>2024-07-17T23:59:59</endDate>

        <!-- FWI Starting Indices -->
        <hffmc>
          <value>85.0</value>
          <hour>13</hour>             <!-- 1:00 PM -->
          <method>VAN_WAGNER</method>  <!-- or LAWSON -->
        </hffmc>

        <startingIndices>
          <ffmc>89.5</ffmc>            <!-- Fine Fuel Moisture Code -->
          <dmc>45.2</dmc>              <!-- Duff Moisture Code -->
          <dc>320.1</dc>               <!-- Drought Code -->
          <precipitation>0.0</precipitation>  <!-- Previous day precip (mm) -->
        </startingIndices>
      </weatherStream>
    </station>
  </weatherStations>
</weather>
```

#### Weather Data File Format

Weather files are plain text with space-delimited columns:

```
Temp  RH    WS    WD    Precip
28.5  25.0  15.0  270   0.0
29.2  23.0  18.0  265   0.0
30.1  21.0  20.0  260   0.0
30.8  19.0  22.0  255   0.0
```

| Column | Units | Description |
|--------|-------|-------------|
| `Temp` | Celsius | Air temperature |
| `RH` | Percent | Relative humidity (0-100) |
| `WS` | km/h | Wind speed |
| `WD` | Degrees | Wind direction (0-360, meteorological "from") |
| `Precip` | mm | Precipitation (hourly accumulation) |

**Note**: Hours are implicit based on `startDate`. First row = start hour, subsequent rows are sequential hours.

#### FWI Calculation Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| `VAN_WAGNER` | Original Van Wagner (1987) algorithm | Standard approach |
| `LAWSON` | Lawson et al. (2008) modifications | Improved hourly FFMC |

---

### 4. Ignitions Section

Ignitions define where and when fires start.

#### Point Ignition

```xml
<ignitions>
  <ignition id="POINT_IGNITION_1" type="POINT">
    <name>Single Point Fire Start</name>
    <location>
      <latitude>49.5123</latitude>
      <longitude>-117.2456</longitude>
    </location>
    <startTime>2024-07-15T14:00:00</startTime>
    <comment>Lightning strike ignition</comment>
  </ignition>
</ignitions>
```

#### Polygon Ignition

```xml
<ignition id="POLY_IGNITION_1" type="POLYGON">
  <name>Area Fire Start</name>
  <geometry>
    <polygon>
      <vertex lat="49.50" lon="-117.20"/>
      <vertex lat="49.51" lon="-117.20"/>
      <vertex lat="49.51" lon="-117.21"/>
      <vertex lat="49.50" lon="-117.21"/>
      <!-- Polygon automatically closes -->
    </polygon>
  </geometry>
  <startTime>2024-07-15T14:00:00</startTime>
  <comment>Prescribed burn unit</comment>
</ignition>
```

#### Polyline Ignition

```xml
<ignition id="LINE_IGNITION_1" type="POLYLINE">
  <name>Linear Fire Start</name>
  <geometry>
    <polyline>
      <vertex lat="49.50" lon="-117.20"/>
      <vertex lat="49.51" lon="-117.21"/>
      <vertex lat="49.52" lon="-117.22"/>
    </polyline>
  </geometry>
  <startTime>2024-07-15T14:00:00</startTime>
  <comment>Road ignition pattern</comment>
</ignition>
```

#### File-Based Ignition

```xml
<ignition id="FILE_IGNITION_1" type="FILE">
  <name>Complex Perimeter</name>
  <filename>Inputs/existing_fire_perimeter.shp</filename>
  <startTime>2024-07-15T14:00:00</startTime>
  <comment>Existing fire perimeter from IR mapping</comment>
</ignition>
```

#### Ignition Types Summary

| Type | Format | Use Case |
|------|--------|----------|
| `POINT` | Single LatLon | Lightning strike, spot fire |
| `POLYGON` | Closed vertex array | Prescribed burn, area ignition |
| `POLYLINE` | Open vertex array | Road/trail ignition, line fire |
| `FILE` | Shapefile path | Complex existing fire perimeter |

---

### 5. Scenarios Section

Scenarios define simulation configurations, linking ignitions, weather, and execution parameters.

#### Basic Scenario Structure

```xml
<scenarios>
  <scenario id="PRIMARY_SCENARIO">
    <name>72-Hour Forecast</name>
    <startTime>2024-07-15T12:00:00</startTime>
    <endTime>2024-07-17T12:00:00</endTime>
    <displayInterval>PT1H</displayInterval>  <!-- ISO 8601 duration: 1 hour -->

    <!-- Link to Ignitions -->
    <ignitionReferences>
      <ignitionRef id="POINT_IGNITION_1"/>
    </ignitionReferences>

    <!-- Link to Weather -->
    <weatherReferences>
      <stationRef id="WX_STATION_1">
        <streamRef id="STREAM_1" primary="true"/>
      </stationRef>
    </weatherReferences>

    <!-- Burning Conditions -->
    <burningConditions>
      <condition date="2024-07-15">
        <startHour>6</startHour>      <!-- 6:00 AM -->
        <endHour>23</endHour>         <!-- 11:00 PM -->
        <minRH>19</minRH>             <!-- Minimum RH threshold (%) -->
        <minTemp>0.0</minTemp>        <!-- Minimum temp (C) -->
        <maxWindSpeed>95.0</maxWindSpeed>  <!-- Max wind (km/h) -->
        <maxRH>0.0</maxRH>            <!-- 0 = no upper limit -->
      </condition>
      <!-- Additional days... -->
    </burningConditions>

    <!-- FGM Options (Fire Growth Model) -->
    <fgmOptions>
      <perimeterResolution>PT2M</perimeterResolution>  <!-- 2 minutes -->
      <spatialThreshold>1.0</spatialThreshold>
      <perimeterThreshold>1.0</perimeterThreshold>
      <minimumSpreadDistance>1.0</minimumSpreadDistance>
      <stopAtGridEnd>false</stopAtGridEnd>
      <breaching>true</breaching>
      <dynamicSpatialThreshold>true</dynamicSpatialThreshold>
      <spotting>true</spotting>
      <purgeNonDisplayable>false</purgeNonDisplayable>
      <distanceResolution>true</distanceResolution>
      <distanceResolutionValue>50.0</distanceResolutionValue>
    </fgmOptions>

    <!-- FBP Options (Fire Behavior Prediction) -->
    <fbpOptions>
      <enabled>true</enabled>
      <interpolation>true</interpolation>
    </fbpOptions>

    <!-- FWI Options (Fire Weather Index) -->
    <fwiOptions>
      <spatialInterpolation>false</spatialInterpolation>
      <temporalInterpolation>true</temporalInterpolation>
    </fwiOptions>

    <!-- FMC Options (Foliar Moisture Content) -->
    <fmcOptions>
      <override>-1</override>          <!-- -1 = no override -->
      <value>0.0</value>
      <landscapeOverride>true</landscapeOverride>
      <enable>false</enable>
    </fmcOptions>

    <!-- Probabilistic Settings -->
    <probabilisticValues>
      <dx>1.0</dx>                     <!-- Spatial resolution X (meters) -->
      <dy>1.0</dy>                     <!-- Spatial resolution Y (meters) -->
      <dt>PT10S</dt>                   <!-- Time step: 10 seconds -->
    </probabilisticValues>
  </scenario>
</scenarios>
```

#### Display Interval Options

Display interval controls output frequency (ISO 8601 duration format):

| Interval | ISO 8601 | Use Case |
|----------|----------|----------|
| 15 minutes | `PT15M` | High-detail animations |
| 1 hour | `PT1H` | Standard hourly outputs |
| 6 hours | `PT6H` | Long-term forecasts |
| Daily | `PT24H` | Extended simulations |

#### Burning Conditions

Burning conditions restrict when fire can spread based on weather thresholds:

```xml
<condition date="2024-07-15">
  <startHour>6</startHour>        <!-- Fire can spread 6 AM - 11 PM -->
  <endHour>23</endHour>
  <minRH>19</minRH>               <!-- Only burn if RH >= 19% -->
  <maxWindSpeed>95.0</maxWindSpeed>  <!-- Only burn if wind <= 95 km/h -->
</condition>
```

**Purpose**: Models diurnal fire behavior (fires typically don't spread aggressively at night due to higher humidity).

---

### 6. Outputs Section

Outputs define what results WISE should generate.

#### Vector Outputs (Fire Perimeters)

```xml
<outputs>
  <vectorOutputs>
    <vectorOutput scenarioRef="PRIMARY_SCENARIO" type="KML">
      <filename>Outputs/fire_perimeters.kml</filename>
      <startTime>2024-07-15T12:00:00</startTime>
      <endTime>2024-07-17T12:00:00</endTime>

      <options>
        <multiplePerimeters>true</multiplePerimeters>  <!-- Time-stepped perimeters -->
        <removeIslands>true</removeIslands>            <!-- Remove unburned holes -->
        <mergeContact>true</mergeContact>              <!-- Merge touching perimeters -->
        <activePerimeterOnly>false</activePerimeterOnly>
      </options>

      <metadata>
        <author>WISE Fire Modeling System</author>
        <jobName>72-Hour Forecast</jobName>
      </metadata>
    </vectorOutput>

    <!-- Shapefile Output -->
    <vectorOutput scenarioRef="PRIMARY_SCENARIO" type="SHAPEFILE">
      <filename>Outputs/fire_perimeters.shp</filename>
      <startTime>2024-07-15T12:00:00</startTime>
      <endTime>2024-07-17T12:00:00</endTime>
      <options>
        <multiplePerimeters>true</multiplePerimeters>
        <removeIslands>true</removeIslands>
      </options>
    </vectorOutput>
  </vectorOutputs>
</outputs>
```

#### Grid Outputs (Spatial Statistics)

```xml
<gridOutputs>
  <gridOutput scenarioRef="PRIMARY_SCENARIO" statistic="MAX_ROS">
    <filename>Outputs/max_rate_of_spread.tif</filename>
    <outputTime>2024-07-17T12:00:00</outputTime>
    <comment>Maximum rate of spread (m/min) over entire simulation</comment>
  </gridOutput>

  <gridOutput scenarioRef="PRIMARY_SCENARIO" statistic="FIRE_ARRIVAL_TIME">
    <filename>Outputs/arrival_time.tif</filename>
    <outputTime>2024-07-17T12:00:00</outputTime>
    <comment>Time fire reached each grid cell</comment>
  </gridOutput>

  <gridOutput scenarioRef="PRIMARY_SCENARIO" statistic="MAX_FI">
    <filename>Outputs/max_fire_intensity.tif</filename>
    <outputTime>2024-07-17T12:00:00</outputTime>
    <comment>Maximum fire intensity (kW/m) over simulation</comment>
  </gridOutput>

  <gridOutput scenarioRef="PRIMARY_SCENARIO" statistic="BURN_GRID">
    <filename>Outputs/burned_area.tif</filename>
    <outputTime>2024-07-17T12:00:00</outputTime>
    <comment>Binary burned/unburned classification</comment>
  </gridOutput>
</gridOutputs>
```

#### Available Grid Statistics (40+ Options)

**Fire Behavior:**
- `MAX_ROS` - Maximum rate of spread (m/min)
- `MAX_FI` - Maximum fire intensity (kW/m)
- `MAX_FL` - Maximum flame length (m)
- `MAX_CFB` - Maximum crown fraction burned
- `HROS` - Head rate of spread
- `FROS` - Flank rate of spread
- `BROS` - Back rate of spread

**Perimeter & Timing:**
- `BURN_GRID` - Binary burned/unburned
- `FIRE_ARRIVAL_TIME` - Time fire reached each cell
- `ACTIVE_PERIMETER` - Active fire front length

**Area Metrics:**
- `TOTAL_BURN_AREA` - Total area burned (m²)
- `TOTAL_PERIMETER` - Fire perimeter length (m)

**Fuel Consumption:**
- `TOTAL_FUEL_CONSUMED` - Total fuel (kg/m²)
- `SURFACE_FUEL_CONSUMED` - Surface fuel
- `CROWN_FUEL_CONSUMED` - Crown fuel

**Weather/FWI:**
- `TEMPERATURE`, `WIND_SPEED`, `WIND_DIRECTION`
- `FFMC`, `DMC`, `DC`, `ISI`, `BUI`, `FWI`

#### Summary Output

```xml
<summaryOutputs>
  <summaryOutput scenarioRef="PRIMARY_SCENARIO">
    <filename>Outputs/fire_summary.txt</filename>

    <sections>
      <outputApplication>true</outputApplication>
      <outputFBP>true</outputFBP>
      <outputFBPPatches>true</outputFBPPatches>
      <outputGeoData>true</outputGeoData>
      <outputIgnitions>true</outputIgnitions>
      <outputInputs>true</outputInputs>
      <outputLandscape>true</outputLandscape>
      <outputScenario>true</outputScenario>
      <outputScenarioComments>true</outputScenarioComments>
      <outputWxPatches>true</outputWxPatches>
      <outputWxStreams>true</outputWxStreams>
      <outputAssetInfo>true</outputAssetInfo>
      <outputWxData>true</outputWxData>
    </sections>
  </summaryOutput>
</summaryOutputs>
```

#### Statistics File Output

```xml
<statsOutputs>
  <statsOutput scenarioRef="PRIMARY_SCENARIO">
    <filename>Outputs/statistics.json</filename>
    <fileType>JSON_ROW</fileType>  <!-- or CSV, JSON_COLUMN -->

    <columns>
      <statistic>TOTAL_BURN_AREA</statistic>
      <statistic>MAX_ROS</statistic>
      <statistic>TOTAL_PERIMETER</statistic>
      <statistic>DATE_TIME</statistic>
    </columns>
  </statsOutput>
</statsOutputs>
```

---

## Example Annotated FGMJ File

Here's a minimal but complete FGMJ example with annotations:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<fgmj version="7.0">

  <!-- ===== PROJECT METADATA ===== -->
  <project>
    <name>Simple Point Ignition</name>
    <version>7.0</version>
    <timezone>
      <id>25</id>  <!-- CDT timezone -->
    </timezone>
  </project>

  <!-- ===== LANDSCAPE INPUTS ===== -->
  <inputs>
    <gridFiles>
      <!-- REQUIRED: Fuel type grid -->
      <gridFile type="FUEL_GRID">
        <filename>Inputs/fuel_map.tif</filename>
        <projection>Inputs/dataset.prj</projection>
      </gridFile>

      <!-- OPTIONAL: Elevation for slope effects -->
      <gridFile type="ELEVATION">
        <filename>Inputs/elevation.tif</filename>
        <projection>Inputs/dataset.prj</projection>
      </gridFile>
    </gridFiles>

    <!-- REQUIRED: Fuel lookup table -->
    <lookupTable>
      <filename>Inputs/dataset.lut</filename>
    </lookupTable>
  </inputs>

  <!-- ===== WEATHER DATA ===== -->
  <weather>
    <weatherStations>
      <station id="MAIN_STATION">
        <location>
          <latitude>49.5123</latitude>
          <longitude>-117.2456</longitude>
        </location>
        <elevation>650.0</elevation>

        <weatherStream id="FORECAST_STREAM">
          <filename>Inputs/weather_data.txt</filename>
          <startDate>2024-07-15T00:00:00</startDate>
          <endDate>2024-07-17T23:59:59</endDate>

          <hffmc>
            <value>85.0</value>
            <hour>13</hour>
            <method>VAN_WAGNER</method>
          </hffmc>

          <startingIndices>
            <ffmc>89.5</ffmc>
            <dmc>45.2</dmc>
            <dc>320.1</dc>
            <precipitation>0.0</precipitation>
          </startingIndices>
        </weatherStream>
      </station>
    </weatherStations>
  </weather>

  <!-- ===== FIRE IGNITION ===== -->
  <ignitions>
    <ignition id="POINT_1" type="POINT">
      <location>
        <latitude>49.5123</latitude>
        <longitude>-117.2456</longitude>
      </location>
      <startTime>2024-07-15T14:00:00</startTime>
    </ignition>
  </ignitions>

  <!-- ===== SIMULATION SCENARIO ===== -->
  <scenarios>
    <scenario id="SCENARIO_1">
      <name>48-Hour Simulation</name>
      <startTime>2024-07-15T12:00:00</startTime>
      <endTime>2024-07-17T12:00:00</endTime>
      <displayInterval>PT1H</displayInterval>

      <!-- Link ignition and weather -->
      <ignitionReferences>
        <ignitionRef id="POINT_1"/>
      </ignitionReferences>

      <weatherReferences>
        <stationRef id="MAIN_STATION">
          <streamRef id="FORECAST_STREAM" primary="true"/>
        </stationRef>
      </weatherReferences>

      <!-- Burning window: 6 AM - 11 PM -->
      <burningConditions>
        <condition date="2024-07-15">
          <startHour>6</startHour>
          <endHour>23</endHour>
          <minRH>19</minRH>
        </condition>
        <condition date="2024-07-16">
          <startHour>6</startHour>
          <endHour>23</endHour>
          <minRH>19</minRH>
        </condition>
      </burningConditions>

      <!-- Fire growth model settings -->
      <fgmOptions>
        <perimeterResolution>PT2M</perimeterResolution>
        <spatialThreshold>1.0</spatialThreshold>
        <breaching>true</breaching>
        <spotting>true</spotting>
      </fgmOptions>

      <fbpOptions>
        <enabled>true</enabled>
        <interpolation>true</interpolation>
      </fbpOptions>
    </scenario>
  </scenarios>

  <!-- ===== OUTPUT SPECIFICATIONS ===== -->
  <outputs>
    <!-- Fire perimeter KML -->
    <vectorOutputs>
      <vectorOutput scenarioRef="SCENARIO_1" type="KML">
        <filename>Outputs/fire_perimeters.kml</filename>
        <startTime>2024-07-15T12:00:00</startTime>
        <endTime>2024-07-17T12:00:00</endTime>
        <options>
          <multiplePerimeters>true</multiplePerimeters>
          <removeIslands>true</removeIslands>
        </options>
      </vectorOutput>
    </vectorOutputs>

    <!-- Summary text file -->
    <summaryOutputs>
      <summaryOutput scenarioRef="SCENARIO_1">
        <filename>Outputs/summary.txt</filename>
        <sections>
          <outputInputs>true</outputInputs>
          <outputScenario>true</outputScenario>
          <outputWxData>true</outputWxData>
        </sections>
      </summaryOutput>
    </summaryOutputs>
  </outputs>

</fgmj>
```

---

## Common FGMJ Patterns

### Pattern 1: Point Ignition with Hourly Perimeters

**Use Case**: Standard fire spread forecast from a point ignition.

```javascript
// Via wise_js_api
const fireModel = new modeller.wise.WISE();

// Landscape
fireModel.setProjectionFile(projAttachment);
fireModel.setElevationFile(elevAttachment);
fireModel.setFuelmapFile(fuelmapAttachment);
fireModel.setLutFile(lutAttachment);

// Weather
let weatherStation = fireModel.addWeatherStation(1483.0,
  new modeller.globals.LatLon(60.2795, -122.1301));
let weatherStream = weatherStation.addWeatherStream(
  './weather.csv', 94.0, 17, modeller.wise.HFFMCMethod.LAWSON,
  89.0, 58.0, 482.0, 0.0,
  DateTime.fromISO("2024-06-24"),
  DateTime.fromISO("2024-06-27")
);

// Ignition
let ignition = fireModel.addPointIgnition(
  new modeller.globals.LatLon(60.2795, -122.1301),
  DateTime.fromISO('2024-06-24T13:00:00')
);

// Scenario
let scenario = fireModel.addScenario(
  DateTime.fromISO('2024-06-24T13:00:00'),
  DateTime.fromISO('2024-06-27T13:00:00')
);
scenario.addWeatherStreamReference(weatherStream);
scenario.addIgnitionReference(ignition);

// Output: Hourly KML perimeters
let vectorKml = fireModel.addOutputVectorFileToScenario(
  modeller.wise.VectorFileType.KML,
  'fire_perimeters.kml',
  DateTime.fromISO('2024-06-24T13:00:00'),
  DateTime.fromISO('2024-06-27T13:00:00'),
  scenario
);
vectorKml.multiplePerimeters = true;

// Generate FGMJ
let wrapper = await fireModel.beginJobPromise();
let jobName = wrapper.name.trim();
// Result: job_YYYYMMDDHHMMSS/ folder with job.fgmj
```

### Pattern 2: Polygon Ignition with Grid Statistics

**Use Case**: Prescribed burn with spatial fire behavior analysis.

```javascript
// Polygon ignition from GeoJSON file
let ignitionContents = fs.readFileSync('ignition_polygon.json');
let ignitionAttachment = fireModel.addAttachment('ignition_polygon.json', ignitionContents);
let polygonIgnition = fireModel.addFileIgnition(
  '' + ignitionAttachment,
  DateTime.fromISO('2024-06-24T13:00:00')
);

scenario.addIgnitionReference(polygonIgnition);

// Grid outputs for spatial analysis
let maxROS = fireModel.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.MAX_ROS,
  'max_ros.tif',
  DateTime.fromISO('2024-06-27T13:00:00'),
  scenario
);

let burnGrid = fireModel.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.BURN_GRID,
  'burned_area.tif',
  DateTime.fromISO('2024-06-27T13:00:00'),
  scenario
);

let arrivalTime = fireModel.addOutputGridFileToScenario(
  modeller.globals.GlobalStatistics.FIRE_ARRIVAL_TIME,
  'arrival_time.tif',
  DateTime.fromISO('2024-06-27T13:00:00'),
  scenario
);
```

### Pattern 3: Multi-Day Simulation with Burning Windows

**Use Case**: Extended forecast with diurnal fire behavior.

```javascript
// 72-hour scenario
let scenario72h = fireModel.addScenario(
  DateTime.fromISO('2024-06-24T13:00:00'),
  DateTime.fromISO('2024-06-27T13:00:00')
);

// Burning conditions for each day (6 AM - 11 PM)
scenario72h.addBurningCondition(
  DateTime.fromISO('2024-06-24'),
  6,      // Start hour
  23,     // End hour
  19,     // Min RH (%)
  0.0,    // Min temp (C)
  95.0,   // Max wind (km/h)
  0.0     // Max RH (0 = no limit)
);

scenario72h.addBurningCondition(
  DateTime.fromISO('2024-06-25'), 6, 23, 19, 0.0, 95.0, 0.0
);

scenario72h.addBurningCondition(
  DateTime.fromISO('2024-06-26'), 6, 23, 19, 0.0, 95.0, 0.0
);

// Fire growth model options
scenario72h.setFgmOptions(
  modeller.globals.Duration.createTime(0, 2, 0, false),  // 2-min perimeter resolution
  1.0,    // Spatial threshold
  1.0,    // Perimeter threshold
  1.0,    // Min spread distance
  false,  // Stop at gridded fuel break
  true,   // Breaching
  true,   // Dynamic spatial threshold
  true,   // Spotting
  false,  // Purge non-displayable timesteps
  true,   // Distance resolution
  50.0    // Distance resolution value
);
```

### Pattern 4: Statistics Collection

**Use Case**: Real-time burn area tracking for operational monitoring.

```javascript
// Add timestep statistics
fireModel.timestepSettings.addStatistic(modeller.globals.GlobalStatistics.TOTAL_BURN_AREA);
fireModel.timestepSettings.addStatistic(modeller.globals.GlobalStatistics.DATE_TIME);
fireModel.timestepSettings.addStatistic(modeller.globals.GlobalStatistics.SCENARIO_NAME);

// Statistics output file
let stats = fireModel.addOutputStatsFileToScenario(scenario, 'stats.json');
stats.fileType = modeller.wise.StatsFileType.JSON_ROW;
stats.addColumn(modeller.globals.GlobalStatistics.TOTAL_BURN_AREA);
stats.addColumn(modeller.globals.GlobalStatistics.MAX_ROS);
stats.addColumn(modeller.globals.GlobalStatistics.TOTAL_PERIMETER);

// MQTT monitoring (real-time statistics)
const manager = new modeller.client.JobManager(jobName);
manager.on('statisticsReceived', (args) => {
  args.statistics.forEach(stat => {
    console.log(`${stat.key}: ${stat.value}`);
  });
});
await manager.start();
```

---

## FGMJ Validation

### Pre-Execution Validation

Before WISE executes an FGMJ, it performs validation:

```bash
# Shell validation command
wise --validate /path/to/job.fgmj
```

This creates `validation.json` in the job folder:

```json
{
  "success": true,
  "valid": true,
  "load_warnings": "",
  "validation_tree": {
    "error_level": "INFORMATION",
    "protobuf_name": "Project",
    "children": []
  }
}
```

### Validation Result Interpretation

| Field | Type | Meaning |
|-------|------|---------|
| `success` | Boolean | Validation process completed without errors |
| `valid` | Boolean | FGMJ is valid and can be executed |
| `load_warnings` | String | Non-fatal warnings during load |
| `validation_tree` | Object | Hierarchical error details |

### Common Validation Errors

**Missing Required Files:**
```json
{
  "success": true,
  "valid": false,
  "validation_tree": {
    "error_level": "ERROR",
    "protobuf_name": "GridFile",
    "error_values": [
      {"name": "filename", "value": "Inputs/fuel_map.tif"}
    ],
    "error_id": "FILE_NOT_FOUND"
  }
}
```

**Ignition in Non-Fuel Cell:**
```json
{
  "success": false,
  "valid": false,
  "validation_tree": {
    "error_level": "ERROR",
    "protobuf_name": "Ignition",
    "error_id": "IGNITION_IN_WATER",
    "error_values": [
      {"name": "fuel_type", "value": "102"}
    ]
  }
}
```

**Weather Data Gap:**
```json
{
  "success": true,
  "valid": false,
  "validation_tree": {
    "error_level": "ERROR",
    "protobuf_name": "WeatherStream",
    "error_id": "INSUFFICIENT_WEATHER_DATA",
    "error_values": [
      {"name": "required_end_date", "value": "2024-07-17T23:59:59"},
      {"name": "actual_end_date", "value": "2024-07-16T12:00:00"}
    ]
  }
}
```

---

## FGMJ Execution

### Execution Command Pattern

```bash
# From WISEEngine.ts and fireModel.js patterns
WISE_EXEC="/usr/bin/wise"
JOB_FGMJ="/usr/src/app/WISE_data/jobs/job_20240625064422915/job.fgmj"

# Execute WISE job
${WISE_EXEC} ${JOB_FGMJ}
```

### Execution Status Monitoring

During execution, WISE updates `status.json`:

```json
{
  "status": "Running",
  "progress": 45.2,
  "currentScenario": "PRIMARY_SCENARIO",
  "startTime": "2024-07-15T14:00:00Z",
  "elapsedSeconds": 152.3
}
```

**Status Values:**
- `"Submitted"` - Job queued but not started
- `"Running"` - Actively simulating
- `"Complete"` - Finished successfully
- `"Failed"` - Execution error

### Success Detection

```javascript
const fs = require('fs');
const statusPath = `${jobPath}/status.json`;

// Poll status.json
const checkStatus = () => {
  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

  if (status.status === 'Complete') {
    console.log('Job completed successfully');
    return true;
  }

  if (status.status === 'Failed') {
    console.error(`Job failed: ${status.errorMessage}`);
    return false;
  }

  console.log(`Progress: ${status.progress}%`);
  return null; // Still running
};
```

---

## FGMJ Best Practices

### 1. File Attachment Pattern

Always use Builder's attachment mechanism rather than absolute paths:

```javascript
// CORRECT: Attachment pattern
let fuelContents = fs.readFileSync('./fuel_map.tif');
let fuelAttachment = fireModel.addAttachment('fuel_map.tif', fuelContents);
fireModel.setFuelmapFile('' + fuelAttachment);

// WRONG: Absolute paths (will fail if paths don't exist in execution environment)
fireModel.setFuelmapFile('/home/user/data/fuel_map.tif');
```

**Why**: Builder copies attached files into the `Inputs/` folder, making jobs portable.

### 2. Coordinate System Consistency

All spatial data must use the same projection:

```javascript
// All grids reference the same projection file
fireModel.setProjectionFile(projAttachment);
// Fuel grid uses this projection
fireModel.setFuelmapFile(fuelmapAttachment);
// Elevation grid uses the same projection
fireModel.setElevationFile(elevAttachment);
```

### 3. Weather Coverage Verification

Weather data must cover the entire simulation period:

```javascript
const scenarioStart = DateTime.fromISO('2024-06-24T13:00:00');
const scenarioEnd = DateTime.fromISO('2024-06-27T13:00:00');

// Weather stream MUST span the full scenario duration
const weatherStart = DateTime.fromISO('2024-06-24T00:00:00');
const weatherEnd = DateTime.fromISO('2024-06-27T23:59:59');

// Verify coverage
if (weatherStart > scenarioStart || weatherEnd < scenarioEnd) {
  throw new Error('Insufficient weather data coverage');
}
```

### 4. Timestep Statistics Selection

Only request needed statistics for performance:

```javascript
// CORRECT: Request only needed statistics
fireModel.timestepSettings.addStatistic(GlobalStatistics.TOTAL_BURN_AREA);
fireModel.timestepSettings.addStatistic(GlobalStatistics.DATE_TIME);

// INEFFICIENT: Requesting all 40+ statistics slows execution
```

### 5. Display Interval Optimization

Balance output detail with file size:

```javascript
// High detail (large files): 15-minute intervals
scenario.displayInterval = Duration.fromISO("PT15M");

// Standard (recommended): 1-hour intervals
scenario.displayInterval = Duration.fromISO("PT1H");

// Extended forecasts: 6-hour intervals
scenario.displayInterval = Duration.fromISO("PT6H");
```

---

## Integration with Project Nomad

### Recommended Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ Project Nomad → WISE Integration                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User configures fire model in Nomad GUI                     │
│     └─> Collects: ignition, weather source, duration, outputs   │
│                                                                  │
│  2. Nomad backend calls WISE Builder API                        │
│     └─> Constructs wise_js_api job via REST endpoint            │
│                                                                  │
│  3. Builder generates FGMJ and job folder                       │
│     └─> beginJobPromise() creates timestamped folder            │
│                                                                  │
│  4. Nomad executes WISE via shell                               │
│     └─> wise.exe {jobPath}/job.fgmj                             │
│                                                                  │
│  5. Nomad monitors execution                                     │
│     └─> Poll status.json or subscribe to MQTT                   │
│                                                                  │
│  6. Nomad collects and displays results                         │
│     └─> Parse KML/SHP/TIF from Outputs/ folder                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Integration Points

**Configuration Loading (Nomad → WISE):**
```javascript
// Nomad backend receives user input
const nomadRequest = {
  ignition: { type: 'point', lat: 49.5, lon: -117.2 },
  duration: 72, // hours
  weatherSource: 'SpotWX',
  outputs: ['perimeters', 'intensity']
};

// Transform to WISE API calls
const fireModel = new modeller.wise.WISE();
fireModel.setName(`Nomad_${userId}_${timestamp}`);

// Add landscape from Nomad's dataset configuration
fireModel.setFuelmapFile(nomadConfig.fuelGridPath);
fireModel.setElevationFile(nomadConfig.elevationPath);

// Add ignition from user drawing
const ignition = fireModel.addPointIgnition(
  new modeller.globals.LatLon(nomadRequest.ignition.lat, nomadRequest.ignition.lon),
  DateTime.now()
);

// Generate FGMJ
const wrapper = await fireModel.beginJobPromise();
const jobName = wrapper.name.trim();
```

**Status Tracking (WISE → Nomad):**
```javascript
// Nomad polls WISE job status
const getJobStatus = (jobName) => {
  const statusPath = `${process.env.WISE_JOBS_FOLDER}/${jobName}/status.json`;
  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

  return {
    jobId: jobName,
    status: status.status,
    progress: status.progress,
    message: status.errorMessage || `Simulating... ${status.progress}%`
  };
};

// Nomad notification on completion
if (status.status === 'Complete') {
  notifyUser(userId, `Fire model ${jobName} complete`);
  displayResults(jobName);
}
```

**Result Visualization (WISE → Nomad Map):**
```javascript
// Nomad loads WISE KML outputs to MapBox GL
const loadWiseResults = async (jobName) => {
  const kmlPath = `${process.env.WISE_JOBS_FOLDER}/${jobName}/Outputs/fire_perimeters.kml`;
  const kml = fs.readFileSync(kmlPath, 'utf8');

  // Convert KML to GeoJSON for MapBox GL
  const geojson = kmlToGeoJSON(kml);

  // Add to Nomad map
  map.addSource('fire-perimeters', {
    type: 'geojson',
    data: geojson
  });

  map.addLayer({
    id: 'fire-perimeters-fill',
    type: 'fill',
    source: 'fire-perimeters',
    paint: {
      'fill-color': '#ff0000',
      'fill-opacity': 0.3
    }
  });
};
```

---

## References

### Source Materials

- **WiseGuy Repository**: `/Users/franconogarin/localcode/wiseguy/`
  - `franco-wise-code/fireModel.js` - Production FGMJ generation patterns
  - `franco-wise-code/WISEsimpleModel.js` - Simplified example
  - `src/engines/WISEEngine.ts` - Fire Engine Abstraction Layer
  - `documentation/NomadResearch/wise_io.md` - I/O specifications

### Related Documentation

- **WISE I/O Reference**: `wise_io.md` - Input/output format specifications
- **WISE Technology Summary**: `wise_tech_summary.md` - System architecture overview
- **WISE Knowledge Base**: `/wiseguy/WISEKB/` - API reference materials

### Key Terminology

| Term | Definition |
|------|------------|
| **FGMJ** | Fire Growth Model Job (XML job file) |
| **Builder** | Node.js service that orchestrates job creation |
| **wise_js_api** | TypeScript/JavaScript API layer for WISE |
| **FBP** | Fire Behavior Prediction system (Canadian) |
| **FWI** | Fire Weather Index system |
| **FFMC** | Fine Fuel Moisture Code |
| **DMC** | Duff Moisture Code |
| **DC** | Drought Code |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-25 | Initial FGMJ reference documentation for Project Nomad |

---

**Document Maintainer**: WISE SME (Sage) for Project Nomad
**Contact**: Documentation/Research/SME_Data/WISE/reference/

**License**: Internal documentation for Project Nomad development
