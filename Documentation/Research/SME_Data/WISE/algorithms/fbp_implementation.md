# Canadian Forest Fire Behavior Prediction (FBP) System Implementation in WISE

## Executive Summary

The Canadian Forest Fire Behavior Prediction (FBP) System is the core fire behavior calculation engine within WISE. It provides empirically-derived equations for predicting fire spread rates, intensities, fuel consumption, and crown fire behavior across 18 standardized fuel types representing Canadian forest and grassland ecosystems. This document details the FBP system implementation within WISE, including the mathematical foundations, fuel type specifications, calculation procedures, and integration architecture.

## FBP System Overview

### Historical Development

The FBP System was developed by the Canadian Forest Service as part of the Canadian Forest Fire Danger Rating System (CFFDRS). Published in 1992 as Forestry Canada publication ST-X-3, it synthesizes decades of experimental fire research and operational fire observations into a practical prediction system.

**Key Characteristics:**
- **Empirical Foundation**: Based on thousands of experimental fires and wildfire observations
- **Fuel Type Framework**: 18 standard fuel types covering Canadian vegetation
- **Operational Focus**: Designed for real-time fire management decisions
- **Integration**: Works with Fire Weather Index (FWI) system for complete fire danger assessment
- **Validation**: Extensively validated across Canadian fire management agencies

### FBP System Inputs

The FBP system requires 14 primary input parameters organized into 5 categories:

#### 1. Fuel Type Parameters
- **Primary Fuel Type**: One of 18 standard FBP fuel types (C-1 through O-1b)
- **Crown Base Height (CBH)**: Height to live crown base (meters) - required for C, M, D fuel types
- **Percent Conifer (PC)**: Conifer composition in mixedwood stands (%) - required for M-1, M-2, M-1/M-2
- **Percent Dead Fir (PDF)**: Dead balsam fir composition (%) - required for M-3, M-4, M-3/M-4
- **Grass Curing**: Degree of grass curing (%) - required for O-1a, O-1b, O-1AB
- **Grass Fuel Load**: Grass fuel loading (kg/m²) - required for O-1a, O-1b, O-1AB

#### 2. Fire Weather Index (FWI) Components
- **Fine Fuel Moisture Code (FFMC)**: Fine fuel moisture indicator (range: 0-101)
- **Duff Moisture Code (DMC)**: Moderate-depth organic layer moisture (range: 0-∞, typically 0-200)
- **Drought Code (DC)**: Deep organic layer moisture (range: 0-∞, typically 0-1000)
- **Initial Spread Index (ISI)**: Fire spread potential combining FFMC and wind
- **Buildup Index (BUI)**: Fuel availability combining DMC and DC

#### 3. Weather Parameters
- **Wind Speed**: 10-meter open wind speed (km/h)
- **Wind Direction**: Direction wind is coming FROM (degrees, 0-360)
- **Temperature**: Air temperature (°C) - affects FMC calculations
- **Relative Humidity**: Percent relative humidity (%) - affects FMC calculations

#### 4. Topographic Parameters
- **Slope**: Ground slope percent or degrees
- **Aspect**: Slope aspect direction (degrees, 0-360)
- **Elevation**: Ground elevation (meters) - affects atmospheric conditions

#### 5. Temporal and Location Parameters
- **Date/Time**: Ignition date and time for foliar moisture calculations
- **Latitude/Longitude**: Geographic location for solar calculations
- **Elapsed Time**: Time since ignition (minutes)

### FBP System Outputs

The FBP system produces comprehensive fire behavior predictions:

#### Primary Spread Rates
- **ROS_t**: Head fire rate of spread after elapsed time t (m/min)
- **ROS_eq**: Equilibrium rate of spread (m/min)
- **FROS**: Flank fire rate of spread (m/min)
- **BROS**: Back fire rate of spread (m/min)

#### Fire Intensity Metrics
- **HFI**: Head Fire Intensity (kW/m)
- **FFI**: Flank Fire Intensity (kW/m)
- **BFI**: Back Fire Intensity (kW/m)
- **CSI**: Critical Surface Fire Intensity for crown fire initiation (kW/m)
- **RSO**: Critical Surface Fire Rate of Spread (m/min)

#### Crown Fire Parameters
- **CFB**: Crown Fraction Burned (proportion, 0-1)
- **CFC**: Crown Fuel Consumption (kg/m²)
- **FMC**: Foliar Moisture Content (%)
- **Fire Type**: Surface, Intermittent Crown, or Active Crown

#### Fuel Consumption
- **SFC**: Surface Fuel Consumption (kg/m²)
- **TFC**: Total Fuel Consumption (kg/m²)
- **CFC**: Crown Fuel Consumption (kg/m²)

#### Fire Shape and Growth
- **Area**: Elliptical fire area (hectares)
- **Perimeter**: Fire perimeter length (meters)
- **LB**: Length-to-Breadth Ratio (dimensionless)
- **Distance Head**: Distance traveled by head fire (meters)
- **Distance Flank**: Distance traveled by flank (meters)
- **Distance Back**: Distance traveled by back fire (meters)

#### Derived Parameters
- **ISI**: Final Initial Spread Index accounting for wind and slope
- **WSV**: Net vectored wind speed (km/h)
- **RAZ**: Rate of spread azimuth - spread direction (degrees)
- **Fire Description**: Text classification of fire behavior

