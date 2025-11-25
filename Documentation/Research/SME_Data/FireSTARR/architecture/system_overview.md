# FireSTARR System Overview

## Executive Summary

FireSTARR is a high-performance probabilistic fire growth model implemented in C++23. The system generates burn probability maps by executing multiple Monte Carlo simulations under varying weather and fire behavior scenarios. Each simulation propagates fire across a gridded landscape using the Canadian Fire Behaviour Prediction (FBP) System equations, with stochastic elements determining spread success at each timestep.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FireSTARR System                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │   CLI Layer  │───▶│    Model     │───▶│   Probability Output     │  │
│  │  (Main.cpp)  │    │ Orchestrator │    │   (ProbabilityMap)       │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘  │
│         │                   │                                           │
│         │                   ▼                                           │
│         │           ┌──────────────┐                                    │
│         │           │  Iterations  │ ← Thread Pool                      │
│         │           └──────────────┘                                    │
│         │                   │                                           │
│         │                   ▼                                           │
│         │           ┌──────────────┐                                    │
│         │           │  Scenarios   │ ← Individual Simulations           │
│         │           └──────────────┘                                    │
│         │                   │                                           │
│         ▼                   ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Fire Science Core                              │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐  │  │
│  │  │    FWI    │  │    FBP    │  │   Spread  │  │   Fuel Types  │  │  │
│  │  │ Indices   │  │ Equations │  │ Algorithm │  │   (16+ types) │  │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Spatial Data Layer                             │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐  │  │
│  │  │   Grid    │  │    DEM    │  │   Fuel    │  │   Perimeter   │  │  │
│  │  │  System   │  │  (slope)  │  │   Raster  │  │    Tracking   │  │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Execution Modes

FireSTARR operates in three distinct modes:

### 1. Simulation Mode (Default)

Standard fire growth simulation producing burn probability outputs.

```bash
firestarr <output_dir> <yyyy-mm-dd> <lat> <lon> <HH:MM> [options]
```

**Process:**
1. Load configuration and spatial data (fuel grid, DEM)
2. Initialize weather streams from input CSV
3. Execute Monte Carlo iterations until convergence
4. Aggregate results into probability grids
5. Write output GeoTIFFs

### 2. Surface Mode

Generates probability surfaces without full simulation detail.

```bash
firestarr surface <output_dir> <yyyy-mm-dd> <lat> <lon> <HH:MM> [options]
```

### 3. Test Mode

Validates installation with synthetic fuel grids (no real data required).

```bash
firestarr test <output_dir> [options]
```

**Use Case:** Verify binary execution without pre-staged fuel/DEM data.

## Simulation Hierarchy

FireSTARR uses a three-level hierarchy for Monte Carlo execution:

```
Model
 └── Iteration (complete set using all weather streams)
      └── Scenario (single simulation with one weather stream)
           └── SpreadInfo (spread calculation at specific time/location)
```

### Model
- Top-level orchestrator
- Manages thread pool via Semaphore
- Controls simulation termination based on convergence

### Iteration
- Contains multiple Scenarios
- Each uses different weather realization or random thresholds
- Tracks final fire sizes for convergence analysis

### Scenario
- Single deterministic fire spread simulation
- Uses one weather stream
- Applies stochastic spread thresholds at each timestep
- Tracks perimeter evolution and intensity

### SpreadInfo
- Per-cell spread calculation
- Encapsulates FBP equations for rate of spread
- Calculates fire intensity and crown fire fraction

## Threading Model

FireSTARR employs a thread pool for parallel scenario execution:

- **Semaphore**: Limits concurrent threads based on system resources
- **CriticalSection**: RAII wrapper for mutex-protected operations
- **Thread-Safe Aggregation**: ProbabilityMap uses mutex for result merging

Typical execution utilizes all available CPU cores for scenario processing.

## Convergence Logic

Simulations continue until statistical stability is achieved:

1. After each batch of iterations, calculate burn probability variance
2. Compare to `CONFIDENCE_LEVEL` threshold (default: 10%)
3. Stop when probability estimates stabilize within threshold
4. Maximum limit: `MAXIMUM_SIMULATIONS` (default: 10,000)

This approach balances accuracy against computational cost.

## Data Dependencies

### Required Inputs

| Input | Format | Purpose |
|-------|--------|---------|
| Fuel Grid | GeoTIFF | FBP fuel type classification |
| Elevation Grid | GeoTIFF | Slope and aspect derivation |
| Weather Data | CSV | Hourly FWI-enhanced weather |
| Fuel Lookup | .lut | Grid value to FBP type mapping |

### Configuration

| File | Purpose |
|------|---------|
| `settings.ini` | Simulation parameters, paths, thresholds |
| `fuel.lut` | Prometheus-format fuel lookup table |

### Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Burn Probability | GeoTIFF | Float32 [0.0-1.0] probability per cell |
| Fire Perimeter | GeoTIFF | Binary burned/unburned at time steps |
| Log File | Text | Execution details and convergence info |

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | C++23 |
| Build System | CMake |
| Spatial Libraries | GDAL, GeoTIFF, PROJ |
| Threading | pthreads, std::thread |
| Container | Docker (GHCR) |
| License | AGPL-3.0-or-later |

## Performance Characteristics

Typical runtimes (100m grid resolution):

| Fire Size | Duration | Runtime |
|-----------|----------|---------|
| < 100 ha | 3 days | 2-5 min |
| 100-1000 ha | 7 days | 5-15 min |
| 1000-5000 ha | 14 days | 15-45 min |
| > 5000 ha | 14 days | 45-120 min |

Factors affecting performance:
- Grid resolution (finer = longer)
- Monte Carlo iteration count
- Fire complexity (crowning, multiple fronts)
- Weather variability

## References

1. Forestry Canada (1992). Development and Structure of the Canadian Forest Fire Behaviour Prediction System (ST-X-3)
2. Wotton et al. (2009). Updates and Revisions to the 1992 CFBPS (GLC-X-10)
3. FireGUARD Weather Forecast Model: doi.org/10.3390/fire3020016
4. FireGUARD Impact Model: doi.org/10.1071/WF18189
