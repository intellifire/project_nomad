# FWI Calculations in WISE Fire Modeling

## Executive Summary

The Canadian Forest Fire Weather Index (FWI) System is the core fire weather assessment framework used by WISE to quantify fire danger conditions. WISE requires FWI inputs to drive fire behavior predictions via the Fire Behavior Prediction (FBP) System. This document details how weather observations are transformed into moisture codes and fire behavior indices that control fire spread calculations in WISE simulations.

---

## Canadian Forest Fire Weather Index System Overview

The FWI System is a hierarchical calculation framework that transforms basic weather observations (temperature, relative humidity, wind speed, precipitation) into standardized fire danger indices. Developed by the Canadian Forest Service, it has been validated across diverse ecosystems and is the foundation of operational fire management systems worldwide.

### System Architecture

```
Weather Inputs (Temp, RH, Wind, Precip)
    │
    ├─> Fine Fuel Moisture Code (FFMC) ────┐
    │                                        ├─> Initial Spread Index (ISI) ─┐
    ├─> Duff Moisture Code (DMC) ────┐      │                                 │
    │                                 ├─> Buildup Index (BUI) ────────────────┼─> Fire Weather Index (FWI)
    └─> Drought Code (DC) ───────────┘                                        │
                                                                               └─> Daily Severity Rating (DSR)
```

### Two-Tier Structure

**Tier 1: Fuel Moisture Codes** (respond to weather changes)
- Fine Fuel Moisture Code (FFMC)
- Duff Moisture Code (DMC)
- Drought Code (DC)

**Tier 2: Fire Behavior Indices** (derived from moisture codes + current weather)
- Initial Spread Index (ISI)
- Buildup Index (BUI)
- Fire Weather Index (FWI)
- Daily Severity Rating (DSR)

---

## Fuel Moisture Codes

### Fine Fuel Moisture Code (FFMC)

**Purpose**: Represents moisture content of fine surface fuels (litter, small twigs, grass, needles).

**Range**: 0-101 (technically moisture content percentage, but inverted scale where higher = drier)

**Time Scale**: Hours - responds rapidly to weather changes

**Physical Meaning**:
- FFMC = 85: ~15% moisture content (moderate fire danger)
- FFMC = 92: ~8% moisture content (high fire danger)
- FFMC = 96: ~4% moisture content (extreme fire danger)
- FFMC = 101: Theoretical minimum moisture (0%)

**Calculation Drivers**:
- Temperature (°C)
- Relative Humidity (%)
- Wind Speed (km/h)
- Precipitation (mm)
- Previous day's FFMC value

**Significance in WISE**:
- Primary driver of fire spread rate calculations
- Direct input to Initial Spread Index (ISI)
- Critical for predicting ignition probability
- Updated hourly in WISE simulations (see Diurnal FFMC below)

**Typical Operational Thresholds**:
- FFMC < 80: Low spread potential
- FFMC 80-87: Moderate spread potential
- FFMC 87-92: High spread potential
- FFMC > 92: Extreme spread potential

### Duff Moisture Code (DMC)

**Purpose**: Represents moisture content of loosely compacted organic layers 5-10 cm deep.

**Range**: 0-∞ (typically 0-200 in operational use)

**Time Scale**: Days to weeks - responds to multi-day drying/wetting cycles

**Physical Meaning**:
- DMC = 20: Wet organic layer (spring conditions)
- DMC = 40: Moderate drying (early summer)
- DMC = 80: Significant drying (mid-summer)
- DMC = 150+: Severe drought (late summer extremes)

**Calculation Drivers**:
- Temperature (°C)
- Relative Humidity (%)
- Precipitation (mm)
- Day length (derived from latitude and date)
- Previous day's DMC value

**Significance in WISE**:
- Indicates fuel availability for combustion
- Component of Buildup Index (BUI)
- Affects fire intensity calculations
- Influences depth of burn and fuel consumption

**Typical Operational Thresholds**:
- DMC < 30: Low fire intensity potential
- DMC 30-60: Moderate intensity potential
- DMC 60-100: High intensity potential
- DMC > 100: Extreme intensity potential

### Drought Code (DC)

**Purpose**: Represents moisture content of deep compact organic layers 10-20 cm deep.

**Range**: 0-∞ (typically 0-1000 in extreme drought)

**Time Scale**: Months to seasons - responds to long-term precipitation deficits

