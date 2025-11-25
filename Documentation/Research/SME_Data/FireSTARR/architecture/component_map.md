# FireSTARR Component Map

## Source Code Organization

The FireSTARR codebase consists of 90 files (52 headers, 38 implementations) totaling approximately 20,900 lines of C++23 code.

```
firestarr-cpp-cpp23/
├── src/cpp/              # Main source code (90 files)
├── scripts/              # Build and utility scripts
├── test/                 # Test suite and test data
├── CMakeLists.txt        # CMake build configuration
├── settings.ini          # Runtime configuration
├── fuel.lut              # Fuel lookup table
└── README.md             # Project documentation
```

## Component Categories

### Entry Point

| File | Lines | Responsibility |
|------|-------|----------------|
| **Main.cpp** | 612 | CLI parsing, mode selection, argument registration |

**Key Functions:**
- `main()` - Application entry point
- `register_argument()` / `register_setter()` / `register_flag()` - CLI registration
- Three execution modes: `SIMULATION`, `TEST`, `SURFACE`

### Simulation Orchestration

| File | Responsibility |
|------|----------------|
| **Model.h/.cpp** | Top-level orchestrator, thread pool management |
| **Iteration.h/.cpp** | Monte Carlo iteration container |
| **Scenario.h/.cpp** | Individual fire spread simulation |

**Hierarchy:**
```
Model (thread management, convergence)
 └── Iteration (weather realization set)
      └── Scenario (single deterministic spread)
```

### Fire Spread Engine

| File | Lines | Responsibility |
|------|-------|----------------|
| **FireSpread.h/.cpp** | 326 | Core ROS/intensity calculations |
| **SpreadAlgorithm.h/.cpp** | 163 | Ellipse geometry, slope correction |

**Key Classes:**
- `SpreadInfo` - Central spread calculation container
- `OriginalSpreadAlgorithm` - Classic elliptical spread
- `WidestEllipseAlgorithm` - Alternative ellipse method

**Key Functions:**
- `calculateRosFromThreshold()` - Probability to rate of spread
- `slopeFactor()` - Terrain influence calculation
- `horizontal_adjustment()` - Slope azimuth correction

### Fire Behaviour Prediction (FBP)

| File | Responsibility |
|------|----------------|
| **FBP45.h/.cpp** | ST-X-3 equations, fuel consumption |
| **StandardFuel.h** | Template-based fuel implementation |
| **FuelType.h/.cpp** | Abstract fuel interface |
| **FuelLookup.h/.cpp** | Fuel lookup table management |
| **Duff.h/.cpp** | Duff/organic layer modeling |

**Fuel Type Implementations:**
- `FuelC1` through `FuelC7` - Conifer fuels
- `FuelD1`, `FuelD2` - Deciduous fuels
- `FuelM1` through `FuelM4` - Mixedwood fuels
- `FuelS1` through `FuelS3` - Slash fuels
- `FuelO1a`, `FuelO1b` - Grass fuels

**Key Calculations:**
- Surface fuel consumption (SFC)
- Crown fraction burned (CFB)
- Rate of spread (ROS)
- Crown fuel load and consumption
- Grass curing percentage

### Fire Weather Index (FWI)

| File | Lines | Responsibility |
|------|-------|----------------|
| **FWI.h/.cpp** | 335+ | Complete FWI System implementation |
| **Weather.h/.cpp** | - | Weather data structures |
| **FireWeather.h/.cpp** | 100+ | Weather stream management |

**FWI Components:**
- `Ffmc` - Fine Fuel Moisture Code
- `Dmc` - Duff Moisture Code
- `Dc` - Drought Code
- `Isi` - Initial Spread Index
- `Bui` - Build-up Index
- `Fwi` - Fire Weather Index
- `Dsr` - Danger Severity Rating

**Key Features:**
- Latitude-dependent day length adjustments
- Northern/Equatorial/Southern hemisphere support
- Hourly FFMC diurnal calculation

### Spatial Data Management

