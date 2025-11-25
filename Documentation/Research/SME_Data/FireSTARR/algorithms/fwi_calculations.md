# FWI Calculations

## Overview

FireSTARR implements the complete Canadian Forest Fire Weather Index (FWI) System as described in Van Wagner (1987). The system calculates six indices from weather observations: three moisture codes (FFMC, DMC, DC) and three fire behavior indices (ISI, BUI, FWI).

## System Architecture

```
Weather Observations (12:00 LST)
├── Temperature (°C)
├── Relative Humidity (%)
├── Wind Speed (km/h)
└── Precipitation (mm, 24-hr)
           │
           ▼
┌──────────────────────────────────────────────────┐
│              Moisture Codes                       │
│  ┌──────┐    ┌──────┐    ┌──────┐               │
│  │ FFMC │    │ DMC  │    │  DC  │               │
│  │ Fine │    │ Duff │    │Drought               │
│  │ Fuel │    │Moisture   │ Code │               │
│  └──┬───┘    └──┬───┘    └──┬───┘               │
│     │           └─────┬─────┘                    │
│     │                 │                          │
│     ▼                 ▼                          │
│  ┌──────┐        ┌──────┐                       │
│  │ ISI  │        │ BUI  │                       │
│  │Initial        │Build-│                       │
│  │Spread │       │ up   │                       │
│  └──┬───┘        └──┬───┘                       │
│     └──────┬────────┘                           │
│            ▼                                     │
│        ┌──────┐                                 │
│        │ FWI  │                                 │
│        │Fire  │                                 │
│        │Weather                                 │
│        └──┬───┘                                 │
│           ▼                                      │
│        ┌──────┐                                 │
│        │ DSR  │                                 │
│        │Daily │                                 │
│        │Severity                                │
│        └──────┘                                 │
└──────────────────────────────────────────────────┘
```

## Fine Fuel Moisture Code (FFMC)

The FFMC represents moisture content of fine surface fuels (litter, fine dead fuels).

### Daily FFMC Calculation

**Input:** Temperature, RH, Wind Speed, Precipitation, Previous Day FFMC

#### Step 1: Convert FFMC to Moisture Content (Eq. 1)

```
mo = 147.2759 * (101 - FFMC) / (59.5 + FFMC)
```

**Constant:** `FFMC_MOISTURE_CONSTANT = 250.0 * 59.5 / 101.0 = 147.2759`

#### Step 2: Precipitation Adjustment (Eq. 2-3)

If precipitation > 0.5 mm:

```
rf = precip - 0.5                                    (Eq. 2)
mr = mo + 42.5 * rf * exp(-100/(251-mo)) * (1 - exp(-6.93/rf))   (Eq. 3a)

If mo > 150:
  mr = mr + 0.0015 * (mo - 150)² * sqrt(rf)          (Eq. 3b)

mr = min(mr, 250.0)
mo = mr
```

#### Step 3: Equilibrium Moisture Content (Eq. 4-9)

**Drying Equilibrium (ed):**
```
ed = 0.942 * RH^0.679 + 11.0 * exp((RH-100)/10) + 0.18 * (21.1-T) * (1-exp(-0.115*RH))
```

**Wetting Equilibrium (ew):**
```
ew = 0.618 * RH^0.753 + 10.0 * exp((RH-100)/10) + 0.18 * (21.1-T) * (1-exp(-0.115*RH))
```

**Drying Phase** (if mo > ed):
```
ko = 0.424 * (1-(RH/100)^1.7) + 0.0694 * sqrt(WS) * (1-(RH/100)^8)
kd = ko * 0.581 * exp(0.0365 * T)
m = ed + (mo - ed) * 10^(-kd)
```

**Wetting Phase** (if mo < ew):
```
kl = 0.424 * (1-((100-RH)/100)^1.7) + 0.0694 * sqrt(WS) * (1-((100-RH)/100)^8)
kw = kl * 0.581 * exp(0.0365 * T)
m = ew - (ew - mo) * 10^(-kw)
```

#### Step 4: Convert Back to FFMC (Eq. 10)

```
FFMC = 59.5 * (250 - m) / (147.2759 + m)
```

### Hourly FFMC (Diurnal Calculation)

FireSTARR extends daily FFMC to hourly values using polynomial fitting functions.

**Wind Speed Adjustment by Hour:**

```
Hour:  00   01   02   03   04   05   06   07
Mult: .570 .565 .563 .563 .564 .581 .642 .725

Hour:  08   09   10   11   12   13   14   15
Mult: .808 .880 .936 .977 1.00 1.008 .999 .973

Hour:  16   17   18   19   20   21   22   23
Mult: .915 .831 .724 .631 .593 .586 .584 .579
```