## The 18 Standard Fuel Types

### Fuel Type Classification System

The FBP system organizes fuel types into 5 broad groups representing major Canadian vegetation communities:

| Group | Code Range | Description | Fire Characteristics |
|-------|------------|-------------|---------------------|
| **Coniferous (C)** | C-1 to C-7 | Closed-canopy conifer forests | Fast spread, high intensity, crown fire potential |
| **Deciduous (D)** | D-1 to D-2 | Leafless and green aspen/deciduous | Seasonal variation, moderate spread |
| **Mixedwood (M)** | M-1 to M-4 | Mixed conifer-deciduous stands | Complex behavior, influenced by composition |
| **Slash (S)** | S-1 to S-3 | Post-harvest logging residues | Very high intensity, rapid spread |
| **Open (O)** | O-1a, O-1b | Grass and herbaceous fuels | Fast spread, low intensity, curing-dependent |

### Detailed Fuel Type Descriptions

#### Coniferous Fuel Types (C-1 through C-7)

**C-1: Spruce-Lichen Woodland**
- **Description**: Open spruce woodland with continuous lichen ground cover
- **Stand Characteristics**:
  - Tree height: 5-15 m
  - Crown base height: 2 m
  - Crown fuel load: 0.75 kg/m²
- **Fire Behavior**:
  - Moderate spread rates
  - Continuous lichen mat allows sustained surface fire
  - Crown fire possible under extreme conditions
- **Geographic Range**: Boreal forest transition zones
- **Color Code**: RGB(209, 255, 115)

**C-2: Boreal Spruce**
- **Description**: Dense boreal spruce with feather moss understory
- **Stand Characteristics**:
  - Tree height: 10-20 m
  - Crown base height: 3 m
  - Crown fuel load: 1.0 kg/m²
- **Fire Behavior**:
  - Fast spread rates
  - High crown fire potential
  - Primary commercial timber type
- **Geographic Range**: Northern boreal forest
- **Color Code**: RGB(34, 102, 51)

**C-3: Mature Jack or Lodgepole Pine**
- **Description**: Mature pine stands with well-developed understory
- **Stand Characteristics**:
  - Tree height: 12-20 m
  - Crown base height: 8 m
  - Crown fuel load: 1.15 kg/m²
- **Fire Behavior**:
  - Moderate spread rates
  - High crown base reduces crown fire frequency
  - Ladder fuels critical
- **Geographic Range**: Western and central Canada
- **Color Code**: RGB(131, 199, 149)

**C-4: Immature Jack or Lodgepole Pine**
- **Description**: Young dense pine with low crown base height
- **Stand Characteristics**:
  - Tree height: 7-15 m
  - Crown base height: 4 m
  - Crown fuel load: 1.20 kg/m²
- **Fire Behavior**:
  - Fast spread rates
  - Very high crown fire potential
  - Low crown base facilitates crowning
- **Geographic Range**: Post-fire regeneration areas
- **Color Code**: RGB(112, 168, 0)

**C-5: Red and White Pine**
- **Description**: Eastern pine forests with sparse understory
- **Stand Characteristics**:
  - Tree height: 15-25 m
  - Crown base height: 12 m
  - Crown fuel load: 1.20 kg/m²
- **Fire Behavior**:
  - Slow to moderate spread
  - Surface fire dominant
  - High crown base limits crowning
- **Geographic Range**: Great Lakes region
- **Color Code**: RGB(223, 184, 230)

**C-6: Conifer Plantation**
- **Description**: Dense planted conifer stands, typically spruce
- **Stand Characteristics**:
  - Tree height: 8-15 m
  - Crown base height: 1 m (very low)
  - Crown fuel load: 1.80 kg/m²
- **Fire Behavior**:
  - Extreme fire behavior
  - Immediate crowning
  - Very high intensities
- **Geographic Range**: Plantations across Canada
- **Color Code**: RGB(172, 102, 237)

**C-7: Ponderosa Pine - Douglas-Fir**
- **Description**: Western montane conifer forests
- **Stand Characteristics**:
  - Tree height: 15-30 m
  - Crown base height: 10 m
  - Crown fuel load: 0.50 kg/m²
- **Fire Behavior**:
  - Variable spread rates
  - Surface fire with occasional torching
  - Diurnal weather influence
- **Geographic Range**: British Columbia interior
- **Color Code**: RGB(112, 12, 242)

#### Deciduous Fuel Types (D-1, D-2)

**D-1: Leafless Aspen**
- **Description**: Aspen forest during leaf-off period (spring, late fall)
- **Stand Characteristics**:
  - Tree height: 15-20 m
  - Crown base height: 6 m
  - Crown fuel load: 0.30 kg/m²
- **Fire Behavior**:
  - Moderate spread rates
  - Surface fire dominant
  - Cured grass understory drives spread
- **Seasonal Window**: Leaf-off period only
- **Color Code**: RGB(196, 189, 151)

**D-2: Green Aspen (with BUI Thresholding)**
- **Description**: Aspen forest with leaves (summer)
- **Stand Characteristics**:
  - Tree height: 15-20 m
  - Crown base height: 6 m
  - Crown fuel load: 0.35 kg/m²
