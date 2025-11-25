# FireSTARR Data Flow

## Overview

This document traces data flow through FireSTARR from input files through simulation to output generation.

## High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INPUT STAGE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Fuel Grid    │  │  DEM Grid    │  │ Weather CSV  │  │ Ignition   │  │
│  │ (GeoTIFF)    │  │  (GeoTIFF)   │  │ (hourly FWI) │  │ (lat/lon)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                 │                 │                 │         │
│         ▼                 ▼                 ▼                 ▼         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Environment Loading                            │  │
│  │   • Grid alignment validation                                     │  │
│  │   • Fuel lookup table application                                 │  │
│  │   • Slope/aspect derivation from DEM                              │  │
│  │   • UTM zone determination from ignition point                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        INITIALIZATION STAGE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    FWI Calculation                                │  │
│  │   Weather CSV → Ffmc, Dmc, Dc, Isi, Bui, Fwi per hour            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    FireWeather Streams                            │  │
│  │   • Time-indexed FwiWeather objects                               │  │
│  │   • Per-fuel survival probabilities                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Model Initialization                           │  │
│  │   • Thread pool setup                                             │  │
│  │   • Iteration/Scenario allocation                                 │  │
│  │   • Random number generator seeding                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SIMULATION STAGE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  FOR EACH ITERATION (until convergence)                        │    │
│  │                                                                 │    │
│  │   ┌──────────────────────────────────────────────────────────┐ │    │
│  │   │  FOR EACH SCENARIO (parallel threads)                    │ │    │
│  │   │                                                          │ │    │
│  │   │   ┌────────────────────────────────────────────────────┐ │ │    │
│  │   │   │  FOR EACH TIMESTEP                                 │ │ │    │
│  │   │   │                                                    │ │ │    │
│  │   │   │   1. Get FwiWeather for current time               │ │ │    │
│  │   │   │   2. For each active perimeter cell:               │ │ │    │
│  │   │   │      a. Calculate SpreadInfo                       │ │ │    │
│  │   │   │      b. Determine spread probability               │ │ │    │
│  │   │   │      c. Apply random threshold (Monte Carlo)       │ │ │    │
│  │   │   │      d. If spread: update perimeter, intensity     │ │ │    │
│  │   │   │   3. Check for extinction (survival probability)   │ │ │    │
│  │   │   │   4. Record burned cells and intensity             │ │ │    │
│  │   │   │                                                    │ │ │    │
│  │   │   └────────────────────────────────────────────────────┘ │ │    │
│  │   │                                                          │ │    │
│  │   │   Output: IntensityMap for this scenario                 │ │    │
│  │   └──────────────────────────────────────────────────────────┘ │    │
│  │                                                                 │    │
│  │   Aggregate: IntensityMap → ProbabilityMap                      │    │
│  │   Check convergence: variance < CONFIDENCE_LEVEL                │    │
│  │                                                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          OUTPUT STAGE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ProbabilityMap Processing                      │  │
│  │                                                                    │  │
│  │   For each output day (1, 2, 3, 7, 14 days):                      │  │
│  │     • Calculate burn probability per cell                         │  │
│  │     • Classify by intensity (low, moderate, high)                 │  │
│  │     • Generate GeoTIFF with UTM projection                        │  │
│  │                                                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐    │
│  │ probability_   │  │ fire_name_     │  │ firestarr.log          │    │
│  │ {N}day.tif     │  │ {N}day.tif     │  │                        │    │
│  │ (Float32)      │  │ (perimeter)    │  │ (execution details)    │    │
│  └────────────────┘  └────────────────┘  └────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Detailed Data Transformations

### 1. Input Loading

#### Fuel Grid Processing
```
fuel_{zone}.tif (Int16 raster)
        │
        ▼
   fuel.lut lookup
        │
        ▼
   FuelType* per cell (FBP fuel object)
```

#### DEM Processing
```
dem_{zone}.tif (Int16 meters)
        │
        ▼
   Horn's algorithm
        │
        ├──► Slope (0-500%)
        └──► Aspect (0-359°)
```

#### Weather Processing
```
weather.csv (hourly records)
        │
        ▼
   FWI calculations
        │
        ├──► Ffmc (0-101)
        ├──► Dmc (0+)
        ├──► Dc (0+)
        ├──► Isi (0+)
        ├──► Bui (0+)
        └──► Fwi (0+)
        │
        ▼
   FwiWeather stream (hourly indexed)
```