**Physical Meaning**:
- DC = 100: Spring green-up conditions
- DC = 300: Mid-summer drying
- DC = 500: Significant seasonal drought
- DC = 700+: Extreme multi-month drought

**Calculation Drivers**:
- Temperature (°C)
- Precipitation (mm)
- Day length (derived from latitude and date)
- Previous day's DC value

**Significance in WISE**:
- Long-term drought indicator
- Component of Buildup Index (BUI)
- Affects fire intensity and difficulty of control
- Seasonal fire danger context

**Typical Operational Thresholds**:
- DC < 200: Low seasonal fire danger
- DC 200-400: Moderate seasonal danger
- DC 400-600: High seasonal danger
- DC > 600: Extreme seasonal danger

---

## Fire Behavior Indices

### Initial Spread Index (ISI)

**Purpose**: Numerical rating of expected rate of fire spread.

**Range**: 0-∞ (typically 0-30, extreme conditions > 50)

**Calculation**:
```
ISI = f(FFMC, Wind Speed)
```

**Components**:
1. **Fine Fuel Moisture Effect**: Exponential relationship with FFMC
   - Higher FFMC → exponentially higher ISI
2. **Wind Effect**: Non-linear wind speed influence
   - Wind speed modified by FFMC to account for fuel responsiveness

**Significance in WISE**:
- Direct input to Fire Behavior Prediction (FBP) rate of spread equations
- Used in elliptical fire growth modeling
- Controls speed of fire perimeter expansion
- Hourly ISI calculated for time-varying fire behavior

**Typical Values**:
- ISI < 5: Low spread rates
- ISI 5-10: Moderate spread rates
- ISI 10-20: High spread rates
- ISI > 20: Extreme spread rates

### Buildup Index (BUI)

**Purpose**: Numerical rating of fuel available for combustion.

**Range**: 0-∞ (typically 0-200, extreme drought > 300)

**Calculation**:
```
BUI = f(DMC, DC)
```

**Components**:
- Weighted combination of DMC (moderate depth fuels) and DC (deep fuels)
- Non-linear relationship emphasizes drought conditions

**Significance in WISE**:
- Direct input to FBP fuel consumption calculations
- Affects fire intensity (kW/m)
- Influences crown fire potential
- Modulates total fuel consumed

**Typical Values**:
- BUI < 40: Low fuel availability
- BUI 40-80: Moderate fuel availability
- BUI 80-120: High fuel availability
- BUI > 120: Extreme fuel availability

### Fire Weather Index (FWI)

**Purpose**: General index of fire intensity potential combining spread and fuel availability.

**Range**: 0-∞ (typically 0-50, extreme conditions > 100)

**Calculation**:
```
FWI = f(ISI, BUI)
```

**Components**:
- Non-linear combination of spread potential (ISI) and fuel availability (BUI)
- Emphasizes conditions where both spread and intensity are high

**Significance in WISE**:
- Primary fire danger communication metric
- Can be output as grid statistic from WISE simulations
- Used for operational fire danger class assignment
- Summarizes overall fire danger in single value

**Typical Operational Classes**:
- FWI < 5: Low fire danger
- FWI 5-13: Moderate fire danger
- FWI 13-22: High fire danger
- FWI 22-38: Very High fire danger
- FWI > 38: Extreme fire danger

### Daily Severity Rating (DSR)

**Purpose**: Exponential transformation of FWI for more intuitive danger scaling.

**Range**: 0-∞

**Calculation**:
```
DSR = 0.0272 × FWI^1.77
```

**Significance in WISE**:
- More intuitive scale for public communication
- Better represents perceived increase in fire danger
- FWI of 30 is not "twice as bad" as FWI of 15, but DSR captures this perception
- Rarely used directly in WISE calculations (FWI preferred)

---

## Weather Inputs and Requirements

### Required Weather Observations

WISE weather streams require hourly observations in plain text format:

| Variable | Units | Description | Typical Range |
|----------|-------|-------------|---------------|
| **Temp** | °C | Air temperature at screen height (1.5-2m) | -40 to +50 |
| **RH** | % | Relative humidity (0-100) | 0 to 100 |
| **WS** | km/h | 10-minute average wind speed at 10m height | 0 to 100 |
| **WD** | degrees | Wind direction (degrees from which wind is blowing) | 0 to 360 |
| **Precip** | mm | Hourly accumulated precipitation | 0 to 50 |