- **Fire Behavior**:
  - Very low spread rates under normal conditions
  - BUI threshold (>32) indicates drought override
  - Green foliage inhibits spread
- **Special Feature**: BUI-based switching to D-1 behavior
- **Color Code**: RGB(137, 112, 68)

**D-1/D-2: Aspen (Seasonal Switch)**
- **Description**: Combined fuel type with automatic seasonal switching
- **Behavior**: Switches between D-1 and D-2 based on:
  - Calendar date (green-up/senescence timing)
  - BUI threshold for drought conditions
- **Usage**: Preferred for year-round modeling

#### Mixedwood Fuel Types (M-1 through M-4)

**M-1: Boreal Mixedwood - Leafless**
- **Description**: Mixed conifer-deciduous, deciduous leafless
- **Composition**: Variable percent conifer (PC parameter)
- **Stand Characteristics**:
  - Tree height: 15-20 m
  - Crown base height: 6 m
  - Crown fuel load: Weighted by PC
- **Fire Behavior**:
  - Behavior interpolated between C-2 and D-1
  - PC controls spread rate and intensity
  - Surface fire spreads through cured grass
- **Calculation**: Weighted combination of C-2 and D-1 equations
- **Color Code**: RGB(255, 211, 127)

**M-2: Boreal Mixedwood - Green**
- **Description**: Mixed conifer-deciduous, deciduous with leaves
- **Composition**: Variable percent conifer (PC parameter)
- **Stand Characteristics**:
  - Tree height: 15-20 m
  - Crown base height: 6 m
  - Crown fuel load: Weighted by PC
- **Fire Behavior**:
  - Behavior interpolated between C-2 and D-2
  - Green deciduous reduces spread significantly
  - Requires higher BUI for active fire
- **Calculation**: Weighted combination of C-2 and D-2 equations
- **Color Code**: RGB(255, 170, 0)

**M-1/M-2: Boreal Mixedwood (Seasonal Switch)**
- **Description**: Combined mixedwood with seasonal switching
- **Behavior**: Automatically switches between M-1 and M-2
- **Usage**: Standard operational fuel type for mixedwoods

**M-3: Dead Balsam Fir Mixedwood - Leafless**
- **Description**: Mixedwood with standing dead balsam fir
- **Composition**: Variable percent dead fir (PDF parameter)
- **Stand Characteristics**:
  - Tree height: 15-20 m
  - Crown base height: 6 m
  - Dead fir ladders increase crowning
- **Fire Behavior**:
  - Behavior between D-1 and dead fir component
  - Dead fir increases intensity
  - High crown fire potential
- **Special Hazard**: Mountain pine beetle epidemic legacy
- **Color Code**: RGB(99, 0, 0)

**M-4: Dead Balsam Fir Mixedwood - Green**
- **Description**: M-3 equivalent during green-up period
- **Composition**: Variable percent dead fir (PDF parameter)
- **Fire Behavior**:
  - Similar to M-3 but with D-2 deciduous component
  - Green foliage moderates behavior slightly
- **Color Code**: RGB(170, 0, 0)

**M-3/M-4: Dead Balsam Fir Mixedwood (Seasonal Switch)**
- **Description**: Combined dead fir mixedwood type
- **Usage**: Operational type for beetle-killed areas

#### Slash Fuel Types (S-1 through S-3)

**S-1: Jack or Lodgepole Pine Slash**
- **Description**: Fresh logging slash from pine harvest
- **Stand Characteristics**:
  - Slash depth: 0.5-1.0 m
  - Fuel load: 5-15 kg/m²
  - Fine to coarse woody debris
- **Fire Behavior**:
  - Very high intensity
  - Extremely fast spread
  - Major suppression challenge
- **Time Sensitivity**: Behavior changes as slash cures and settles
- **Color Code**: RGB(251, 190, 185)

**S-2: White Spruce - Balsam Slash**
- **Description**: Boreal spruce/fir logging residues
- **Stand Characteristics**:
  - Slash depth: 0.3-0.8 m
  - Fuel load: 4-12 kg/m²
  - High proportion of fine fuels
- **Fire Behavior**:
  - Moderate to high intensity
  - Fast spread when cured
  - Influenced by slash compaction
- **Color Code**: RGB(247, 104, 161)

**S-3: Coastal Cedar - Hemlock - Douglas-Fir Slash**
- **Description**: West coast conifer logging slash
- **Stand Characteristics**:
  - Slash depth: 0.8-1.5 m
  - Fuel load: 10-25 kg/m²
  - Large woody debris component
- **Fire Behavior**:
  - Extreme intensity
  - High heat per unit area
  - Deep burning
- **Geographic Specificity**: Coastal British Columbia
- **Color Code**: RGB(174, 1, 126)

#### Open/Grass Fuel Types (O-1a, O-1b)

**O-1a: Matted Grass**
- **Description**: Continuous grass cover, matted or standing previous year's growth
- **Stand Characteristics**:
  - Fuel load: Variable (parameter)
  - Typical: 0.3-0.5 kg/m²
  - Continuous fuel bed
- **Fire Behavior**:
  - Very fast spread
  - Low intensity
  - Highly curing-dependent
