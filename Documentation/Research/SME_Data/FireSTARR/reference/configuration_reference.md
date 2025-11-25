# Configuration Reference

## Settings File

FireSTARR reads configuration from `settings.ini` located in the same directory as the executable.

### File Format

```ini
# Comment lines start with #
KEY = value
ANOTHER_KEY = 123  # Inline comment
```

- **Format**: `KEY = value` pairs
- **Comments**: `#` character (line or inline)
- **Lists**: `[1,2,3,7,14]` format (no spaces)
- **Paths**: Relative to binary directory

## Required Parameters

### Data Sources

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `RASTER_ROOT` | Path | `../data/grid/100m` | Root directory for raster data |
| `FUEL_LOOKUP_TABLE` | Path | `./fuel.lut` | Prometheus-format fuel lookup |

### Spread Thresholds

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `MINIMUM_ROS` | Double | 0.05 | Min ROS for active spread (m/min) |
| `MAX_SPREAD_DISTANCE` | Double | 0.4 | Max spread per step (fraction of cell) |

### Moisture Thresholds

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `MINIMUM_FFMC` | Double | 65.0 | Min FFMC for daytime spread |
| `MINIMUM_FFMC_AT_NIGHT` | Double | 85.0 | Min FFMC for nighttime spread |

### Daylight Offsets

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `OFFSET_SUNRISE` | Double | 0.0 | Hours after sunrise for day burning |
| `OFFSET_SUNSET` | Double | 0.0 | Hours before sunset to stop |

### Convergence Weights

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `THRESHOLD_SCENARIO_WEIGHT` | Double | 1.0 | Scenario-level weight |
| `THRESHOLD_DAILY_WEIGHT` | Double | 3.0 | Daily-level weight |
| `THRESHOLD_HOURLY_WEIGHT` | Double | 2.0 | Hourly-level weight |
| `CONFIDENCE_LEVEL` | Double | 0.1 | Convergence threshold (0.1 = 10%) |

### Simulation Limits

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `MAXIMUM_TIME` | Integer | 0 | Max runtime seconds (0 = unlimited) |
| `MAXIMUM_SIMULATIONS` | Integer | 0 | Max simulation count (0 = unlimited) |
| `INTERIM_OUTPUT_INTERVAL` | Integer | 240 | Checkpoint interval (seconds) |

### Fuel Defaults

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `DEFAULT_PERCENT_CONIFER` | Integer | 50 | M1/M2 conifer % when unspecified |
| `DEFAULT_PERCENT_DEAD_FIR` | Integer | 30 | M3/M4 dead fir % when unspecified |

### Intensity Classification

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `INTENSITY_MAX_LOW` | Integer | 2000 | Max intensity for "low" (kW/m) |
| `INTENSITY_MAX_MODERATE` | Integer | 4000 | Max intensity for "moderate" (kW/m) |

### Output Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `OUTPUT_DATE_OFFSETS` | List | [1,2,3,7,14] | Days to output probability maps |

## Example settings.ini

```ini
# FireSTARR Configuration File
# ===========================================

# Data Sources
RASTER_ROOT = ../data/generated/grid/100m
FUEL_LOOKUP_TABLE = ./fuel.lut

# Spread Thresholds
MINIMUM_ROS = 0.0
MAX_SPREAD_DISTANCE = 0.4

# Moisture Requirements
MINIMUM_FFMC = 65.0
MINIMUM_FFMC_AT_NIGHT = 85.0

# Daylight Offsets
OFFSET_SUNRISE = 0.0
OFFSET_SUNSET = 0.0

# Convergence Control
THRESHOLD_SCENARIO_WEIGHT = 1.0
THRESHOLD_DAILY_WEIGHT = 3.0
THRESHOLD_HOURLY_WEIGHT = 2.0
CONFIDENCE_LEVEL = 0.1

# Simulation Limits
MAXIMUM_TIME = 0          # 0 = unlimited
MAXIMUM_SIMULATIONS = 0   # 0 = unlimited
INTERIM_OUTPUT_INTERVAL = 240

# Fuel Defaults
DEFAULT_PERCENT_CONIFER = 50
DEFAULT_PERCENT_DEAD_FIR = 30

# Intensity Thresholds (kW/m)
INTENSITY_MAX_LOW = 2000
INTENSITY_MAX_MODERATE = 4000

# Output Days
OUTPUT_DATE_OFFSETS = [1,2,3,7,14]
```

## Fuel Lookup Table Format

The `fuel.lut` file uses Prometheus format:

```
# Fuel Lookup Table
# Code Name FBPCode [Optional parameters]
1 "Spruce-Lichen Woodland" C-1
2 "Boreal Spruce" C-2
3 "Mature Jack Pine" C-3
4 "Immature Jack Pine" C-4
5 "Red White Pine" C-5
6 "Conifer Plantation" C-6
7 "Ponderosa Pine" C-7
8 "Leafless Aspen" D-1
9 "Green Aspen" D-2
10 "Boreal Mixedwood Leafless" M-1 50
11 "Boreal Mixedwood Green" M-2 50
12 "Dead Fir Mixedwood Leafless" M-3 30
13 "Dead Fir Mixedwood Green" M-4 30
14 "Jack Pine Slash" S-1
15 "White Spruce Slash" S-2
16 "Coastal Slash" S-3
17 "Matted Grass" O-1a
18 "Standing Grass" O-1b
101 "Non-Fuel"
102 "Water"
```

### Lookup Table Fields

| Field | Description |
|-------|-------------|
| Code | Integer fuel code in raster |
| Name | Descriptive name (quoted) |
| FBPCode | Standard FBP fuel type |
| Optional | Percent conifer (M1/M2) or percent dead fir (M3/M4) |

## Input Directory Structure

```
RASTER_ROOT/
├── dem/
│   └── dem_{zone}.tif       # Elevation (Int16, meters)
├── fuel/
│   └── fuel_{zone}.tif      # Fuel codes (Int16)
├── aspect/
│   └── aspect_{zone}.tif    # Optional pre-computed
└── slope/
    └── slope_{zone}.tif     # Optional pre-computed
```

### Raster Requirements

| Layer | Type | Units | Notes |
|-------|------|-------|-------|
| DEM | Int16 | meters | Must have square pixels |
| Fuel | Int16 | codes | Must match fuel.lut codes |
| Aspect | Float32 | degrees | Optional (derived from DEM) |
| Slope | Float32 | percent | Optional (derived from DEM) |

### Grid Constraints

- **Pixel Shape**: Must be square (equal X and Y cell size)
- **Projection**: Consistent across all layers
- **Alignment**: Fuel and DEM must have matching extent and origin
- **North Deviation**: Must be <0.001 degrees from true north

## Default Values

When settings.ini is missing or incomplete:

| Setting | Default |
|---------|---------|
| Async Execution | true |
| Deterministic | false |
| Save Individual | false |
| Save ASCII | false |
| Save TIFF | true |
| Save Points | false |
| Save Intensity | true |
| Save Probability | true |
| Save Occurrence | false |
| Save Simulation Area | false |
| Static Curing | 75% |
| Force Greenup | false |

## Validation Rules

### Path Validation
- Relative paths resolved against binary directory
- Non-existent directories cause fatal error
- Missing fuel.lut causes fatal error

### Value Validation
- Grass curing must be 0-100
- FFMC thresholds must be 0-101
- Unused settings generate warnings

### Grid Validation
- Non-square pixels cause fatal error
- Misaligned grids cause fatal error
- Missing projection causes fatal error