### Weather Data File Format

```
Temp    RH      WS      WD      Precip
28.5    25.0    15.0    270     0.0
29.2    23.0    18.0    265     0.0
30.1    21.0    20.0    260     0.0
30.8    19.0    22.0    255     0.0
```

**Format Requirements**:
- Tab or space delimited columns
- One row per hour
- Header row optional but recommended
- No missing values (use interpolation or default values)
- Must cover entire simulation period

### Weather Station Configuration

```typescript
let station = new wise.WeatherStation();
station.id = "Station_1";
station.location = new LatLon(49.5123, -117.2456);
station.elevation = 650; // meters ASL
```

**Location Requirements**:
- Latitude/longitude in decimal degrees (WGS84)
- Elevation in meters above sea level
- Representative of modeled fire location (< 25 km distance preferred)

---

## Weather Stream Configuration in WISE

### Starting FWI Values

WISE requires "yesterday's" FWI codes to initialize calculations:

```typescript
let stream = station.addWeatherStream(
    "/data/weather.txt",
    85.0,                              // HFFMC value (see Diurnal FFMC below)
    13,                                // HFFMC hour (0-23)
    HFFMCMethod.VAN_WAGNER,            // or LAWSON
    89.5,                              // Starting FFMC
    45.2,                              // Starting DMC
    320.1,                             // Starting DC
    0.0,                               // Starting precipitation (mm)
    DateTime.fromISO("2024-07-15"),    // Stream start date
    DateTime.fromISO("2024-07-17"),    // Stream end date
    "Primary weather stream"
);
```

### Starting Value Sources

**Option 1: Operational Weather Observations**
- Obtain previous day's noon FWI values from weather station network
- CWFIS (Canadian Wildfire Information System) provides daily FWI for Canada
- SpotWX API provides forecast FWI values

**Option 2: Climatological Defaults**
- Spring green-up: FFMC = 85, DMC = 6, DC = 15
- Mid-summer average: FFMC = 85, DMC = 45, DC = 250
- Late-summer drought: FFMC = 90, DMC = 80, DC = 450

**Option 3: Spin-Up Period**
- Run FWI calculations for 7-14 days before simulation start
- Allows codes to equilibrate with recent weather
- Recommended when historical weather data is available

### Starting Precipitation

The `starting_precip` parameter represents precipitation from the previous afternoon (after FWI codes were calculated):

- Set to 0.0 mm if no afternoon precipitation occurred
- Set to actual mm if precipitation fell between noon and midnight previous day
- Affects overnight FFMC recovery calculations

---

## Diurnal FFMC Calculations

### Why Hourly FFMC Matters

WISE models fire behavior hour-by-hour. Fire spread rates can vary dramatically throughout the day as fine fuels dry out (daytime) and rewet (nighttime). Standard FWI uses noon observations, but WISE requires hourly FFMC updates.

### Two HFFMC Methods

**1. Van Wagner Method (Original)**
- Theoretical hourly FFMC calculation from Van Wagner (1977)
- More complex equilibrium moisture calculations
- Better for research applications

**2. Lawson Method (Operational)**
- Simplified diurnal adjustment (Lawson 2008)
- Operationally validated for Canadian forests
- Faster computation
- Recommended for operational fire modeling

### HFFMC Configuration Parameters

**hffmc_value** (typically 85-94):
- The "reference" FFMC at a specific hour
- Represents afternoon maximum dryness
- Franco's operational practice: **94.0 at Hour 17** (5:00 PM local time)
- This means fine fuels reach FFMC = 94 at the hottest/driest part of the day

**hffmc_hour** (0-23):
- Hour (local time) when hffmc_value occurs
- Typically 13-17 (1:00 PM - 5:00 PM)
- Operational standard: **Hour 17** (5:00 PM)

**hffmc_method**:
- `HFFMCMethod.VAN_WAGNER`: Original theoretical method
- `HFFMCMethod.LAWSON`: Operational diurnal method (recommended)

### How Diurnal FFMC Works

WISE calculates hourly FFMC by:

1. **Morning**: FFMC rises from overnight low toward afternoon maximum
2. **Afternoon Peak**: FFMC reaches `hffmc_value` at `hffmc_hour`
3. **Evening**: FFMC decreases as fuels absorb overnight moisture
4. **Nighttime Low**: FFMC reaches minimum around sunrise

