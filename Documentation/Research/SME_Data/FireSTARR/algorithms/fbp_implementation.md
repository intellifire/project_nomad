# FBP Implementation

## Overview

FireSTARR implements the Canadian Fire Behaviour Prediction (FBP) System as defined in ST-X-3 (Forestry Canada 1992) and GLC-X-10 (Wotton et al. 2009). The implementation uses template-based fuel types with pre-computed lookup tables for performance.

## Fuel Type Hierarchy

### Class Structure

```
FuelType (abstract base)
 └── StandardFuel<FuelTypeInfo> (template)
      ├── FuelConifer (C1-C7)
      ├── FuelDeciduous (D1, D2)
      ├── FuelMixed (M1-M4)
      ├── FuelSlash (S1-S3)
      └── FuelGrass (O1a, O1b)
```

### Fuel Types Implemented

| Code | Name | Category | Key Characteristics |
|------|------|----------|---------------------|
| C-1 | Spruce-Lichen Woodland | Conifer | Low density, lichen understory |
| C-2 | Boreal Spruce | Conifer | Dense conifer, high crowning potential |
| C-3 | Mature Jack/Lodgepole Pine | Conifer | Moderate density |
| C-4 | Immature Jack/Lodgepole Pine | Conifer | Dense regeneration |
| C-5 | Red/White Pine | Conifer | Open canopy, low crowning |
| C-6 | Conifer Plantation | Conifer | Dense plantation, special RSC calculation |
| C-7 | Ponderosa Pine/Douglas Fir | Conifer | Open forest, duff layer |
| D-1 | Leafless Aspen | Deciduous | Spring/fall (no leaves) |
| D-2 | Green Aspen | Deciduous | Summer (full canopy) |
| M-1 | Boreal Mixedwood - Leafless | Mixed | Conifer-deciduous blend (spring/fall) |
| M-2 | Boreal Mixedwood - Green | Mixed | Conifer-deciduous blend (summer) |
| M-3 | Dead Balsam Fir Mixedwood - Leafless | Mixed | Beetle-killed stands |
| M-4 | Dead Balsam Fir Mixedwood - Green | Mixed | Beetle-killed stands |
| S-1 | Jack/Lodgepole Pine Slash | Slash | Fresh logging debris |
| S-2 | White Spruce/Balsam Slash | Slash | Fresh logging debris |
| S-3 | Coastal Cedar/Hemlock Slash | Slash | Coastal logging debris |
| O-1a | Matted Grass | Grass | Dead matted grass |
| O-1b | Standing Grass | Grass | Standing dead grass |

### Variable Fuel Types

Some fuels transition based on conditions:

| Variable | Leafless | Green | Transition Trigger |
|----------|----------|-------|-------------------|
| D-1/D-2 | D-1 | D-2 | Greenup date (nd >= 0) |
| M-1/M-2 | M-1 | M-2 | Greenup date |
| M-3/M-4 | M-3 | M-4 | Greenup date |
| O-1a/O-1b | - | - | Curing percentage |

## Rate of Spread (ROS) Calculation

### Basic ROS Equation (ST-X-3 Eq. 26)

```
ROS = a * (1 - exp(-b * ISI))^c
```

### ISI-Based ROS Parameters (ST-X-3 Table 6)

| Fuel | a | b | c | BUI₀ | q |
|------|---|---|---|------|---|
| C-1 | 90 | 0.0649 | 4.5 | 72 | 0.90 |
| C-2 | 110 | 0.0282 | 1.5 | 64 | 0.70 |
| C-3 | 110 | 0.0444 | 3.0 | 62 | 0.75 |
| C-4 | 110 | 0.0293 | 1.5 | 66 | 0.80 |
| C-5 | 30 | 0.0697 | 4.0 | 56 | 0.80 |
| C-6 | 30 | 0.0800 | 3.0 | 62 | 0.80 |
| C-7 | 45 | 0.0305 | 2.0 | 106 | 0.85 |
| D-1 | 30 | 0.0232 | 1.6 | 32 | 0.90 |
| M-1 | - | - | - | 50 | 0.80 |
| M-2 | - | - | - | 50 | 0.80 |
| M-3 | - | - | - | 50 | 0.80 |
| M-4 | - | - | - | 50 | 0.80 |
| S-1 | 75 | 0.0297 | 1.3 | 38 | 0.75 |
| S-2 | 40 | 0.0438 | 1.7 | 63 | 0.75 |
| S-3 | 55 | 0.0829 | 3.2 | 31 | 0.75 |
| O-1a | 190 | 0.0310 | 1.4 | 1 | 1.00 |
| O-1b | 250 | 0.0350 | 1.7 | 1 | 1.00 |