| File | Responsibility |
|------|----------------|
| **Grid.h/.cpp** | 2D spatial grid representation |
| **GridMap.h** | Grid mapping utilities |
| **Cell.h** | Individual cell (fuel, elevation, slope, aspect) |
| **ConstantGrid.h** | Constant value grids |
| **Point.h** | Geographic coordinates (lat/lon) |
| **Location.h/.cpp** | Location with coordinates |
| **InnerPos.h** | Sub-cell position (sub-pixel) |
| **Index.h** | Grid indexing |
| **UTM.h/.cpp** | UTM coordinate conversions |
| **project.h** | PROJ library integration |

### Output Generation

| File | Lines | Responsibility |
|------|-------|----------------|
| **ProbabilityMap.h/.cpp** | 259 | Burn probability aggregation |
| **IntensityMap.h/.cpp** | - | Fire intensity grids |
| **Perimeter.h/.cpp** | - | Fire perimeter tracking |
| **BurnedData.h/.cpp** | - | Burned area history |

**Output Types:**
- Total burn probability
- Low/Moderate/High intensity probability
- Fire perimeter evolution
- Statistical summaries

### Configuration & Input

| File | Responsibility |
|------|----------------|
| **Settings.h/.cpp** | Configuration loading (settings.ini) |
| **Input.h/.cpp** | CSV weather data parsing |
| **EnvironmentInfo.h/.cpp** | Environmental metadata |
| **Environment.h/.cpp** | Full landscape representation |

### Utilities

| File | Responsibility |
|------|----------------|
| **Util.h/.cpp** | General utilities |
| **TimeUtil.h/.cpp** | Time calculations, sunrise/sunset |
| **Trim.h/.cpp** | String trimming |
| **SafeVector.h/.cpp** | Thread-safe vector |
| **MergeIterator.h/.cpp** | Iterator for data merging |
| **Log.h/.cpp** | Logging system |
| **stdafx.h** | Precompiled header, type definitions |

### Testing & Debug

| File | Responsibility |
|------|----------------|
| **Test.h/.cpp** | Test framework |
| **debug_settings.h/.cpp** | Debug configuration |
| **unstable.h/.cpp** | Experimental features |

## Type System

FireSTARR defines strict types for domain concepts in `stdafx.h`:

| Type | Purpose | Range |
|------|---------|-------|
| `MathSize` | Core floating-point | float/double |
| `PerimSize` | Perimeter values | [0,1] |
| `FuelSize` | Fuel codes | [0-999] |
| `DirectionSize` | Wind direction | [0-359] degrees |
| `AspectSize` | Slope aspect | [0-359] degrees |
| `SlopeSize` | Slope gradient | [0-500] percent |
| `IntensitySize` | Fire intensity | kW/m |
| `ThresholdSize` | Probability | [0-1] |
| `Day` | Calendar day | [0-366] |

## Design Patterns

### Observer Pattern
`Scenario` uses `IObserver` for event notification during simulation.

### Template Specialization
Fuel types implemented via compile-time templates with pre-computed lookup tables.

### RAII Resource Management
`CriticalSection` wrapper for mutex operations.

### Thread Pool
`Semaphore` controls concurrent scenario execution.

## Dependencies

### External Libraries

| Library | Purpose |
|---------|---------|
| GeoTIFF | Raster I/O |
| PROJ | Coordinate transformations |
| TIFF | Image handling |
| pthreads | Threading |

### Build Requirements

- CMake 3.13+
- C++23 compiler (GCC/Clang)
- GDAL development libraries

## File Cross-References

### Core Calculation Chain
```
Main.cpp
 └── Model.h
      └── Iteration.h
           └── Scenario.h
                └── FireSpread.h
                     ├── SpreadAlgorithm.h
                     ├── FBP45.h
                     └── FWI.h
```

### Spatial Data Chain
```
Environment.h
 └── Grid.h
      ├── Cell.h
      ├── FuelLookup.h
      └── GridMap.h
           └── ProbabilityMap.h
```

### Weather Chain
```
Input.h (CSV parsing)
 └── Weather.h
      └── FWI.h
           └── FireWeather.h
                └── Scenario.h
```