**Example Diurnal Curve (Lawson Method)**:
```
Hour    FFMC    Fire Behavior Impact
00:00   83.2    Minimal spread (fuels moist from overnight dew)
06:00   82.5    Reduced spread (morning moisture peak)
09:00   85.8    Increasing spread (fuels drying)
12:00   91.3    Moderate-high spread (pre-afternoon peak)
13:00   92.7    High spread
15:00   93.9    High spread
17:00   94.0    Peak spread potential (hffmc_value at hffmc_hour)
19:00   92.1    Decreasing spread (fuels beginning to rewet)
21:00   88.4    Reduced spread (evening moisture recovery)
23:00   85.1    Low spread (overnight moisture absorption)
```

### Impact on Fire Modeling

Diurnal FFMC directly affects:
- **Spread Rate**: Fire advances faster during afternoon peak FFMC
- **Ignition**: Spot fires more likely to establish during high FFMC hours
- **Suppression Windows**: Fire behavior moderates during low FFMC periods
- **Realistic Growth**: Models exhibit natural diurnal fire behavior patterns

**Operational Significance**:
- Captures afternoon "burning period" when fires make major runs
- Models overnight fire moderation critical for suppression planning
- Enables prediction of optimal suppression windows (early morning)

---

## FWI Calculations in WISE Fire Spread

### How WISE Uses FWI Values

WISE integrates FWI into fire spread calculations through the FBP System:

```
Hourly Weather → Hourly FFMC (diurnal) → ISI
                                           ↓
Fuel Type + ISI + BUI → FBP Equations → Rate of Spread (m/min)
                                           ↓
                              Fire Perimeter Growth (hourly time steps)
```

### FBP Integration

**Rate of Spread Calculation**:
```
ROS = RSI × CF
```

Where:
- **RSI** (Rate of Spread Initial) = f(ISI, Fuel Type)
- **CF** (Correction Factor) = f(BUI, Fuel Type)

**ISI provides**:
- Base spread rate for fuel type
- Wind speed effect
- Fine fuel moisture effect (via FFMC)

**BUI provides**:
- Fuel consumption correction
- Crown fire potential
- Intensity modulation

### Scenario Example: C-2 Boreal Spruce Fire

**Weather Conditions (Hour 17:00)**:
- Temperature: 28°C
- Relative Humidity: 25%
- Wind Speed: 25 km/h
- Wind Direction: 270° (West)

**FWI Values**:
- FFMC: 94.0 (very dry fine fuels)
- DMC: 58.0 (moderate drying)
- DC: 482.0 (significant seasonal drought)
- ISI: 18.2 (high spread potential)
- BUI: 95.3 (high fuel availability)
- FWI: 42.6 (extreme fire danger)

**FBP Calculation Results**:
- Head Fire Rate of Spread: 28.4 m/min
- Flank Fire Rate of Spread: 8.2 m/min
- Back Fire Rate of Spread: 0.6 m/min
- Head Fire Intensity: 12,450 kW/m (high intensity crown fire)
- Crown Fraction Burned: 95% (active crown fire)

**Interpretation**:
- Fire will advance 1.7 km/hour at head
- Active crown fire consuming most available fuel
- Suppression extremely difficult/dangerous
- Spot fires likely ahead of main fire

---

## Weather Stream Requirements Summary

### Minimum Required Data

| Component | Requirement | Source |
|-----------|-------------|--------|
| **Hourly Weather File** | Temp, RH, WS, WD, Precip | Weather station or forecast |
| **Starting FFMC** | 0-101 | Previous day noon value or default |
| **Starting DMC** | 0-∞ | Previous day noon value or default |
| **Starting DC** | 0-∞ | Previous day noon value or default |
| **Starting Precip** | mm | Previous afternoon precip |
| **HFFMC Value** | 85-94 | Operational: 94.0 |
| **HFFMC Hour** | 0-23 | Operational: 17 (5 PM) |
| **HFFMC Method** | VAN_WAGNER or LAWSON | Operational: LAWSON |

### Data Quality Requirements

**Temporal Coverage**:
- Weather data must span entire scenario period
- No gaps in hourly observations
- Consistent time zone throughout

**Spatial Representativeness**:
- Weather station within 25 km of fire (preferred)
- Similar elevation to fire location (± 200m ideal)
- No major terrain barriers between station and fire

