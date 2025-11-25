# CLI Reference

## Execution Modes

FireSTARR supports three execution modes:

| Mode | Purpose | Usage |
|------|---------|-------|
| **Simulation** | Probabilistic fire growth modeling | Default mode |
| **Surface** | Probability surfaces across geographic area | `firestarr surface ...` |
| **Test** | Validation with synthetic data | `firestarr test ...` |

## Command Syntax

### Simulation Mode (Default)

```bash
firestarr <output_dir> <yyyy-mm-dd> <lat> <lon> <HH:MM> [options]
```

### Surface Mode

```bash
firestarr surface <output_dir> <yyyy-mm-dd> <lat> <lon> <HH:MM> [options]
```

### Test Mode

```bash
firestarr test <output_dir> [all] [options]
```

## Positional Arguments

| Argument | Mode | Required | Format | Description |
|----------|------|----------|--------|-------------|
| `output_dir` | All | Yes | Path | Output directory (created if needed) |
| `yyyy-mm-dd` | Sim/Surface | Yes | Date | Start date (ISO format) |
| `lat` | Sim/Surface | Yes | Float | Latitude (decimal degrees) |
| `lon` | Sim/Surface | Yes | Float | Longitude (decimal degrees) |
| `HH:MM` | Sim/Surface | Yes | Time | Start time (24-hour, exactly 5 chars) |
| `all` | Test | No | Keyword | Run all test cases |

## Required Options

### Weather Input

| Option | Mode | Description |
|--------|------|-------------|
| `--wx <file>` | Simulation | Weather CSV file path |

### Fire Weather Indices

| Option | Required | Range | Description |
|--------|----------|-------|-------------|
| `--ffmc <value>` | Yes | 0-101 | Fine Fuel Moisture Code |
| `--dmc <value>` | Yes | 0-499 | Duff Moisture Code |
| `--dc <value>` | Yes | 0-999 | Drought Code |

### Wind Parameters (Surface Mode)

| Option | Required | Range | Description |
|--------|----------|-------|-------------|
| `--wd <value>` | Surface | 0-360 | Wind direction (degrees) |
| `--ws <value>` | Surface | ≥0 | Wind speed (m/s) |

### Timezone

| Option | Required | Description |
|--------|----------|-------------|
| `--tz <hours>` | Yes | UTC offset (e.g., -7 for MST) |

## Optional Arguments

### Fire Start Configuration

| Option | Description |
|--------|-------------|
| `--perim <file>` | Start from perimeter geometry (KML) |
| `--size <value>` | Initial fire size (hectares) |
| `--apcp_prev <value>` | Previous day precipitation |

### Simulation Control

| Option | Default | Description |
|--------|---------|-------------|
| `--deterministic` | Off | 100% spread probability |
| `--confidence <value>` | 0.1 | Convergence threshold (0.0-1.0) |

### Vegetation Control

| Option | Description |
|--------|-------------|
| `--curing <percent>` | Static grass curing (0-100) |
| `--force-greenup` | Force vegetation greenup |
| `--force-no-greenup` | Suppress greenup |

### Data Source Overrides

| Option | Description |
|--------|-------------|
| `--raster-root <path>` | Override raster data directory |
| `--fuel-lut <path>` | Override fuel lookup table |

### Output Selection

| Flag | Default | Description |
|------|---------|-------------|
| `-i` | Off | Save individual scenario maps |
| `--points` | Off | Save spread points |
| `--no-intensity` | On | Disable intensity output |
| `--no-probability` | On | Disable probability output |
| `--occurrence` | Off | Save occurrence grids |
| `--sim-area` | Off | Save simulation area |

### Output Format

| Flag | Default | Description |
|------|---------|-------------|
| `--ascii` | Off | Save as ASCII grid (.asc) |
| `--no-tiff` | On | Disable GeoTIFF output |

### Logging and Verbosity

| Flag | Description |
|------|-------------|
| `-v` | Increase verbosity (stackable) |
| `-q` | Decrease verbosity (stackable) |
| `-h` | Show help |
| `--log <filename>` | Log file name (default: firestarr.log) |

### Execution Control

| Flag | Default | Description |
|------|---------|-------------|
| `-s` | Async | Run synchronously |
| `--output_date_offsets <list>` | [1,2,3,7,14] | Days to output |

## Test Mode Options

| Option | Description |
|--------|-------------|
| `--hours <value>` | Test duration (hours) |
| `--fuel <type>` | FBP fuel type code |
| `--slope <value>` | Constant slope (%) |
| `--aspect <value>` | Slope aspect (degrees) |

## Examples

### Basic Simulation

```bash
firestarr ./output 2024-06-15 53.5 -120.3 14:30 \
  --wx weather.csv \
  --ffmc 75.0 --dmc 150.0 --dc 300.0 \
  --tz -7
```

### Deterministic Run

```bash
firestarr ./output 2024-06-15 53.5 -120.3 14:30 \
  --wx weather.csv \
  --ffmc 75.0 --dmc 150.0 --dc 300.0 \
  --deterministic \
  --tz -7
```

### Surface Mode

```bash
firestarr surface ./output 2024-06-15 53.5 -120.3 14:30 \
  --ffmc 80.0 --dmc 120.0 --dc 250.0 \
  --wd 180 --ws 20 \
  --tz -7
```

### Enhanced Output

```bash
firestarr ./output 2024-06-15 53.5 -120.3 14:30 \
  --wx weather.csv \
  --ffmc 75.0 --dmc 150.0 --dc 300.0 \
  -i --points --occurrence --sim-area \
  --tz -7
```

### Test Mode

```bash
firestarr test ./output \
  --fuel D-1 --hours 24 \
  --ffmc 75 --dmc 120 --dc 250 \
  --wd 270 --ws 15 --slope 10 --aspect 180
```

### Verbose with Custom Confidence

```bash
firestarr ./output 2024-06-15 53.5 -120.3 14:30 \
  --wx weather.csv \
  --ffmc 75.0 --dmc 150.0 --dc 300.0 \
  --confidence 0.05 \
  --output_date_offsets "[1,3,7,14,30]" \
  -v -v -v \
  --tz -7
```

## Weather File Format

CSV with required columns in order:

```
Scenario,Date,PREC,TEMP,RH,WS,WD,FFMC,DMC,DC,ISI,BUI,FWI
```

| Column | Unit | Description |
|--------|------|-------------|
| Scenario | Integer | Weather scenario ID |
| Date | yyyy-mm-dd HH:MM | Timestamp |
| PREC | mm | Precipitation |
| TEMP | °C | Temperature |
| RH | % | Relative humidity |
| WS | km/h | Wind speed |
| WD | degrees | Wind direction |
| FFMC | 0-101 | Fine Fuel Moisture Code |
| DMC | 0+ | Duff Moisture Code |
| DC | 0+ | Drought Code |
| ISI | 0+ | Initial Spread Index |
| BUI | 0+ | Build-up Index |
| FWI | 0+ | Fire Weather Index |

**Requirements:**
- Sequential hourly timestamps
- No gaps in data
- All data within same calendar year
- Non-negative precipitation