- **Critical Parameters**: Curing degree (%), fuel load
- **Color Code**: RGB(255, 255, 190)

**O-1b: Standing Grass**
- **Description**: Standing grass, typically taller than O-1a
- **Stand Characteristics**:
  - Fuel load: Variable (parameter)
  - Typical: 0.35-0.6 kg/m²
  - Vertical fuel structure
- **Fire Behavior**:
  - Faster spread than O-1a
  - Slightly higher intensity
  - Wind-driven spread
- **Color Code**: RGB(230, 230, 0)

**O-1AB: Grass (Combined)**
- **Description**: Combination of O-1a and O-1b with transition equations
- **Behavior**: Interpolates between matted and standing grass
- **Usage**: Operational type when specific grass type unknown

#### Non-Fuel Types

**Non-Fuel**: Barriers to fire spread
- Water bodies
- Rock outcrops
- Urban areas
- Agricultural fields (bare soil)
- Recently burned areas

### Fuel Type Grid Requirements

#### Spatial Data Format

**Grid File Specifications:**
- **Format**: GeoTIFF, ASCII Grid (.asc), or ERDAS Imagine (.img)
- **Cell Size**: Typically 30m-250m resolution depending on application
- **Projection**: Must match all other input grids (consistent CRS)
- **Data Type**: Integer grid values
- **No-Data Value**: Clearly defined (typically -9999 or 255)

#### Fuel Lookup Table (LUT)

The fuel lookup table is a critical component mapping integer grid values to FBP fuel type codes.

**LUT Structure (CSV format):**
```csv
grid_value,export_value,descriptive_name,fuel_type,r,g,b,h,s,l
1,1,Spruce-Lichen Woodland,C-1,209,255,115,57,255,185
2,2,Boreal Spruce,C-2,34,102,51,95,128,68
3,3,Mature Jack or Lodgepole Pine,C-3,131,199,149,96,96,165
...
```

**LUT Columns:**
- `grid_value`: Integer value in fuel grid raster
- `export_value`: Value for output grids (often same as grid_value)
- `descriptive_name`: Human-readable fuel type name
- `fuel_type`: FBP fuel type code (e.g., "C-1", "M-1", "O-1a")
- `r,g,b`: RGB color values for visualization
- `h,s,l`: HSL color values (alternative color space)

**Example LUT Mapping:**
```
Grid Value → Fuel Type → RGB Color
1 → C-1 → RGB(209,255,115) [Light green]
2 → C-2 → RGB(34,102,51)   [Dark green]
40 → M-1 → RGB(255,211,127) [Orange]
100 → Non-fuel → RGB(255,255,255) [White]
```

#### Custom Fuel Types

WISE supports user-defined fuel types beyond the standard 18 FBP types:

**Custom Fuel Definition Process:**
1. Create `FuelDefinition` object based on default fuel type
2. Override specific parameters (spread, SFC, RSI, ISF, CFB, etc.)
3. Assign unique grid index value
4. Add to fuel collection in FGMJ

**Example Custom Fuel (from wise_js_api):**
```typescript
let customFuel = new FuelDefinition("Custom_Pine", "C-3", 201);
customFuel.color = new RGBColor({red: 100, green: 150, blue: 200});
customFuel.spreadParms = new C1Spread({
    a: 95,
    b: 0.0845,
    c: 4.5,
    q: 0.9,
    bui0: 70,
    maxBe: 1.076,
    height: 12,
    cbh: 6,
    cfl: 1.1
});
```

## FBP Calculation Methodology

### Rate of Spread (ROS) Calculations

Rate of spread is the fundamental fire behavior output, representing how quickly fire advances through fuel.

#### Initial Spread Index (ISI)

ISI combines fine fuel moisture (via FFMC) and wind speed:

**ISI Calculation:**
```
m = 147.2 * (101 - FFMC) / (59.5 + FFMC)    [Fine fuel moisture content]
fW = exp(0.05039 * WS)                        [Wind function]
fF = 91.9 * exp(-0.1386 * m) * (1 + (m^5.31)/(4.93 x 10^7))  [FFMC function]
ISI = 0.208 * fW * fF
```

Where:
- FFMC = Fine Fuel Moisture Code (0-101)
- WS = Wind Speed at 10m open (km/h)
- m = Moisture content (%)

#### Buildup Index (BUI)

BUI quantifies fuel availability for combustion:

**BUI Calculation:**
```
If DMC ≤ 0.4 * DC:
    BUI = 0.8 * DMC * DC / (DMC + 0.4 * DC)
Else:
    BUI = DMC - (1 - 0.8 * DC/(DMC + 0.4 * DC)) * (0.92 + (0.0114 * DMC)^1.7)

If BUI < 0:
    BUI = 0
```

Where:
- DMC = Duff Moisture Code
- DC = Drought Code

#### Head Fire Rate of Spread (ROS)

Each fuel type has specific spread equations. General form:

**Basic ROS Equation:**
```
ROSbasic = a * (1 - exp(-b * ISI))^c
```

Where a, b, c are fuel-specific constants.

**BUI Effect:**
```
BUIeffect = exp(50 * log(q) * (1/(BUI + 1) - 1/(bui0 + 1)))
```