**Data Validation**:
- Temperature: -40°C to +50°C
- RH: 0% to 100%
- Wind Speed: 0 to 100 km/h (extreme winds > 100 km/h may occur)
- Wind Direction: 0° to 360° (calm winds coded as 0 or 360)
- Precip: 0 to 50 mm/hour (higher values possible in extreme events)

---

## FWI Validation and Quality Control

### Expected Value Ranges

**Daily Codes (Noon Values)**:
- FFMC: 0-101 (operational range typically 75-99)
- DMC: 0-200 (extreme drought may exceed 200)
- DC: 0-800 (rarely exceeds 800 except in multi-year drought)

**Daily Indices (Noon Values)**:
- ISI: 0-30 (extreme conditions may reach 50+)
- BUI: 0-200 (extreme drought may exceed 200)
- FWI: 0-50 (extreme conditions may reach 100+)

### Common Issues and Solutions

**Issue 1: FFMC > 101**
- Cause: Calculation error or invalid input weather
- Solution: Check weather data quality, verify starting FFMC ≤ 101

**Issue 2: Negative DMC or DC**
- Cause: Invalid starting values or corrupted precipitation data
- Solution: Verify starting codes are positive, check precip values

**Issue 3: ISI Extremely High (> 100)**
- Cause: Very high wind speeds combined with very high FFMC
- Solution: Verify wind speed data (may be valid in extreme events)

**Issue 4: FWI Not Responding to Weather Changes**
- Cause: Starting codes may be stale or weather data has gaps
- Solution: Use appropriate starting codes, verify weather file completeness

---

## Operational Best Practices

### 1. Source Reliable Starting FWI Codes

**Recommended Sources**:
- **CWFIS (Canada)**: https://cwfis.cfs.nrcan.gc.ca - Daily FWI grids
- **SpotWX API**: Provides FWI values in forecast data
- **Provincial/State Fire Agencies**: Often maintain FWI observation networks

### 2. Use Consistent Methods