### BUI Effect (ST-X-3 Eq. 54)

```
BUI_Effect = exp(50 * ln(q) * (1/BUI - 1/BUI₀))
```

Where:
- **q**: Proportion of maximum ROS at BUI = BUI₀
- **BUI₀**: Reference BUI value for fuel type

Applied as: `ROS_adjusted = ROS * BUI_Effect`

### Mixedwood ROS Calculation

For M-1 through M-4, ROS is a weighted blend:

```
RSI_M = PC/100 * RSI_C2 + (100-PC)/100 * RSI_D1

Where:
- PC = Percent conifer (0-100)
- RSI_C2 = ROS from C-2 fuel calculations
- RSI_D1 = ROS from D-1 fuel calculations
```

### Grass ROS (GLC-X-10 Eq. 35a/35b)

For O-1a and O-1b fuels:

```
If curing < 58.8%:
  CF = 0.005 * (exp(0.061 * curing) - 1)
Else:
  CF = 0.176 + 0.02 * (curing - 58.8)

ROS = a * ((1 - exp(-b * ISI))^c) * CF
```

**Grass Curing Determination:**

```
If DC > 500:
  curing = 100%
Else if nd >= 30 (days from greenup):
  curing = 100%
Else:
  curing = 35 + 1.5 * (30 - nd)
```

## Surface Fuel Consumption (SFC)

### Calculation Methods by Fuel Type

#### BUI-Based SFC (C-2, M-1/M-2, D-1)

```
SFC = 5.0 * (1 - exp(-0.0115 * BUI))
```

#### D-1 Specific

```
SFC = 1.5 * (1 - exp(-0.0183 * BUI))
```

#### C-1 (FFMC Threshold)

```
If FFMC > 84:
  SFC = 0.75 + 0.75 * sqrt(1 - exp(-0.23 * (FFMC - 84)))
Else:
  SFC = 0.75 - 0.75 * sqrt(1 - exp(0.23 * (FFMC - 84)))
```

#### C-7 (Dual Component)

```
SFC_ff = 2.0 * (1 - exp(-0.104 * (FFMC - 70)))  // Forest floor (if FFMC > 70)
SFC_woody = 1.5 * (1 - exp(-0.0201 * BUI))       // Woody material
SFC = SFC_ff + SFC_woody
```

#### Slash Fuels (S-1, S-2, S-3)

```
SFC = Forest_Floor_Component + Woody_Component

Where components vary by fuel type and are BUI-dependent
```

## Crown Fire Calculations

### Critical Surface Fire Intensity (CSI) (ST-X-3 Eq. 56)

```
CSI = 0.001 * CBH^1.5 * (460 + 25.9 * FMC)^1.5
```

Where:
- **CBH**: Crown Base Height (m)
- **FMC**: Foliar Moisture Content (%)

### Crown Base Height by Fuel

| Fuel | CBH (m) | CFL (kg/m²) |
|------|---------|-------------|
| C-1 | 2.0 | 0.75 |
| C-2 | 3.0 | 0.80 |
| C-3 | 8.0 | 1.15 |
| C-4 | 4.0 | 1.20 |
| C-5 | 18.0 | 1.20 |
| C-6 | 7.0 | 1.80 |
| C-7 | 10.0 | 0.50 |

### Foliar Moisture Content (FMC)

```
If nd < 0:
  FMC = 85 + 0.0189 * nd²
Else if nd >= 0 and nd < 30:
  FMC = 85 - 0.0189 * nd²
Else if nd >= 30 and nd < 50:
  FMC = 120
Else:
  FMC = 120 - 25 * (nd - 50) / (season_length - 50)
```

Where **nd** = days from minimum foliar moisture date.

### Critical ROS (RSO) (ST-X-3 Eq. 57)

```
RSO = CSI / (300 * SFC)
```

### Crown Fraction Burned (CFB) (ST-X-3 Eq. 58)

```
If ROS > RSO:
  CFB = 1 - exp(-0.230 * (ROS - RSO))
Else:
  CFB = 0
```

### Crown Fire Spread Rate (RSC) (ST-X-3 Eq. 64)