**Final Head Fire ROS:**
```
ROS = ROSbasic * BUIeffect
```

#### Slope and Wind Effects

**Slope Factor (SF):**
```
SF = exp(3.533 * (tan(slope))^1.2)
```

Applied as:
```
ROS_slope = ROS * SF
```

**Wind-Slope Vector:**
When both wind and slope are present, vectors are combined:
```
WSV = √[(WS * sin(WD))^2 + (WS * cos(WD) + SF * ROS)^2]
RAZ = atan2(WS * sin(WD), WS * cos(WD) + SF * ROS)
```

Where:
- WD = Wind Direction (radians)
- RAZ = Rate of spread azimuth (fire spread direction)
- WSV = Net vectored wind speed

#### Flank and Back Fire Spread

**Flank Fire Rate of Spread:**
```
FROS = ROS * LB_factor
```

Where LB_factor depends on length-to-breadth ratio.

**Back Fire Rate of Spread:**
```
BROS = 0.5 * ROS_basic / BUIeffect
```

Or fuel-specific back fire equations.

### Head Fire Intensity (HFI) Calculations

Fire intensity represents energy release rate per unit length of fire front.

**Byram's Intensity Equation:**
```
HFI = (H * w * ROS) / 60
```

Where:
- H = Heat of combustion (~18,000 kJ/kg for most wildland fuels)
- w = Fuel consumption (kg/m²)
- ROS = Rate of spread (m/min)
- 60 = Conversion factor (seconds to minutes)

**Units:** kW/m (kilowatts per meter of fire front)

**Fire Intensity Classes:**
- < 10 kW/m: Very low intensity, easy suppression
- 10-500 kW/m: Low intensity, direct attack possible
- 500-2000 kW/m: Moderate intensity, suppression difficult
- 2000-4000 kW/m: High intensity, indirect attack required
- 4000-10000 kW/m: Very high intensity, suppression usually ineffective
- > 10000 kW/m: Extreme intensity, safety concerns, major fire runs

### Crown Fraction Burned (CFB)

CFB represents the proportion of crown foliage consumed by fire.

**Critical Surface Intensity (CSI):**

Crown fire initiation threshold:
```
CSI = 0.001 * (CBH^1.5) * (460 + 25.9 * FMC)^1.5
```

Where:
- CBH = Crown Base Height (m)
- FMC = Foliar Moisture Content (%)

**Critical Surface Fire ROS:**
```
RSO = CSI / (300 * SFC)
```

Where SFC = Surface Fuel Consumption (kg/m²)

**Crown Fraction Burned Calculation:**

```
If ROS > RSO:
    CFB = 1 - exp(-0.23 * (ROS - RSO))
Else:
    CFB = 0
```

**Crown Fire Classification:**
- CFB = 0: Surface fire only
- 0 < CFB < 0.1: Intermittent crown fire (individual torching)
- CFB ≥ 0.1: Active crown fire (sustained crowning)

### Foliar Moisture Content (FMC)

FMC varies seasonally, affecting crown fire potential.

**FMC Calculation (Latitude-Date based):**
```
For latitudes 23°N to 60°N:

    D0 = Julian day of minimum FMC (location-specific, typically day 180-200)

    ND = Number of days between current date and D0

    If ND < 30:
        FMC = 85 + 0.0189 * ND^2

    Else if 30 ≤ ND < 50:
        FMC = 32.9 + 3.17 * ND - 0.0288 * ND^2

    Else:
        FMC = 120
```

**Typical FMC Values:**
- Spring green-up: 120-150% (high, crown fire unlikely)
- Summer minimum: 85-100% (low, crown fire possible)
- Fall: 100-120% (moderate, crown fire less likely)
- Winter: 120%+ (dormant)

### Fuel Consumption Calculations

#### Surface Fuel Consumption (SFC)

**C-1, C-2, C-3, C-4, C-5, C-6 Fuel Types:**
```
SFC = p1 * (1 - exp(-p2 * BUI))^p3
```

Typical parameter values:
- C-1: p1=0.75, p2=0.231, p3=1.0
- C-2: p1=5.0, p2=0.0115, p3=1.5
- Multiplier applied to final value

**S-1, S-2, S-3 Slash Fuel Types:**
```
FFCgrass = p1F * (1 - exp(-p2F * FFMC))
WFCgrass = p1W * (1 - exp(-p2W * BUI))
SFC = (ffcMultiplier * FFCgrass) + (wfcMultiplier * WFCgrass)
```

**O-1a, O-1b Grass Fuel Types:**
```
SFC = GFL * CF / 100
```

Where:
- GFL = Grass Fuel Load (kg/m²)
- CF = Curing Factor (%)

#### Crown Fuel Consumption (CFC)

```
CFC = CFL * CFB
```

Where:
- CFL = Crown Fuel Load (kg/m², fuel-type specific)
- CFB = Crown Fraction Burned (0-1)

**Standard CFL Values:**
- C-1: 0.75 kg/m²
- C-2: 1.00 kg/m²
- C-3, C-4, C-5: 1.15-1.20 kg/m²
- C-6: 1.80 kg/m²
- C-7: 0.50 kg/m²

#### Total Fuel Consumption (TFC)

```
TFC = SFC + CFC
```

Total mass of fuel consumed per unit area.