**WISE Operational Standard** (from Franco's production code):
- HFFMC Method: **LAWSON**
- HFFMC Value: **94.0**
- HFFMC Hour: **17** (5:00 PM local time)
- This combination validated for operational Canadian fire modeling

### 3. Validate Weather Data Before Modeling

**Pre-Flight Checks**:
```typescript
function validateWeatherStream(weatherFile, startDate, endDate) {
    // 1. Check file exists and is readable
    // 2. Parse all rows successfully
    // 3. Verify hourly continuity (no gaps)
    // 4. Check value ranges (temp, RH, WS, precip)
    // 5. Confirm coverage of [startDate, endDate]
    // 6. Return validation status
}
```

### 4. Document Starting Code Sources

**Metadata to Preserve**:
- Source of starting FFMC, DMC, DC (observation station, climatology, spin-up)
- Date/time of starting codes
- Any adjustments made to codes
- Rationale for HFFMC settings

### 5. Understand Seasonal Context

**Spring (April-June)**:
- Low DMC/DC from winter snow/rain
- Rapidly increasing FFMC as fuels dry
- Day length increasing (affects DMC/DC calculations)

**Summer (July-August)**:
- Peak DMC/DC values (seasonal drought accumulation)
- High FFMC common (warm, dry afternoons)
- Maximum fire danger potential

**Fall (September-October)**:
- Decreasing day length slows DMC/DC accumulation
- Variable FFMC (weather-dependent)
- DC remains high from summer

**Winter (November-March)**:
- FWI system inactive in snow-covered conditions
- Restart calculations at green-up with default starting codes

---

## Advanced Topics

### Multi-Day Simulations

When modeling fires over multiple days:
1. WISE calculates daily FWI codes at noon
2. Codes carry forward day-to-day automatically
3. Weather stream must cover all simulation days
4. No manual code updates required between days

### Multiple Weather Streams

WISE supports multiple weather stations:
```typescript
// Station 1: Main weather
let station1 = wise.addWeatherStation(49.5, -117.2);
let stream1 = station1.addWeatherStream(...);

// Station 2: Alternative weather (e.g., ridge top)
let station2 = wise.addWeatherStation(49.6, -117.1);
let stream2 = station2.addWeatherStream(...);

// Scenario uses stream1
scenario.addStationStream(station1.id, stream1.id);
```

### Weather Patches (Spatial Variation)

Weather patches override weather streams for specific areas:
- Polygon weather patches: Fixed weather within polygon
- Landscape weather patches: Modify weather globally
- Examples: Canyon wind channeling, ridge-top wind speed increase

### FWI as Output Statistic

WISE can output FWI grids:
```typescript
wise.outputs.gridFiles.push({
    statistic: GlobalStatistics.FFMC,  // or DMC, DC, ISI, BUI, FWI
    filename: "hourly_ffmc.tif",
    outputTime: scenarioEndTime
});
```

Use cases:
- Visualize spatial FWI variation
- Validate weather interpolation
- Analyze fire-weather relationships

---

## References

### Scientific Publications

1. **Van Wagner, C.E. (1987)**. Development and Structure of the Canadian Forest Fire Weather Index System. Forestry Technical Report 35. Canadian Forestry Service.

2. **Lawson, B.D., Armitage, O.B. (2008)**. Weather Guide for the Canadian Forest Fire Danger Rating System. Natural Resources Canada, Canadian Forest Service, Northern Forestry Centre, Edmonton, AB.

3. **Van Wagner, C.E. (1977)**. A method of computing fine fuel moisture content throughout the diurnal cycle. Canadian Forest Service, Petawawa Forest Experiment Station, Information Report PS-X-69.

4. **Forestry Canada (1992)**. Development and Structure of the Canadian Forest Fire Behaviour Prediction System. Information Report ST-X-3. https://cfs.nrcan.gc.ca/pubwarehouse/pdfs/10068.pdf

### WISE API Documentation

- WISE JS API: https://github.com/WISE-Developers/WISE_JS_API
- FWI Module Reference: `/examples/example_fwi.js`
- Weather Stream Configuration: `WeatherStation.addWeatherStream()`

### Operational Resources

- **CWFIS**: Canadian Wildfire Information System - https://cwfis.cfs.nrcan.gc.ca
- **CFFDRS**: Canadian Forest Fire Danger Rating System - Background materials
- **SpotWX**: Weather forecast API with FWI calculations

---

## Appendix: FWI Calculation Examples

### Example 1: Daily FWI from Weather Observations

**Input Weather (Noon, July 15)**:
- Temperature: 28°C
- Relative Humidity: 30%
- Wind Speed: 20 km/h
- Precipitation: 0.0 mm

**Previous Day Codes (July 14)**:
- FFMC: 87.2
- DMC: 42.8
- DC: 315.6

**Calculation** (via WISE FWI module):
```typescript
let fwi = new fwi.FwiCalculations();
fwi.date = "2024-07-15 12:00:00";
fwi.location = new LatLon(62.5, -114.3); // Yellowknife
fwi.noonTemp = 28.0;
fwi.noonRh = 30;
fwi.noonWindSpeed = 20;
fwi.noonPrecip = 0.0;
fwi.ystrdyFFMC = 87.2;
fwi.ystrdyDMC = 42.8;
fwi.ystrdyDC = 315.6;

await fwi.FWICalculateDailyStatisticsPromise();

// Results:
// fwi.calc_dailyFfmc  → 91.3
// fwi.calc_dailyDmc   → 46.7
// fwi.calc_dailyDc    → 323.4
// fwi.calc_dailyIsi   → 11.8
// fwi.calc_dailyBui   → 67.2
// fwi.calc_dailyFwi   → 28.3 (Very High fire danger)
```

### Example 2: Hourly FFMC Adjustment

**Input Weather (Hour 09:00, July 15)**:
- Temperature: 22°C
- Relative Humidity: 45%
- Wind Speed: 12 km/h
- Precipitation: 0.0 mm

**Configuration**:
- HFFMC Method: LAWSON
- HFFMC Value: 94.0
- HFFMC Hour: 17
- Previous Hour FFMC: 85.2

**Calculation**:
```typescript
fwi.temp = 22;
fwi.rh = 45;
fwi.windSpeed = 12;
fwi.precip = 0.0;
fwi.prevHourFFMC = 85.2;
fwi.hourlyMethod = fwi.FWICalculationMethod.LAWSON;

await fwi.FWICalculateDailyStatisticsPromise();

// Results:
// fwi.calc_hourlyFfmc  → 87.6 (fuels drying toward afternoon peak)
// fwi.calc_hourlyIsi   → 6.2
// fwi.calc_hourlyFwi   → 18.4
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Target Audience**: Fire modeling specialists, WISE integrators, Project Nomad developers