**FFMC Interpolation Methods:**

| Time Range | Method |
|------------|--------|
| 12:00-20:00 | Time-specific polynomial functions |
| 06:00-11:00 | RH-dependent three-curve family |
| 00:00-05:00 | Linear interpolation (20:00→06:00) |

## Duff Moisture Code (DMC)

The DMC represents moisture content of loosely compacted organic layers.

### Daily DMC Calculation (Eq. 11-17)

**Input:** Temperature, RH, Precipitation, Previous DMC, Month, Latitude

#### Step 1: Precipitation Adjustment (if precip > 1.5 mm)

```
re = 0.92 * precip - 1.27                            (Eq. 11)
mo = 20 + 280 / exp(0.023 * previous_DMC)            (Eq. 12)

b calculation based on previous_DMC:
  If previous <= 33:
    b = 100 / (0.5 + 0.3 * previous)                 (Eq. 13a)
  Else if previous <= 65:
    b = 14 - 1.3 * ln(previous)                      (Eq. 13b)
  Else:
    b = 6.2 * ln(previous) - 17.2                    (Eq. 13c)

mr = mo + 1000 * re / (48.77 + b * re)               (Eq. 14)
pr = 43.43 * (5.6348 - ln(mr - 20))                  (Eq. 15)
previous = max(pr, 0)
```

#### Step 2: Drying Phase (Eq. 16-17)

```
If temperature > -1.1°C:
  k = 1.894 * (T + 1.1) * (100 - RH) * day_length * 0.0001   (Eq. 16)
Else:
  k = 0

DMC = previous + k                                   (Eq. 17)
```

### Day Length Factors for DMC

| Latitude Zone | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---------------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 33°N - 90°N | 6.5 | 7.5 | 9.0 | 12.8 | 13.9 | 13.9 | 12.4 | 10.9 | 9.4 | 8.0 | 7.0 | 6.0 |
| 15°N - 33°N | 7.9 | 8.4 | 8.9 | 9.5 | 9.9 | 10.2 | 10.1 | 9.7 | 9.1 | 8.6 | 8.1 | 7.8 |
| 15°S - 15°N | 9.0 | 9.0 | 9.0 | 9.0 | 9.0 | 9.0 | 9.0 | 9.0 | 9.0 | 9.0 | 9.0 | 9.0 |
| 30°S - 15°S | 10.1 | 9.6 | 9.1 | 8.5 | 8.1 | 7.8 | 7.9 | 8.3 | 8.9 | 9.4 | 9.9 | 10.2 |
| 90°S - 30°S | 11.5 | 10.5 | 9.2 | 7.9 | 6.8 | 6.2 | 6.5 | 7.4 | 8.7 | 10.0 | 11.2 | 11.8 |

## Drought Code (DC)

The DC represents moisture content of deep compact organic layers.

### Daily DC Calculation (Eq. 18-23)

**Input:** Temperature, Precipitation, Previous DC, Month, Latitude

#### Step 1: Precipitation Adjustment (if precip > 2.8 mm)

```
rd = 0.83 * precip - 1.27                            (Eq. 18)
qo = 800 * exp(-previous_DC / 400)                   (Eq. 19)
qr = qo + 3.937 * rd                                 (Eq. 20)
dr = 400 * ln(800 / qr)                              (Eq. 21)
previous = max(dr, 0)
```

#### Step 2: Drying Phase (Eq. 22-23)

```
lf = day_length_factor(latitude, month)

If temperature > -2.8°C:
  v = 0.36 * (T + 2.8) + lf                          (Eq. 22)
Else:
  v = lf

v = max(0, v)
DC = previous + 0.5 * v                              (Eq. 23)
```

### Day Length Factors for DC

| Latitude Zone | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---------------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| > 15°N | -1.6 | -1.6 | -1.6 | 0.9 | 3.8 | 5.8 | 6.4 | 5.0 | 2.4 | 0.4 | -1.6 | -1.6 |
| 15°S - 15°N | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 |
| <= -15°S | 6.4 | 5.0 | 2.4 | 0.4 | -1.6 | -1.6 | -1.6 | -1.6 | -1.6 | 0.9 | 3.8 | 5.8 |

## Initial Spread Index (ISI)

The ISI combines wind speed and FFMC to indicate fire spread potential.

### ISI Calculation (Eq. 24-26)

```
f_wind = exp(0.05039 * WS)                           (Eq. 24)

mc = ffmc_to_moisture(FFMC)
f_F = 91.9 * exp(-0.1386 * mc) * (1 + mc^5.31 / 49300000)   (Eq. 25)

ISI = 0.208 * f_wind * f_F                           (Eq. 26)
```