### Length-to-Breadth (LB) Ratio

The elliptical fire shape is characterized by the LB ratio.

**LB Ratio Calculation:**
```
LB = 1.0 + 8.729 * (1 - exp(-0.030 * WS))^2.155
```

Where WS = Wind Speed (km/h)

**Interpretation:**
- LB = 1.0: Circular fire (no wind)
- LB = 2.0: Ellipse twice as long as wide
- LB = 3.0+: Highly elongated fire (strong wind)

**Fire Dimensions:**

For fire burning time t:
```
A = Length of major axis = 2 * a
B = Length of minor axis = 2 * b

a = ROS * t
b = a / LB

Area = π * a * b
Perimeter ≈ π * (3(a+b) - √((3a+b)(a+3b)))  [Ramanujan approximation]
```

## WISE Implementation Architecture

### FBP Calculations Class

WISE provides the `FbpCalculations` class for standalone FBP calculations.

**Basic Usage Pattern:**
```typescript
import { FbpCalculations } from 'wise_js_api';

// Create calculator instance
let calculator = new FbpCalculations();

// Set fuel type
calculator.fuelType = "C-2";

// Set crown base height (required for conifer types)
calculator.crownBase = 3.0;  // meters

// Set FWI inputs
calculator.ffmc = 89.5;
calculator.bui = 45.2;
calculator.useBui = true;

// Set weather
calculator.windSpeed = 18;  // km/h
calculator.windDirection = 270;  // degrees

// Set topography
calculator.useSlope = true;
calculator.slopeValue = 15;  // percent
calculator.aspect = 180;  // degrees south-facing

// Set temporal/location
calculator.startTime = "2024-07-15T14:00:00";
calculator.elapsedTime = 60;  // minutes
calculator.latitude = 62.454;
calculator.longitude = -114.372;

// Execute calculation
await calculator.calculatePromise();

// Access outputs
console.log(`ROS: ${calculator.ros_eq} m/min`);
console.log(`HFI: ${calculator.hfi} kW/m`);
console.log(`CFB: ${calculator.cfb}`);
console.log(`Fire Type: ${calculator.fireDescription}`);
```

### Fuel Type Defaults

Each fuel type has default values for required parameters:

**Accessing Fuel Defaults:**
```typescript
// Get all fuel types with defaults
let fuelTypes = await FbpCalculations.getFuelsWithDefaultsPromise();

// Find specific fuel type
let c2Fuel = fuelTypes.find(f => f.name === "C-2");

// Check what parameters are required
if (c2Fuel.defaults.useCrownBase) {
    console.log(`Default CBH: ${c2Fuel.defaults.crownBase} m`);
}

if (c2Fuel.defaults.usePercentConifer) {
    console.log(`PC required for this fuel type`);
}
```

**Default Requirements by Fuel Group:**

| Fuel Group | Crown Base Height | Percent Conifer | Percent Dead Fir | Grass Curing | Grass Fuel Load |
|------------|------------------|-----------------|------------------|--------------|-----------------|
| C-1 to C-7 | Yes | No | No | No | No |
| D-1, D-2 | Yes | No | No | No | No |
| M-1, M-2 | Yes | Yes | No | No | No |
| M-3, M-4 | Yes | No | Yes | No | No |
| S-1 to S-3 | No | No | No | No | No |
| O-1a, O-1b | No | No | No | Yes | Yes |

### Integration with WISE Fire Growth Model

Within full WISE fire simulations, FBP calculations occur at each vertex of the fire perimeter:

**Computational Flow:**
```
For each timestep:
    For each vertex on fire perimeter:
        1. Sample fuel type from fuel grid at vertex location
        2. Sample terrain (slope, aspect) from DEM at vertex location
        3. Interpolate weather data to vertex location
        4. Calculate FWI indices (FFMC, BUI) for current conditions
        5. Execute FBP calculations with combined inputs
        6. Determine spread rate and direction
        7. Generate elliptical wavelet
        8. Propagate vertex forward

    Construct new fire perimeter from wavelet envelope
    Output fire perimeter and statistics
```

### Lookup Tables and Coefficients

FBP fuel types have extensive parameter tables stored in WISE:

**Spread Parameters (Example: C-1):**
```typescript
C1Spread {
    a: 90,          // Initial spread coefficient
    b: 0.0649,      // ISI exponent coefficient
    c: 4.5,         // ISI power
    q: 0.9,         // BUI effect coefficient
    bui0: 72,       // BUI at which effect = 1
    maxBe: 1.076,   // Maximum BUI effect
    height: 5,      // Average tree height (m)
    cbh: 2,         // Crown base height (m)
    cfl: 0.75       // Crown fuel load (kg/m²)
}
```

**SFC Parameters (Example: C-2):**
```typescript
C2Sfc {
    p1: 5.0,        // Base SFC coefficient
    p2: 0.0115,     // BUI coefficient
    power: 1.5,     // BUI power
    multiplier: 1.0 // Output scaling factor
}
```

**RSI Parameters (Example: C-1):**
```typescript
C1Rsi {
    // Uses standard FBP RSI calculation
    // No additional parameters
}
```

**ISF Parameters (Example: C-1):**
```typescript
C1Isf {
    // Uses standard slope factor calculation
    // No additional parameters
}
```