```
RSC = 60 * (1 - exp(-0.0497 * ISI)) * FME
```

Where **FME** (Foliar Moisture Effect):
```
FME = 1000 * (1.5 - 0.00275 * FMC)^4 / (460 + 25.9 * FMC)
```

### Final ROS with Crown Fire

For standard fuels:
```
ROS_final = ROS + CFB * (RSC - ROS)
```

For C-6 (Conifer Plantation):
```
ROS_final = RSC  (pure crown fire if CFB > 0)
```

### Fire Type Classification

| CFB Range | Fire Type |
|-----------|-----------|
| CFB < 0.1 | Surface Fire |
| 0.1 <= CFB < 0.9 | Intermittent Crown Fire |
| CFB >= 0.9 | Continuous Crown Fire |

## Fuel Consumption

### Crown Fuel Consumption (CFC) (ST-X-3 Eq. 66)

```
CFC = CFL * CFB
```

Where **CFL** = Crown Fuel Load (kg/m²)

### Total Fuel Consumption (TFC)

```
TFC = SFC + CFC
```

### Fire Intensity (ST-X-3 Eq. 69)

```
I = 300 * TFC * ROS
```

Where:
- **I**: Fire intensity (kW/m)
- **TFC**: Total Fuel Consumption (kg/m²)
- **ROS**: Rate of Spread (m/min)

## Duff and Smoldering

### Duff Layer Structure

FireSTARR models duff (organic layer) for fire survival calculations.

**Duff Types:**

| Type | Description | Bulk Density | Inorganic % | Depth (cm) |
|------|-------------|--------------|-------------|------------|
| Peat | Standard peat | 0.07 | 5.0 | 30.0 |
| Feathermoss | Feathermoss layer | 0.03 | 2.0 | 10.0 |
| Reindeer Lichen | Lichen mat | 0.02 | 0.5 | 8.0 |
| Sphagnum | Sphagnum moss | 0.04 | 1.0 | 20.0 |
| White Spruce | Under spruce | 0.06 | 4.0 | 15.0 |
| Lower Duff | Decomposed layer | 0.08 | 6.0 | 12.0 |
| Compact Duff | Highly decomposed | 0.10 | 8.0 | 8.0 |
| Fibric Peat | Surface peat | 0.05 | 3.0 | 25.0 |

### Probability of Fire Survival (Anderson Eq. 1)

For peat-based fuels:
```
P_survival = 1 / (1 + exp(a + b*MC))
```

Where:
- **MC**: Moisture content (%)
- **a, b**: Frandsen coefficients for duff type

### Fuel-Duff Assignments

Fuels have FFMC and DMC duff layer assignments:

| Fuel | FFMC Duff | DMC Duff | Depth Ratio |
|------|-----------|----------|-------------|
| C-1 | Reindeer Lichen | Feathermoss | 1.2 / total |
| C-2 | Feathermoss | Peat | 1.2 / total |
| C-7 | Lower Duff | Compact Duff | 1.2 / total |

## Length-to-Breadth Ratio

### Standard Formula (ST-X-3 Eq. 79)

```
LB = 1.0 + 8.729 * (1.0 - exp(-0.030 * WS))^2.155
```

Where **WS** = wind speed (km/h)

### Grass-Specific Formula

```
LB = 1.1 * (3.6 * WS)^0.464
```

**Behavior:**
- L:B = 1.0 at zero wind (circular fire)
- L:B increases with wind speed (more elongated ellipse)
- Maximum practical L:B ~8-9 at high wind speeds

## Lookup Table Implementation

FireSTARR uses compile-time lookup tables for performance:

```cpp
template<typename FuelInfo>
class StandardFuel : public FuelType {
  // Pre-computed lookup tables
  static constexpr array<MathSize, 256> ros_table = {...};
  static constexpr array<MathSize, 256> sfc_table = {...};
  static constexpr array<MathSize, 256> cfb_table = {...};
};
```

This eliminates exponential calculations at runtime for most fuel properties.

## References

1. Forestry Canada (1992). Development and Structure of the Canadian Forest Fire Behaviour Prediction System (ST-X-3)
2. Wotton et al. (2009). Updates and Revisions to the 1992 CFBPS (GLC-X-10)
3. Anderson, K. et al. (2015). Probability of fire survival in peat
4. Frandsen, W.H. (1997). Ignition probability of organic soils
