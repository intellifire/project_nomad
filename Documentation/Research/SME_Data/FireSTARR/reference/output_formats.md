# Output Formats

## Overview

FireSTARR generates GeoTIFF rasters and CSV files containing simulation results. All spatial outputs use UTM NAD83 projection determined by the ignition point.

## Output File Types

### Probability Maps

**File Pattern**: `probability_{N}day.tif`

| Attribute | Value |
|-----------|-------|
| Data Type | Float32 |
| Value Range | 0.0 - 1.0 |
| NoData | -9999.0 |
| Compression | LZW |

**Interpretation**: Fraction of scenarios where fire reached each cell.

### Intensity Classification Maps

**File Pattern**: `intensity_{L|M|H}_{N}day.tif`

| Classification | Threshold (kW/m) |
|----------------|------------------|
| Low (L) | 0 - 2000 |
| Moderate (M) | 2000 - 4000 |
| High (H) | > 4000 |

| Attribute | Value |
|-----------|-------|
| Data Type | Float32 |
| Value Range | 0.0 - 1.0 |
| NoData | -9999.0 |

**Interpretation**: Probability of burning at specified intensity level.

### Occurrence Maps

**File Pattern**: `occurrence_{N}day.tif`

| Attribute | Value |
|-----------|-------|
| Data Type | Uint32 |
| Value Range | 0 - num_simulations |
| NoData | -9999 |

**Interpretation**: Raw count of scenarios where cell burned.

### Fire Size Statistics

**File Pattern**: `sizes_{N}day.csv`

**Format**: One fire size per line (hectares)

```
125.5
185.2
250.0
310.8
```

## Coordinate System

### Projection

- **Type**: UTM (Universal Transverse Mercator)
- **Datum**: NAD83
- **Spheroid**: GRS80
- **Units**: Meters

### Zone Determination

```
UTM Zone = floor((longitude + 180) / 6) + 1
```

### GeoTIFF Metadata

```cpp
// Tie point (upper-left corner)
tiePoints[6] = {0.0, 0.0, 0.0, xul, yul, 0.0};

// Pixel scale
pixelScale[3] = {cellSize, cellSize, 0.0};
```

### Projection File (.prj)

```
Projection    TRANSVERSE
Datum         AI_CSRS
Spheroid      GRS80
Units         METERS
Zunits        NO
Xshift        0.0
Yshift        0.0
Parameters
{scale_factor}     /* scale factor at central meridian
{central_meridian}  0  0.0 /* longitude of central meridian
{latitude_origin}   0  0.0 /* latitude of origin
{false_easting}    /* false easting (meters)
{false_northing}   /* false northing (meters)
```

## File Naming Conventions

### Standard Pattern

```
{prefix}_{NNN}_{YYYY-MM-DD}.{ext}
```

| Component | Description |
|-----------|-------------|
| prefix | Output type (probability, intensity_L, etc.) |
| NNN | Day offset (001, 002, 003, 007, 014) |
| YYYY-MM-DD | Simulation start date |
| ext | File extension (.tif, .asc, .csv) |

### Interim Files

**Pattern**: `interim_{standard_pattern}`

Interim files are generated during simulation and deleted upon completion.

### Example Output Structure

```
output_dir/
├── probability_001_2024-06-15.tif
├── probability_001_2024-06-15.prj
├── probability_002_2024-06-15.tif
├── probability_003_2024-06-15.tif
├── probability_007_2024-06-15.tif
├── probability_014_2024-06-15.tif
├── intensity_L_001_2024-06-15.tif
├── intensity_M_001_2024-06-15.tif
├── intensity_H_001_2024-06-15.tif
├── occurrence_001_2024-06-15.tif
├── sizes_001_2024-06-15.csv
├── wx_hourly_out.csv
├── wx_daily_out.csv
└── firestarr.log
```

## GeoTIFF Specifications

### Compression

- **Type**: LZW (Lempel-Ziv-Welch)
- **Lossless**: Yes
- **Tiled**: Yes (256x256 pixels)

### Configuration

```cpp
TIFFSetField(tif, TIFFTAG_COMPRESSION, COMPRESSION_LZW);
TIFFSetField(tif, TIFFTAG_TILEWIDTH, 256);
TIFFSetField(tif, TIFFTAG_TILELENGTH, 256);
```

### Bands

All outputs are single-band rasters.

## ASCII Grid Format

**Extension**: `.asc`

### Header

```
ncols         4000
nrows         3000
xllcorner     500000.000000
yllcorner     6200000.000000
cellsize      10
NODATA_value  -9999
```

### Data

- Space-separated values
- One row per line
- Bottom-to-top row order

## Weather Output Files

### Hourly Weather

**File**: `wx_hourly_out.csv`

**Columns**:
```
timestamp,temp,rh,wspd,wdir,rain,ffmc,dmc,dc,isi,bui,fwi
```

### Daily Weather

**File**: `wx_daily_out.csv`

**Columns**: Same as hourly, aggregated to daily values.

## Log File Format

**File**: `firestarr.log`

**Format**: `[YYYY-MM-DD HH:MM:SS] LEVEL: message`

**Example**:
```
[2024-06-15 14:30:45] INFO:      Fire size at end of day 1: 125.5 ha
[2024-06-15 14:30:46] DEBUG:     Recording interim_probability_001.tif
[2024-06-15 14:35:00] INFO:      Convergence achieved after 15 iterations
```

## Processing Status Codes

Used in perimeter outputs:

| Code | Status |
|------|--------|
| 2 | Unprocessed |
| 3 | Processing |
| 4 | Processed (final) |

## Value Interpretation

### Probability Grid

| Value | Meaning |
|-------|---------|
| 0.0 | Never burned |
| 0.5 | Burned in 50% of simulations |
| 1.0 | Burned in all simulations |
| -9999 | Not simulated (NoData) |

### Intensity Grid

| Value | Meaning |
|-------|---------|
| 0.0 | Never burned at this intensity |
| 0.25 | 25% of simulations at this intensity |
| 1.0 | All simulations at this intensity |

### Occurrence Grid

| Value | Meaning |
|-------|---------|
| 0 | Not burned |
| 50 | Burned in 50 scenarios |
| N | Burned in all N scenarios |

## Individual Scenario Outputs

When `-i` flag is used:

**Files Generated**:
- `{scenario_id}_intensity.tif` - Peak fire intensity (kW/m)
- `{scenario_id}_ros.tif` - Rate of spread (m/min)
- `{scenario_id}_raz.tif` - Spread direction (degrees)

## GDAL Compatibility

All GeoTIFF outputs are GDAL-compatible:

```python
from osgeo import gdal

ds = gdal.Open("probability_001_2024-06-15.tif")
band = ds.GetRasterBand(1)
data = band.ReadAsArray()
nodata = band.GetNoDataValue()  # -9999.0
geotransform = ds.GetGeoTransform()
projection = ds.GetProjection()
```