**Key Constants:**
- Wind coefficient: 0.05039
- FFMC effect base: 91.9
- Moisture decay rate: -0.1386
- High moisture power: 5.31
- High moisture divisor: 49,300,000

## Build-up Index (BUI)

The BUI combines DMC and DC to indicate total fuel available for combustion.

### BUI Calculation (Eq. 27a-27b)

```
If DMC <= 0.4 * DC:
  If DC == 0:
    BUI = 0
  Else:
    BUI = max(0, 0.8 * DMC * DC / (DMC + 0.4 * DC))  (Eq. 27a)
Else:
  BUI = max(0, DMC - (1 - 0.8 * DC / (DMC + 0.4 * DC)) * (0.92 + (0.0114 * DMC)^1.7))  (Eq. 27b)
```

**Physical Interpretation:**
- Eq. 27a: Fuel-limited conditions (DMC small relative to DC)
- Eq. 27b: Moisture-dominated conditions (DMC large)

## Fire Weather Index (FWI)

The FWI combines ISI and BUI to provide a single fire intensity indicator.

### FWI Calculation (Eq. 28a-30b)

```
BUI Effect:
  If BUI <= 80:
    f_D = 0.626 * BUI^0.809 + 2.0                    (Eq. 28a)
  Else:
    f_D = 1000 / (25 + 108.64 * exp(-0.023 * BUI))   (Eq. 28b)

Intermediate value:
  B = 0.1 * ISI * f_D                                (Eq. 29)

Final FWI:
  If B > 1.0:
    FWI = exp(2.72 * (0.434 * ln(B))^0.647)          (Eq. 30a)
  Else:
    FWI = B                                           (Eq. 30b)
```

## Daily Severity Rating (DSR)

The DSR scales FWI to represent potential fire control difficulty.

### DSR Calculation (Eq. 41)

```
DSR = 0.0272 * FWI^1.77
```

## Moisture Content Conversions

### FFMC to Moisture

```
mc_pct = 147.2759 * (101 - FFMC) / (59.5 + FFMC)
mc_ratio = mc_pct / 100
```

### DMC to Moisture

```
mc_pct = exp((DMC - 244.72) / -43.43) + 20
mc_ratio = mc_pct / 100
```

## FwiWeather Data Structure

```cpp
struct FwiWeather : public Weather {
  // Inherited weather
  Temperature temperature;    // °C
  RelativeHumidity rh;       // %
  Wind wind;                  // direction (°) and speed (km/h)
  Precipitation prec;         // mm

  // FWI indices
  Ffmc ffmc;                  // Fine Fuel Moisture Code
  Dmc dmc;                    // Duff Moisture Code
  Dc dc;                      // Drought Code
  Isi isi;                    // Initial Spread Index
  Bui bui;                    // Build-up Index
  Fwi fwi;                    // Fire Weather Index

  // Moisture queries
  MathSize mcFfmcPct() const; // FFMC-based moisture %
  MathSize mcDmcPct() const;  // DMC-based moisture %
  MathSize ffmcEffect() const; // FFMC spread effect (Eq. 25)
};
```

## Calculation Chain Summary

1. **Daily Inputs** (12:00 LST observations)
2. **Moisture Codes:**
   - FFMC ← T, RH, WS, Precip, FFMC_prev
   - DMC ← T, RH, Precip, DMC_prev, Month, Latitude
   - DC ← T, Precip, DC_prev, Month, Latitude
3. **Fire Behavior Indices:**
   - ISI ← WS, FFMC
   - BUI ← DMC, DC
   - FWI ← ISI, BUI
4. **Severity Rating:**
   - DSR ← FWI

## Hourly Extension

For hourly simulations:

| Component | Hourly Treatment |
|-----------|-----------------|
| Wind Speed | Adjusted by hour multiplier (0.563-1.008) |
| FFMC | Interpolated using time-of-day polynomials |
| DMC, DC | Constant throughout day |
| ISI | Recalculated from hourly FFMC and wind |
| BUI | Constant (daily value) |
| FWI | Recalculated from hourly ISI |

## References

1. Van Wagner, C.E. (1987). Development and structure of the Canadian Forest Fire Weather Index System. Canadian Forest Service, For. Tech. Rep. 35.
2. Wotton, B.M. (2009). Interpreting and using outputs from the Canadian Forest Fire Danger Rating System in research applications. Environmental and Ecological Statistics.
3. Lawson, B.D. & Armitage, O.B. (2008). Weather guide for the Canadian Forest Fire Danger Rating System. Natural Resources Canada.