**AccAlpha Parameters (Fire Acceleration):**
```typescript
OpenAccAlpha {
    init: 0.115    // Initial acceleration coefficient
}
// Used for C-1, O-1, S-1, etc. (open fuels)

ClosedAccAlpha {
    init: 0.115,
    multiplier: 18.8,
    power: 2.5,
    expMultiplier: -8.0
}
// Used for C-2 through C-7, D-1, D-2, M-1 through M-4 (closed canopy)
```

**LB Parameters:**
```typescript
C1Lb {
    init: 1.0,           // LB at zero wind
    multiplier: 8.729,   // Wind coefficient
    expMultiplier: 0.030,// Exponential coefficient
    power: 2.155         // Power coefficient
}
```

**CFB Parameters:**
```typescript
C1Cfb {
    csiMultiplier: 0.001,     // CSI base multiplier
    csiCbhExponent: 1.5,      // CBH exponent
    csiExpAdder: 460,         // CSI additive constant
    csiExpMultiplier: 25.9,   // CSI FMC multiplier
    csiPower: 1.5,            // CSI power
    rsoDiv: 300,              // RSO divisor
    cfbExp: 0.23,             // CFB exponential coefficient
    cfbPossible: true         // Whether CFB can occur
}
```

### Custom Fuel Type Definition

WISE allows creation of custom fuel types by mixing parameters:

**Custom Fuel Pattern:**
```typescript
import { FuelDefinition, C1Spread, C2Sfc } from 'wise_js_api';

// Create custom fuel based on C-2 defaults
let customFuel = new FuelDefinition("Custom_Boreal", "C-2", 150);

// Override spread parameters
customFuel.spreadParms = new C1Spread({
    a: 100,      // Faster base spread than standard C-2
    b: 0.07,
    c: 4.5,
    q: 0.9,
    bui0: 72,
    maxBe: 1.1,
    height: 12,
    cbh: 4,      // Lower crown base than standard
    cfl: 1.2
});

// Use different SFC calculation
customFuel.sfcAttribute = new C2Sfc({
    p1: 6.0,     // Higher SFC than standard
    p2: 0.012,
    power: 1.5,
    multiplier: 1.0
});

// Assign color for visualization
customFuel.color = new RGBColor({red: 50, green: 120, blue: 80});
```

## Validation and Quality Assurance

### Input Validation

**Range Checks:**
```
FFMC: 0-101
DMC: 0-500 (typical), can exceed
DC: 0-1000 (typical), can exceed
Wind Speed: 0-100 km/h (realistic operational range)
Temperature: -50°C to 50°C
Relative Humidity: 0-100%
Slope: 0-60% (model calibrated range)
Elevation: 0-3000m (typical application range)
```

**Consistency Checks:**
- All grids must have matching projections
- Ignition point must be within grid extent
- Ignition point must not be in non-fuel area
- Weather stream dates must cover scenario period
- BUI calculation requires valid DMC and DC

### Output Validation

**Physical Constraints:**
```
ROS ≥ 0
HFI ≥ 0
CFB: 0 ≤ CFB ≤ 1
FMC: 0 ≤ FMC ≤ 300%
SFC, CFC, TFC ≥ 0
LB ≥ 1.0
```

**Sanity Checks:**
- Fire area increases monotonically (or stays constant)
- Perimeter grows or stays constant
- Distance head ≥ distance flank ≥ distance back
- HFI correlates with ROS and fuel consumption

### Typical Error Scenarios

**Common Issues:**

1. **Missing Crown Base Height**: Conifer fuel types require CBH
   - Error: "Crown base height required for fuel type C-2"
   - Solution: Set `crownBase` parameter or use fuel defaults

2. **Invalid Fuel Type Code**: Typo in fuel type string
   - Error: "Unknown fuel type: C-21"
   - Solution: Use standard codes (C-1, not C-21)

3. **Out of Range FWI**: FFMC > 101 or negative values
   - Error: "FFMC must be in range 0-101"
   - Solution: Check weather calculations upstream

4. **Fuel Grid Mismatch**: LUT doesn't contain grid value
   - Error: "Grid value 255 not found in LUT"
   - Solution: Ensure LUT covers all grid values including no-data

5. **Projection Mismatch**: Grids have different CRS
   - Error: "Projection mismatch between fuel grid and elevation grid"
   - Solution: Reproject all grids to common CRS

## Performance Considerations

### Computational Complexity

**Per-Vertex Calculations:**
- FBP calculation time: ~0.1-1 ms per vertex
- Large fires (10,000+ vertices): 1-10 seconds per timestep
- Multi-hour scenarios: Minutes to hours total computation

**Optimization Strategies:**
1. **Vertex Simplification**: Remove unnecessary vertices while preserving shape
2. **Adaptive Time-Stepping**: Larger steps during slow spread periods
3. **Spatial Indexing**: Quick lookup of fuel/terrain at vertex locations
4. **Caching**: Store repeated calculations (e.g., fuel type parameters)
5. **Parallel Processing**: Distribute vertex calculations across cores

### Memory Usage

**Grid Data:**
- Fuel Grid: ~1 MB per 1000x1000 cells (integer)
- DEM: ~4 MB per 1000x1000 cells (float32)
- Multiple attribute grids multiply memory requirements