### 2. Spread Calculation

For each active cell at each timestep:

```
Cell data + FwiWeather
        │
        ▼
┌───────────────────────────────────────┐
│         SpreadInfo Calculation         │
│                                        │
│  fuel_type.calculateRos()             │
│    • ISI effect on spread potential    │
│    • BUI effect on fuel availability   │
│    • Slope factor adjustment           │
│                                        │
│  Results:                              │
│    • head_ros (m/min)                  │
│    • flank_ros (m/min)                 │
│    • back_ros (m/min)                  │
│    • length_to_breadth ratio           │
│    • crown_fraction_burned             │
│    • fire_intensity (kW/m)             │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│      SpreadAlgorithm.calculate()       │
│                                        │
│  Ellipse geometry calculation:         │
│    • Head spread distance              │
│    • Flank spread distance             │
│    • Back spread distance              │
│    • Directional offsets (OffsetSet)   │
│    • Slope azimuth correction          │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│         Monte Carlo Decision           │
│                                        │
│  random_threshold = mt19937()          │
│                                        │
│  if (spread_probability > threshold):  │
│      SPREAD_SCHEDULED                  │
│  else:                                 │
│      SPREAD_IMPOSSIBLE                 │
└───────────────────────────────────────┘
```

### 3. Output Aggregation

```
IntensityMap (per scenario)
        │
        ▼
┌───────────────────────────────────────┐
│      ProbabilityMap.addProbability()   │
│                                        │
│  For each cell:                        │
│    count[cell] += (burned ? 1 : 0)     │
│    intensity_class[cell] = classify()  │
│                                        │
│  Thread-safe with mutex                │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│          saveAll()                     │
│                                        │
│  probability = count / total_scenarios │
│                                        │
│  Write GeoTIFF:                        │
│    • LZW compression                   │
│    • UTM NAD83 projection              │
│    • Float32 values [0.0-1.0]          │
└───────────────────────────────────────┘
```

## Key Data Structures

### FwiWeather
```cpp
struct FwiWeather {
    Weather weather;  // temp, rh, ws, wd, precip
    Ffmc ffmc;
    Dmc dmc;
    Dc dc;
    Isi isi;
    Bui bui;
    Fwi fwi;

    // Methods
    mcFfmcPct();  // Moisture content from FFMC
    mcDmcPct();   // Moisture content from DMC
    ffmcEffect(); // FFMC effect on spread
};
```

### SpreadInfo
```cpp
class SpreadInfo {
    FwiWeather* weather_;
    Cell* cell_;

    MathSize head_ros_;
    MathSize max_intensity_;
    MathSize cfb_;  // Crown fraction burned
    MathSize sfc_;  // Surface fuel consumption
    MathSize tfc_;  // Total fuel consumption

    OffsetSet offsets_;  // Directional spread vectors
};
```

### ProbabilityMap Grids
```cpp
class ProbabilityMap {
    GridMap<size_t> all_;   // Total burn occurrences
    GridMap<size_t> low_;   // Low intensity occurrences
    GridMap<size_t> med_;   // Moderate intensity
    GridMap<size_t> high_;  // High intensity

    vector<MathSize> sizes_;  // Perimeter sizes
};
```

## Data Validation Points

### Input Validation
- Fuel grid and DEM must have matching projection and extent
- Weather CSV must cover full simulation duration
- Ignition point must be within fuel grid bounds
- Fuel codes must exist in lookup table

### Runtime Validation
- ROS values checked for physical bounds
- Intensity classification thresholds
- Perimeter size tracking for convergence

### Output Validation
- GeoTIFF written with embedded CRS
- Probability values normalized to [0.0, 1.0]
- NoData handling for non-simulated areas

## File Naming Conventions

| Input | Pattern | Example |
|-------|---------|---------|
| Fuel grid | `fuel_{zone}.tif` | `fuel_11.tif` |
| DEM | `dem_{zone}.tif` | `dem_11.tif` |
| Weather | `{fire}_wx.csv` | `fire001_wx.csv` |

| Output | Pattern | Example |
|--------|---------|---------|
| Probability | `probability_{N}day.tif` | `probability_3day.tif` |
| Perimeter | `{fire}_{N}day.tif` | `fire001_3day.tif` |
| Interim | `interim_probability_{N}day.tif` | `interim_probability_1day.tif` |
| Log | `firestarr.log` | `firestarr.log` |
