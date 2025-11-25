# Fire Spread Model

## Overview

FireSTARR implements the elliptical fire spread model defined in ST-X-3 (Forestry Canada Fire Behavior Prediction System) and GLC-X-10 (Updates and Revision to the 1992 CFBPS). Fire spreads as an ellipse with the head aligned to the resultant wind and slope vector.

## Elliptical Spread Geometry

### Fire Shape Parameters

| Parameter | Description | Calculation |
|-----------|-------------|-------------|
| Head ROS | Rate of spread in direction of maximum spread | FBP equations |
| Back ROS | Rate of spread opposite to head | Reduced from head |
| Flank ROS | Lateral rate of spread | `a / L:B` |
| L:B Ratio | Length-to-breadth ratio | Wind speed dependent |

### Ellipse Geometry

```
Semi-major axis (a) = (head_ros + back_ros) / 2.0
Center offset (c) = a - back_ros
Semi-minor axis (b) = a / L:B = flank_ros
```

The fire origin is not at the ellipse center but offset by distance `c` toward the back fire direction.

## Rate of Spread Calculation

### Basic ROS Equation (ST-X-3 Eq. 26)

```
ROS = a × (1 - exp(-b × ISI))^c
```

Where:
- **a, b, c**: Fuel-specific parameters from ST-X-3 Table 6
- **ISI**: Initial Spread Index (modified by wind and slope)

### BUI Effect (ST-X-3 Eq. 54)

```
BUI_Effect = exp(50 × log(q) × (1/BUI - 1/BUI₀))
```

Applied as multiplier: `ROS_adjusted = ROS × BUI_Effect`

### Wind Speed Vector

For head fire (aligned with wind):
```
WSV = exp(0.05039 × ws)  for ws < 40 km/h
WSV = 12.0 × (1 - exp(-0.0818 × (ws - 28)))  for ws ≥ 40 km/h
```

For back fire (opposite to wind):
```
WSV = 0.208 × exp(-0.05039 × ws)
```

## Length-to-Breadth Ratio

### Standard Formula (ST-X-3 Eq. 79)

```
L:B = 1.0 + 8.729 × (1.0 - exp(-0.030 × ws))^2.155
```

Where **ws** is wind speed in km/h.

**Behavior:**
- L:B approaches 1.0 at low wind speeds (circular spread)
- L:B increases asymptotically with wind speed (more elongated)

## Slope Correction

### Slope Factor (ST-X-3 Eq. 39, GLC-X-10 39a/b)

```
Slope_Factor = exp(3.533 × (slope_percent / 100)^1.2)
```

**Constraints:**
- Maximum slope capped at 69%
- Slopes ≥ 70% map to Slope_Factor = 10.0

### Slope-Adjusted Wind Vector

When slope is present, the wind vector is modified by the upslope component:

```
wse = slope effect component (from ISF calculation)
heading = slope azimuth direction (radians)
wsv_x = wind.wsvX() + wse × cos(heading)
wsv_y = wind.wsvY() + wse × sin(heading)
wsv = sqrt(wsv_x² + wsv_y²)
```

### Horizontal Correction Factor

Ground distance is corrected to horizontal (map) distance using slope geometry:

```
correction = min(1.0, sqrt(x² + y²))
```

Where x, y are derived from the slope angle and direction.

## Spread Direction (RAZ)

### Head Fire Direction

Without slope:
```
RAZ = wind.heading()
```

With slope:
```
ISF = fuel->calculateIsf(spread, isz)  // slope-adjusted ISI
wse = log(ISF / isz) / 0.05039  // inverse of WSV calculation

heading = slope_azimuth (radians)
wsv_x = wind.wsvX() + wse × cos(heading)
wsv_y = wind.wsvY() + wse × sin(heading)

RAZ = atan2(wsv_x, wsv_y)  // resultant azimuth
```

### Spread in Any Direction

ROS at angle θ from head direction:

```
ROS(θ) = |[(a × ((flank × cos(θ) × sqrt(f² × cos²(θ) + (a² - c²) × sin²(θ))
          - a × c × sin²(θ)) / (f² × cos²(θ) + a² × sin²(θ))) + c] / cos(θ)|
```

This derives from the parametric ellipse equation in polar coordinates.

## Fire Intensity

### Fire Intensity Formula (ST-X-3 Eq. 69)

```
I = 300 × FC × ROS
```

Where:
- **I**: Intensity (kW/m)
- **FC**: Fuel Consumption (kg/m²) - either SFC or TFC
- **ROS**: Rate of Spread (m/min)

## Spread Algorithm Implementation

### WidestEllipseAlgorithm

The primary algorithm adaptively samples the ellipse to maximize point density near the widest section:

```
Parameters:
  STEP_X = 0.2  // Base step size for cos(θ) space
  step_x = STEP_X / sqrt(L:B)  // Adjust for eccentricity
  widest = atan2(flank_ros, c)  // Widest point angle

Process:
  1. Sample from 0° to 90° (front half) with adaptive step size
     - Smaller steps near widest point
     - Larger steps away from widest point
  2. Always include 90° point (pure flank fire)
  3. Sample from 90° to back fire angle with larger steps
  4. Include back fire direction if ROS exceeds minimum
```

### Offset Calculation

For each direction angle, spread distance is converted to cell offsets:

```
ros_cell = ros / cell_size
offset_x = ros_cell × sin(direction)  // East-West component
offset_y = ros_cell × cos(direction)  // North-South component
intensity = 300 × tfc × ros  // Store with offset
```

## SpreadInfo Class

Central data structure encapsulating all spread calculations for a specific cell and time.

### Key Members

| Member | Type | Description |
|--------|------|-------------|
| `offsets_` | OffsetSet | Spread offsets from origin |
| `max_intensity_` | MathSize | Maximum intensity (kW/m) |
| `head_ros_` | MathSize | Head fire ROS (m/min) |
| `cfb_` | MathSize | Crown Fraction Burned |
| `sfc_` | MathSize | Surface Fuel Consumption |
| `tfc_` | MathSize | Total Fuel Consumption |
| `raz_` | Direction | Head spread direction |
| `nd_` | int | Days from min foliar moisture date |

### Key Methods

| Method | Description |
|--------|-------------|
| `calculateRosFromThreshold()` | Convert probability threshold to ROS |
| `slopeFactor()` | Get slope correction factor |
| `crownFractionBurned()` | Get CFB (0-1) |
| `headRos()` | Get head fire ROS (m/min) |
| `headDirection()` | Get head fire direction |

## References

1. Forestry Canada (1992). Development and Structure of the Canadian Forest Fire Behaviour Prediction System (ST-X-3)
2. Wotton et al. (2009). Updates and Revisions to the 1992 CFBPS (GLC-X-10)
3. Richards, G.D. (1990). An elliptical growth model of forest fire fronts