**Fire Perimeter:**
- Vertex storage: ~100 bytes per vertex
- 10,000 vertices = ~1 MB
- Multiple timesteps stored for output

## Best Practices

### Fuel Type Selection

1. **Use Accurate Fuel Mapping**: Ground-truth fuel types where possible
2. **Consider Seasonal Variation**: Use D-1/D-2, M-1/M-2 for auto-switching
3. **Document Custom Fuels**: Clearly describe modifications to standard types
4. **Validate with Local Knowledge**: Consult fire management officers

### Parameter Selection

1. **Crown Base Height**: Use local measurements or LiDAR-derived values
2. **Percent Conifer**: Field surveys or remote sensing classification
3. **Grass Curing**: Updated frequently (weekly) during fire season
4. **Grass Fuel Load**: Field measurements of fuel accumulation

### Quality Control

1. **Cross-Check FWI Calculations**: Compare with weather station reports
2. **Validate ROS Against Observations**: Calibrate models to actual fire spread
3. **Review Fire Intensity Classifications**: Ensure realistic intensity values
4. **Test Edge Cases**: Zero wind, extreme slopes, low/high moisture

### Documentation

1. **Record Data Sources**: Document origin of all spatial data
2. **Track Parameter Values**: Log fuel type parameters used
3. **Version Control**: Maintain history of fuel grid updates
4. **Metadata**: Include projection, resolution, creation date

## References

### Primary FBP System Documentation

1. **Forestry Canada Fire Danger Group. (1992)**. Development and Structure of the Canadian Forest Fire Behavior Prediction System. Information Report ST-X-3. Forestry Canada, Science and Sustainable Development Directorate, Ottawa, ON. 63 p.
   - URL: https://cfs.nrcan.gc.ca/pubwarehouse/pdfs/10068.pdf
   - **Primary reference for FBP equations and methodology**

2. **Canadian Forest Service. Canadian Forest Fire Behavior Prediction (FBP) System.**
   - URL: https://cwfis.cfs.nrcan.gc.ca/background/summary/fbp
   - Online summary of FBP system components

### Fire Weather Index System

3. **Van Wagner, C.E. (1987)**. Development and structure of the Canadian Forest Fire Weather Index System. Canadian Forestry Service, Forestry Technical Report 35.
   - FWI system mathematical foundations

4. **Van Wagner, C.E. and Pickett, T.L. (1985)**. Equations and FORTRAN program for the Canadian Forest Fire Weather Index System. Canadian Forestry Service, Forestry Technical Report 33.
   - FWI calculation algorithms

### Fuel Type Development

5. **Stocks, B.J., Alexander, M.E., Wotton, B.M., Stefner, C.N., Flannigan, M.D., Taylor, S.W., Lavoie, N., Mason, J.A., Hartley, G.R., Maffey, M.E., Dalrymple, G.N., Blake, T.W., Cruz, M.G., and Lanoville, R.A. (2004)**. Crown fire behaviour in a northern jack pine - black spruce forest. Canadian Journal of Forest Research 34: 1548-1560.
   - C-fuel type validation

6. **Wotton, B.M., Alexander, M.E., and Taylor, S.W. (2009)**. Flame temperature and residence time of fires in dry eucalypt forest. International Journal of Wildland Fire 18: 700-710.
   - Fire intensity measurement methodology

### Elliptical Fire Growth

7. **Richards, G.D. (1990)**. An elliptical growth model of forest fire fronts and its numerical solution. International Journal of Numerical Methods in Engineering 30: 1163-1179.
   - Mathematical basis for elliptical fire propagation

8. **Anderson, D.H., Catchpole, E.A., De Mestre, N.J., and Parkes, T. (1982)**. Modelling the spread of grass fires. Journal of the Australian Mathematical Society, Series B, Applied Mathematics 23: 451-466.
   - Early elliptical fire model development

### WISE Implementation

9. **WISE Developers. (2024)**. WISE JavaScript API Documentation.
   - URL: https://spydmobile.bitbucket.io/psaas_js/
   - Technical API reference for WISE_JS_API

10. **WISE Developers. WISE_JS_API GitHub Repository.**
    - URL: https://github.com/WISE-Developers/WISE_JS_API
    - Source code and examples

---

**Document Information:**
- **Created**: 2025-11-25
- **Author**: Sage (AI SME) - WISE Subject Matter Expert
- **Version**: 1.0
- **Status**: Complete
- **Repository**: Project Nomad - Documentation/Research/SME_Data/WISE/algorithms/
- **File Path**: `/Users/franconogarin/localcode/project_nomad/Documentation/Research/SME_Data/WISE/algorithms/fbp_implementation.md`

**Related Documentation:**
- `fire_spread_model.md` - WISE fire spread algorithm and Huygens wavelet method
- `../architecture/system_overview.md` - WISE system architecture
- `../../Onboarding/wise_tech_summary.md` - WISE technology overview

**Acknowledgments:**
- Canadian Forest Service - FBP System development and documentation
- Natural Resources Canada - CFFDRS operational support
- WISE Developer Community - Open-source implementation
- Franco Nogarin (GNWT) - Fire modeling operational expertise
