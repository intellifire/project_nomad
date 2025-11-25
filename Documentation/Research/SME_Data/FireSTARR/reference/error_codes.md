# Error Codes

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| -1 | Usage error (invalid arguments) |
| 1 (EXIT_FAILURE) | Fatal error during execution |

## Log Levels

| Level | Value | Description |
|-------|-------|-------------|
| EXTENSIVE | 0 | Maximum detail (cell-by-cell) |
| VERBOSE | 1 | Detailed tracing |
| DEBUG | 2 | Debug information (default) |
| INFO | 3 | Informational messages |
| NOTE | 4 | Notable events |
| WARNING | 5 | Warning conditions |
| ERROR | 6 | Non-fatal errors |
| FATAL | 7 | Fatal errors (terminates) |
| SILENT | 8 | No output |

## Common Error Messages

### File I/O Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Could not open input weather file" | Weather CSV missing | Verify file path and permissions |
| "Cannot open file for output" | Permission denied | Check output directory permissions |
| "Unable to read directory" | Raster root invalid | Verify RASTER_ROOT path |
| "Cannot create directory" | Permission denied | Check parent directory permissions |
| "is not a directory" | Path is a file | Use correct directory path |

### Weather Data Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Input CSV must have columns in this order" | Wrong column order | Fix CSV header to match expected format |
| "Expected sequential hours" | Missing/duplicate hours | Ensure continuous hourly data |
| "Weather crosses year boundary" | Dates span years | Keep all data within single year |
| "Hourly weather precip is negative" | Invalid precipitation | Fix source data |
| "Day already exists" | Duplicate records | Remove duplicate timestamps |

### Time/Date Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid hour" | Hour not 0-23 | Use 24-hour format |
| "Invalid minute" | Minute not 0-59 | Use valid minute value |
| "Start time before weather streams" | Temporal mismatch | Adjust start time or weather data |
| "Start time after weather streams" | Temporal mismatch | Extend weather data coverage |

### Configuration Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing setting for" | Required key absent | Add missing key to settings.ini |
| "Fuel lookup table not loaded" | fuel.lut missing | Verify FUEL_LOOKUP_TABLE path |
| "Expected list starting with '['" | Invalid list format | Use format: [1,2,3] |
| "Grass curing must be in range [0-100]" | Value out of bounds | Use percentage 0-100 |

### Spatial/Grid Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot open file as TIF" | Corrupted file | Regenerate raster |
| "Cannot open file as GEOTIFF" | Missing georef | Add projection info |
| "Can only use grids with square pixels" | Rectangular cells | Resample to square cells |
| "Due north is not top of raster" | Projection issue | Use UTM or similar projection |
| "Could not find environment" | Point outside rasters | Extend raster coverage or move point |

### Fire Modeling Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Trying to start fire in non-fuel" | Invalid location | Move ignition to burnable area |
| "Fuel grid is empty" | No valid cells | Check fuel raster and lookup |
| "No weather provided" | Missing weather | Provide weather file |
| "Invalid fuel type in fuel map" | Unknown code | Add code to fuel.lut |

### Argument Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing argument to" | Flag needs value | Provide required value |
| "Argument already specified" | Duplicate flag | Remove duplicate |
| "Not enough positional arguments" | Missing args | Provide all required arguments |
| "Too many positional arguments" | Extra args | Remove extra arguments |
| "must be specified" | Required missing | Add required flag |

## Troubleshooting Guide

### Enable Verbose Logging

```bash
# Maximum verbosity
firestarr ... -v -v -v

# Or set log level in code
Log::setLogLevel(LOG_EXTENSIVE);
```

### Log File Analysis

**Location**: `<output_dir>/firestarr.log`

**Format**: `[YYYY-MM-DD HH:MM:SS] LEVEL: message`

**Search Patterns**:
```bash
# Find all errors
grep "ERROR:" firestarr.log

# Find warnings
grep "WARNING:" firestarr.log

# Trace specific scenario
grep "Scenario 5" firestarr.log
```

### Common Issues

#### Weather File Not Found
```
FATAL: Could not open input weather file ./weather.csv
```
**Fix**: Verify file exists and path is correct (relative to working directory).

#### Grid Alignment Mismatch
```
FATAL: check_equal failed for yllcorner
```
**Fix**: Ensure fuel and DEM grids have identical extent and origin.

#### Non-Square Pixels
```
FATAL: Can only use grids with square pixels
```
**Fix**: Resample rasters to have equal X and Y cell sizes.

#### Out of Time
```
WARNING: Ran out of time - cancelling simulations
```
**Fix**: Increase MAXIMUM_TIME or reduce simulation complexity.

#### Ignition Outside Rasters
```
FATAL: Could not find an environment to use for (53.5, -120.3)
```
**Fix**: Extend raster coverage to include ignition point.

### Debug Build Features

Compile without NDEBUG for additional diagnostics:

- Stack traces on fatal errors
- Extensive debug assertions
- Additional validation output

**Debug Flags** (debug_settings.h):
- `DEBUG_DIRECTIONS`: Wind/spread direction details
- `DEBUG_FUEL_VARIABLE`: Fuel calculations
- `DEBUG_FWI_WEATHER`: Weather calculations
- `DEBUG_GRIDS`: Grid operations
- `DEBUG_POINTS`: Point processing
- `DEBUG_PROBABILITY`: Probability calculations
- `DEBUG_SIMULATION`: Simulation details
- `DEBUG_STATISTICS`: Statistical calculations

### Log Output Examples

**Successful Start**:
```
[2024-06-15 14:30:00] INFO:      Reading weather from ./weather.csv
[2024-06-15 14:30:01] INFO:      Loaded 168 hourly weather records
[2024-06-15 14:30:02] INFO:      Starting simulation at (53.5, -120.3)
```

**Weather Format Error**:
```
[2024-06-15 14:30:00] FATAL:     Input CSV must have columns in this order:
'Scenario,Date,PREC,TEMP,RH,WS,WD,FFMC,DMC,DC,ISI,BUI,FWI'
but got:
'Date,Temp,RH,Wind,Direction,Rain,FFMC,DMC,DC'
```

**Convergence Progress**:
```
[2024-06-15 14:35:00] INFO:      Iteration 10: mean=185.2 ha, 95th pct=450 ha
[2024-06-15 14:35:01] DEBUG:     Confidence: sizes=0.15, means=0.12, pct=0.08
[2024-06-15 14:35:02] INFO:      Estimated 5 more iterations needed
```
