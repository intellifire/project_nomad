# WISE Fire Spread Model

## Executive Summary

WISE (Wildfire Intelligence Simulation Engine) is a deterministic fire growth simulation system that evolved from the Prometheus fire modeling engine. It implements a vector-based fire spread algorithm using the Huygens wavelet propagation principle combined with the Canadian Forest Fire Behavior Prediction (FBP) System. This document provides technical analysis of WISE's fire spread methodology, algorithmic approach, and implementation characteristics for integration with Project Nomad.

## Historical Context and Engine Heritage

### Prometheus to WISE Evolution

WISE is the next-generation successor to Prometheus, Canada's operational fire growth simulation model. The evolution reflects a transition toward open-source, agile development practices driven by increased demand for wildfire simulation outputs.

**Prometheus Origins:**
- Developed as a national Canadian project endorsed by the Canadian Interagency Forest Fire Centre
- Originally maintained by Alberta Forestry, Parks and Tourism
- Deterministic fire growth simulator designed for operational decision support
- Based on Canadian Fire Weather Index (FWI) and Fire Behavior Prediction (FBP) systems

**WISE Development:**
- Initiated in 2015 by a community of fire modelers and developers
- Government of Northwest Territories serves as lead agency and legal intellectual property holder
- Modernized through open-source software development practices
- Maintains Prometheus core algorithms while improving accessibility and integration

**Key Drivers:**
- Operational demand exceeds capacity of trained operators during fire seasons
- Fire management agencies forced to triage which fires receive predictive services
- Need for distributed modeling capability across jurisdictions
- Declining national coordination and support for legacy modeling software

## Fire Spread Algorithm Foundation

### Canadian Forest Fire Behavior Prediction (FBP) System

WISE's fire spread calculations are fundamentally based on the Canadian FBP System, a subsystem of the Canadian Forest Fire Danger Rating System (CFFDRS).

**FBP System Characteristics:**

**Inputs (14 primary parameters across 5 categories):**
1. **Fuels**: 18 fuel types across 5 broad groupings
   - Coniferous forests (C-1 through C-7)
   - Deciduous forests (D-1, D-2)
   - Mixedwood forests (M-1 through M-4)
   - Logging slash (S-1 through S-3)
   - Grass (O-1a, O-1b)

2. **Weather**: Real-time and forecast conditions
   - Temperature, relative humidity, wind speed, wind direction, precipitation
   - Fire Weather Index components (FFMC, DMC, DC, ISI, BUI, FWI)

3. **Topography**: Terrain effects
   - Elevation, slope, aspect
   - Optional terrain interaction flags

4. **Foliar Moisture Content**: Seasonal vegetation state
   - Crown moisture conditions
   - Green-up and curing states

5. **Prediction Parameters**: Temporal specification
   - Ignition time, prediction duration, time-stepping intervals

**Outputs:**

**Primary Outputs (intensity-based):**
- Rate of Spread (ROS) - meters per minute at fire head
- Head Fire Intensity (HFI) - kilowatts per meter of fire front
- Fuel Consumption - total, surface, and crown components
- Fire Type - surface, intermittent crown, or active crown

**Secondary Outputs (elliptical growth model):**
- Fire area, perimeter, perimeter growth rate
- Directional spread: head fire, flank fire, back fire rates
- Fire dimensions: length, width, length-to-breadth ratio
- Directional behavior at head, flanks, and back of fire

### Elliptical Fire Growth Model

The FBP System's elliptical fire spread model provides the geometric foundation for WISE's fire propagation:

**Mathematical Basis:**
- Fire shape represented as ellipse with directional spread rates
- Head fire spread rate (fastest, wind-aligned direction)
- Flank fire spread rate (perpendicular to wind direction)
- Back fire spread rate (opposite wind direction)
- Length-to-breadth ratio determined by wind speed and fuel type

**Key Equations (Richards 1990):**
- Set of partial differential equations modeling fire growth across heterogeneous landscapes
- Extended from Anderson et al. (1982) grass fire model
- Accounts for spatial variability in fuel, weather, and topography

## Huygens Wavelet Propagation Method

### Theoretical Foundation

WISE implements a vector-based fire growth model based on an adaptation of Huygens' Principle of wave propagation. This principle, originally developed to describe traveling light waves, elegantly models how fire fronts advance through space and time.

**Huygens' Principle Applied to Fire:**

Every point on the fire perimeter (wavefront) serves as an independent source of secondary elliptical wavelets that propagate the fire front forward. The fire's new perimeter is the surface tangent to all these secondary wavelets - effectively the outer envelope of the expanding ellipses.

**Mathematical Representation:**

1. **Fire Perimeter as Polygon**: Fire shape represented as polygon (plane figure composed of sequence of straight-line segments forming closed path)

2. **Vertex Wavelets**: Each polygon vertex generates an elliptical wavelet whose shape, direction, and size are determined by:
   - **Shape**: Ellipse with length-to-breadth ratio from FBP fuel type
   - **Direction**: Wind-slope vector at vertex location
   - **Size**: Spread rate from FBP calculations × time step duration

3. **Tangential Envelope**: New fire perimeter is the tangent surface to all secondary wavelet circumferences

4. **Continuous Propagation**: Process repeats each time step, with fire front shifting and moving forward continuously

### Vector-Based vs Cell-Based Approaches

Fire spread modeling uses two fundamental algorithmic paradigms:

**Vector Technique (WISE/Prometheus Approach):**

**Advantages:**
- Precise fire perimeter representation as continuous curve
- Accurate area and perimeter calculations
- Smooth, realistic fire shape evolution
- Efficient for homogeneous conditions
- Better preservation of fire geometry details

**Disadvantages:**
- Computationally intensive for complex terrain
- Requires sophisticated polygon operations
- Vertex management complexity (merge, split operations)
- Slower performance in highly heterogeneous landscapes

**Computational Pattern:**
- Fire perimeter stored as linked sequence of points (vertices)
- Each vertex propagates based on local conditions
- New vertices created where fire encounters fuel/terrain transitions
- Existing vertices merged or removed to maintain efficient representation

**Raster Technique (Alternative Approach):**

**Advantages:**
- Less computationally intensive
- Better suited to heterogeneous climate and fuel conditions
- Simpler implementation and data structures
- Natural integration with gridded spatial data (GIS rasters)

**Disadvantages:**
- Lower precision in fire perimeter definition
- Stair-step artifacts in fire boundaries
- Cell resolution limits spatial accuracy
- Larger data storage for equivalent precision

**WISE's Strategic Choice:**

WISE selected the vector approach because:
1. Canadian fuel complexes often have large homogeneous patches
2. Operational need for precise perimeter location (evacuation planning)
3. Integration with vector-based GIS systems
4. Accuracy requirements for legal/forensic applications
5. Heritage from Prometheus operational validation

## Fire Spread Algorithm Implementation

### Core Propagation Engine

**Time-Stepping Mechanism:**

WISE advances fire growth through discrete time steps, with configurable intervals:

```
Display Interval: User-specified (e.g., 1 hour) - determines output frequency
Computational Interval: Internal adaptive stepping - optimizes accuracy vs performance
```

**At Each Time Step:**

1. **Evaluate Fire Environment**: For each vertex on fire perimeter
   - Sample fuel type from spatial fuel grid
   - Extract terrain parameters (slope, aspect, elevation)
   - Retrieve weather conditions (wind, temperature, humidity)
   - Calculate FWI indices (FFMC, DMC, DC, ISI, BUI)

2. **Calculate Spread Rates**: Using FBP equations
   - Head fire ROS (maximum spread rate)
   - Flank fire ROS (perpendicular spread)
   - Back fire ROS (upwind spread)
   - Determine ellipse length-to-breadth ratio

3. **Generate Wavelets**: Create elliptical wavelet at each vertex
   - Orient ellipse major axis along wind-slope vector
   - Scale ellipse by spread rate × time step
   - Account for local acceleration/deceleration factors

4. **Propagate Perimeter**: Construct new fire boundary
   - Calculate tangent envelope of all wavelets
   - Merge nearby vertices to maintain efficiency
   - Split vertices where fire encounters boundaries
   - Remove internal vertices where fire has merged

5. **Handle Special Cases**:
   - Fire merge operations (multiple ignitions coalescing)
   - Island removal (burned-out interior zones)
   - Barrier interactions (non-fuel areas, fire breaks)
   - Spotting and ember transport (see section below)

### Spatial Heterogeneity Handling

**Fuel Type Transitions:**

When fire encounters fuel type boundaries:
- Vertices created at transition points
- Each vertex propagates according to its local fuel type
- Fire shape distorts to reflect different spread rates
- Perimeter becomes non-elliptical in heterogeneous fuels

**Example Scenario:**
```
Fire spreading from C-2 boreal spruce (fast spread) into
D-1 aspen (slow spread):
- Head fire rate decreases at boundary
- Fire perimeter "pinches" at transition
- Ellipse elongates in fast fuel, compresses in slow fuel
```

**Terrain Effects:**

**Slope Influence:**
- Upslope fire spread accelerates (increased oxygen supply, preheating)
- Downslope fire spread decelerates
- FBP equations include slope factor in ROS calculations
- Maximum slope effect typically at 30-40 degree slopes

**Aspect Interaction:**
- Combined wind-slope vector determines fire direction
- Wind and slope vectors added vectorially
- Dominant factor (wind vs slope) varies by strength
- Fire tends to run upslope even with cross-slope winds

**Implementation:**
```
Effective spread vector = Wind vector + Slope vector
Ellipse orientation = direction of effective vector
Spread rate modifier = function(slope angle, alignment with wind)
```

### Weather Spatial Variation

**Weather Patches (Advanced Feature):**

WISE supports spatial variation in weather conditions:
- Multiple weather zones defined by polygons
- Each zone has independent wind speed/direction
- Smooth transitions between weather zones
- Critical for modeling complex wind patterns (valley flows, sea breezes)

**Weather Streams (Temporal Variation):**

- Multiple weather stations providing temporal data
- Spatial interpolation between stations
- Dynamic weather changes during simulation
- Hourly FFMC calculation for diurnal moisture variation

## Spotting and Ember Transport

### Spotting Mechanism

Fire spotting (ember-driven ignition ahead of main fire front) is a critical phenomenon in wildfire spread, particularly during high-intensity crown fires.

**WISE Spotting Implementation:**

**Triggering Conditions:**
- Crown fire intensity exceeds threshold (typically CFB > 0.1, indicating crowning)
- Wind speed sufficient for long-range ember transport
- Fuel type capable of generating firebrands (conifer species)

**Spotting Distance:**

Calculated based on:
- Crown fire intensity (energy available for ember lofting)
- Wind speed and turbulence
- Ember size distribution and aerodynamic properties
- Flame height and plume dynamics

**Probabilistic Placement:**

While WISE is fundamentally deterministic, spotting introduces controlled stochasticity:
- Spot fire locations distributed ahead of fire front
- Distance probability distribution based on empirical spotting models
- Density of spots increases with fire intensity
- New ignition points created in receptive fuels

**Spot Fire Growth:**

Once established, spot fires:
- Grow as independent elliptical fires
- Eventually merge with main fire front
- Can significantly accelerate overall fire spread
- Critical in "blow-up" fire conditions

### Ember Transport Physics

**Firebrand Characteristics:**
- Size range: 0.5 cm to 30+ cm for large bark plates
- Terminal velocity: 1-10 m/s depending on size
- Burn time: 30 seconds to several minutes
- Lift height: 100-1000+ meters in strong convective columns

**Transport Modeling:**
- Simplified particle trajectory calculation
- Wind speed profile through atmospheric boundary layer
- Ember burning rate during flight
- Landing zone probability distribution

**Ignition Success:**
- Requires receptive fuel bed (fine fuels, low moisture)
- Probability decreases with ember size reduction during flight
- Weather conditions (humidity, temperature) affect ignition probability

## Terrain Effects on Fire Spread

### Slope-Fire Interaction

**Physical Mechanisms:**

**Upslope Acceleration:**
1. **Flame Tilt**: Slope angles flames toward unburned fuel
2. **Radiation Preheating**: Flames radiate directly onto upslope fuels
3. **Convective Flow**: Hot gases rise along slope, preheating fuels
4. **Reduced Heat Loss**: Less heat dissipated to mineral soil below

**Downslope Deceleration:**
1. **Flame Separation**: Flames angled away from unburned fuel
2. **Reduced Preheating**: Less direct radiation to fuel bed
3. **Cooling**: Gravity-driven air flow can cool fuels

**FBP Slope Factor:**

```
Slope Factor (SF) ranges from ~0.5 (downslope) to 10+ (steep upslope)
Head Fire ROS = Base ROS × Slope Factor
```

**Critical Slope Angles:**
- 0-10%: Minimal slope effect
- 10-30%: Moderate acceleration upslope
- 30-60%: Strong acceleration, fire can "run" up slope
- >60%: Extreme acceleration, potential for rapid fire advance

### Aspect and Solar Radiation

**Diurnal Heating Effects:**

**South-facing slopes (Northern Hemisphere):**
- Greater solar radiation exposure
- Warmer fuel temperatures
- Lower fuel moisture content
- Higher fire intensity and spread rate
- Peak effect in afternoon hours

**North-facing slopes:**
- Less solar radiation
- Cooler, moister fuels
- Reduced fire spread
- Can serve as natural fire breaks

**Seasonal Variation:**
- Summer: Maximum aspect effect (high sun angle)
- Winter: Minimal aspect effect (low sun angle)
- Spring/Fall: Intermediate effect

**Implementation in WISE:**
- Aspect used in fuel moisture calculations
- Combined with temperature and humidity
- Affects FFMC (fine fuel moisture code)
- Indirectly influences spread rate through moisture

### Topographic Wind Effects

**Valley Wind Systems:**

**Upvalley Winds (daytime):**
- Solar heating drives air flow up valley
- Reinforces upslope fire spread
- Can produce rapid fire runs in afternoon
- Predictable diurnal pattern

**Downvalley Winds (nighttime):**
- Cooling drives air flow down valley
- Can reverse fire direction
- Generally reduces fire activity
- Important for nighttime suppression operations

**Terrain-Induced Turbulence:**
- Ridge tops: Accelerated winds, turbulent conditions
- Saddles and passes: Wind funneling, increased speed
- Leeward slopes: Rotor zones, variable winds
- Canyon confines: Chimney effect, extreme fire behavior

### Elevation Effects

**Atmospheric Pressure:**
- Decreased oxygen availability at elevation
- Affects combustion efficiency
- Generally reduces fire intensity slightly

**Vegetation and Fuel Changes:**
- Elevation-dependent fuel types
- Treeline transitions
- Alpine vegetation (sparse, slow-spreading)

**Weather Variation:**
- Temperature lapse rate (~6.5°C/1000m)
- Humidity changes with elevation
- Precipitation patterns
- Cloud base interactions

## WISE vs Other Fire Spread Models

### Comparison with Alternative Approaches

**FARSITE (US Forest Service):**

**Similarities:**
- Also uses Huygens' wavelet principle
- Elliptical fire growth model
- Vector-based approach
- Deterministic modeling

**Differences:**
- Uses Rothermel fire spread equations (US fuel models)
- Different fuel classification system (13 Anderson fuel models, or 40 Scott/Burgan)
- Integrated with US weather systems (RAWS, NFDRS)
- Crown fire model differs from Canadian approach

**Advantage WISE:**
- Optimized for Canadian fuels and conditions
- Direct FBP System integration
- Validated extensively in boreal forests

**Advantage FARSITE:**
- Mature software with long operational history
- Extensive US fuel model library
- Integrated atmospheric modeling (WindWizard)

**FireSTARR (Probabilistic Alternative):**

**Fundamental Paradigm Difference:**

WISE: Deterministic modeling
- Single fire perimeter prediction
- Represents "most likely" fire growth
- Faster computation
- Suitable for operational planning (hours to days)

FireSTARR: Probabilistic modeling
- Monte Carlo simulation approach
- Generates burn probability surfaces
- Captures uncertainty range
- Slower computation (many iterations)
- Suitable for risk assessment (days to weeks)

**When to Use WISE:**
- Operational fire management (active fires)
- Immediate tactical decisions (12-48 hours)
- Specific scenario modeling ("What if we ignite here?")
- Prescribed burn planning
- Real-time decision support

**When to Use FireSTARR:**
- Long-term strategic planning
- Risk assessment and mapping
- Community wildfire protection planning
- Fuel treatment prioritization
- Uncertainty quantification

**Complementary Roles:**
- WISE for deterministic "this fire, right now" predictions
- FireSTARR for probabilistic "fires in general, over time" assessments
- Project Nomad designed to support both through engine abstraction

**Cell2Fire and Cellular Automata Models:**

**Cell-Based Approach:**
- Fire represented as growing set of burning cells
- Simpler computational model
- Faster for very large landscapes
- Stair-step fire boundaries

**WISE Vector Approach:**
- Continuous fire boundary
- More accurate perimeter location
- Better for detailed tactical analysis
- Preferred for operational Canadian systems

**Burn-P3 (Probabilistic Prometheus):**

Uses Prometheus/WISE fire growth engine within probabilistic framework:
- Simulates thousands of fire ignitions
- Each fire propagates using WISE-style algorithm
- Aggregates to create burn probability maps
- Best of both worlds: accurate spread model + probabilistic output

## Technical Implementation Details

### Computational Architecture

**Core Engine (C++):**
- WISE core simulation engine written in C++
- Computationally intensive polygon operations
- Optimized for performance
- Platform-specific compilation (typically Linux x86_64)

**API Layer (TypeScript/JavaScript):**
- `wise_js_api` provides JavaScript interface
- Node.js-based Builder service orchestrates jobs
- FGMJ (Fire Growth Model Job) file generation
- Socket-based communication with core engine

**Job Execution Pattern:**

```
1. API Configuration
   ├─ Configure grids (fuel, elevation, etc.)
   ├─ Define ignition (point/polygon/line)
   ├─ Set weather stream(s)
   └─ Specify scenario parameters

2. FGMJ Generation
   ├─ Builder service creates job file (XML-based)
   ├─ Validates configuration
   └─ Creates timestamped job folder

3. WISE Execution
   ├─ WISE.EXE reads FGMJ file
   ├─ Loads spatial data grids
   ├─ Initializes fire perimeter
   └─ Runs time-stepped propagation

4. Output Generation
   ├─ KML/Shapefile fire perimeters
   ├─ GeoTIFF statistics grids
   ├─ Time-series data (CSV/JSON)
   └─ Summary reports
```

### Spatial Data Requirements

**Grid File Inputs:**

**Essential Grids:**
- Fuel Grid: FBP fuel type classification at each cell
- Projection File: Coordinate reference system definition
- Fuel LUT: Lookup table mapping grid values to fuel types

**Optional Grids (enhance accuracy):**
- Elevation: Digital Elevation Model (DEM) for terrain
- Percent Conifer: M-1/M-2 mixed fuel parameter
- Percent Dead Fir: M-3/M-4 dead fir parameter
- Crown Base Height: Crown fire initiation threshold
- Tree Height: Canopy structure parameter

**Grid Alignment Requirements:**
- All grids must share identical projection
- Cell sizes should match (or be resampled)
- Spatial extents must encompass fire area
- Common formats: GeoTIFF, ASCII Grid, ERDAS Imagine

### Polygon Operations

**Computational Challenges:**

**Vertex Management:**
- Thousands to millions of vertices in complex fires
- Dynamic addition/removal during simulation
- Memory efficiency critical
- Spatial indexing for performance

**Merge Operations:**
- Detect when fire perimeters intersect
- Combine multiple fires into single polygon
- Remove interior boundaries
- Maintain topological validity

**Island Removal:**
- Identify unburned islands within fire perimeter
- Option to remove or preserve based on user settings
- Affects area calculations
- Important for operational accuracy

**Performance Optimization:**
- Adaptive vertex spacing (fine detail at fire head, coarse at back)
- Periodic simplification to remove unnecessary vertices
- Spatial indexing (quadtree or R-tree) for intersection tests
- Parallel processing where possible

### Time-Step Adaptation

**Fixed vs Adaptive Stepping:**

**Display Interval (User-Facing):**
- Typically 1 hour for operational models
- Can be shorter (15 min) for rapid fire growth
- Determines output frequency
- Does not affect computational accuracy

**Computational Interval (Internal):**
- Typically much smaller than display interval
- Adaptive based on fire behavior
- Shorter steps during rapid spread
- Longer steps during slow spread or nighttime

**Stability Criteria:**
- Fire spread distance per step < cell size
- Prevents fire from "jumping" grid cells
- Ensures sampling of fuel/terrain variation
- Courant-Friedrichs-Lewy (CFL) condition analogy

## Integration with Project Nomad

### Engine Abstraction Layer

WISE will integrate into Project Nomad through the Fire Engine Abstraction Layer:

**Abstraction Benefits:**
- WISE-specific complexity hidden from Nomad GUI
- Standard interface for all fire engines (WISE, FireSTARR, future)
- Simplified API for common modeling operations
- Easy engine switching without GUI changes

**Key Abstraction Points:**

1. **Ignition Methods**:
   - `pointIgnition(lat, lon, duration, options)`
   - `polygonIgnition(coordinates[], duration, options)`
   - `lineIgnition(coordinates[], duration, options)`

2. **Result Standardization**:
   - Convert WISE KML/Shapefile to standard format
   - Normalize statistics naming across engines
   - Unified coordinate system handling

3. **Job Management**:
   - Abstract WISE job folder structure
   - Standardize status monitoring
   - Common error handling

### Dataset Generation Integration

**On-Demand Dataset Creation:**

For user-defined scenarios (not existing fires):
1. User defines ignition location/geometry in Nomad
2. Nomad calculates fire spread bounding box (heuristic)
3. Dataset Generator API called to create custom spatial grids
4. Cookie-cuts DEM, fuel, and other layers from national datasets
5. Returns dataset location to Nomad
6. WISE executes using custom dataset

**Bounding Box Calculation:**
- Estimate maximum possible spread based on fuel type, weather
- Add safety margin (typically 2x estimated distance)
- Balance between dataset size and coverage
- Avoid unnecessary data processing for large areas

### Output Visualization

**KML Enhancement System (Brett Moore):**

WISE native KML has performance and quality issues. Brett Moore's R-based enhancement system provides:

**Improvements:**
- 90% faster KML generation (avoid GDAL bottleneck)
- Shapefile → KML conversion pipeline
- Time-based animation support
- Color ramp legends
- Metadata enrichment
- Timezone handling
- KMZ compression

**Integration Pattern:**
```
WISE Engine → Shapefile Output → R Enhancement Script →
Enhanced KML/KMZ → Nomad Visualization
```

**Nomad Display:**
- MapBox GL KML layer rendering
- Time slider for fire progression animation
- Clickable perimeters with statistics popup
- Color-coded by time, intensity, or custom attribute
- 3D terrain draping with elevation exaggeration

## Operational Considerations

### Strengths of WISE Approach

**Accuracy:**
- Validated against hundreds of Canadian wildfires
- Proven in operational use across Canada
- Reliable for boreal forest conditions
- Good performance in complex terrain

**Speed:**
- Deterministic modeling faster than probabilistic
- Suitable for real-time operational decisions
- Can model 48-hour scenarios in minutes
- Allows rapid "what-if" scenario testing

**Integration:**
- Well-integrated with Canadian fire management systems
- Compatible with CWFIS (Canadian Wildland Fire Information System)
- Established data pipelines for weather, fuels
- Operational support infrastructure exists

**Flexibility:**
- Supports point, line, polygon, and file-based ignitions
- Multiple scenarios in single job
- Advanced features (burning conditions, fuel patches)
- Extensive output options (40+ statistics)

### Limitations and Considerations

**Computational Intensity:**
- Vector operations more expensive than raster
- Large fires (>100,000 hectares) can be slow
- Complex fuel mosaics increase computation time
- May require computational resources for real-time use

**Deterministic Nature:**
- Single outcome, no uncertainty quantification
- Cannot capture probability distributions
- Weather forecast uncertainty not propagated
- May overstate confidence in predictions

**Fuel Model Dependency:**
- Requires accurate fuel type mapping
- FBP fuel types specific to Canadian vegetation
- Difficult to apply in non-Canadian fuel complexes
- Fuel type misclassification propagates to spread errors

**Spotting Simplification:**
- Spotting model is simplified
- May underestimate spot fire influence in extreme conditions
- Ember transport physics approximated
- Not suitable for detailed spotting analysis (ember cast studies)

**Data Requirements:**
- Requires substantial spatial data preparation
- Fuel grids must be current and accurate
- DEM quality affects slope calculations
- Weather data must be representative

### Best Practices for WISE Use

**Scenario Design:**
- Use conservative weather scenarios for safety planning
- Model multiple weather conditions to bracket uncertainty
- Compare short-term (high detail) and long-term (strategic) runs
- Validate assumptions about fuel types in area

**Data Quality:**
- Verify fuel grid accuracy in critical areas
- Use highest quality DEM available (preferably LiDAR-derived)
- Ensure weather data is representative of fire location
- Check grid alignment before execution

**Interpretation:**
- Treat predictions as guidance, not absolute truth
- Consider model limitations in decision-making
- Compare with historical fires in similar conditions
- Use operator experience to contextualize results

**Operational Workflow:**
- Run initial model with best-guess parameters
- Refine based on observed fire behavior
- Update weather inputs as new forecasts arrive
- Re-run periodically as conditions change

## Scientific Foundation

### Empirical Basis

**FBP System Validation:**
- Based on thousands of experimental fires
- Extensive Canadian wildfire database
- Fuel-specific regression models
- Continuous validation and updating

**Key Research:**
- **Forestry Canada ST-X-3** (1992): Development and Structure of the Canadian Forest Fire Behavior Prediction System
- **Richards (1990)**: Elliptical fire growth mathematical framework
- **Anderson et al. (1982)**: Early elliptical fire spread models
- **Alexander et al. (1988)**: Diagrammatic guide to elliptical fire shapes

### Limitations of Empirical Models

**Extrapolation Risk:**
- FBP equations valid within observed parameter ranges
- Extreme conditions may exceed model calibration
- Novel fuel types not in FBP system
- Climate change effects on fire behavior

**Assumptions:**
- Quasi-steady-state fire spread
- Homogeneous fuel within FBP type
- Weather changes gradually (not instantaneous)
- No suppression activities in model

## Future Directions

### Potential Enhancements

**Physics-Based Components:**
- Integration with computational fluid dynamics (CFD) for wind fields
- Explicit convective column modeling
- Advanced radiation transfer
- Moisture diffusion in fuels

**Machine Learning:**
- Fuel classification from remote sensing
- Fire behavior prediction from historical data
- Anomaly detection for extreme fire events
- Automatic parameter tuning

**Coupling with Atmospheric Models:**
- Two-way fire-atmosphere interaction
- Plume-driven winds
- Pyrocumulonimbus formation
- Smoke transport and air quality

**Improved Spotting:**
- Firebrand trajectory modeling (particle tracking)
- Ember size and burning rate distribution
- Turbulent dispersion
- Landing and ignition probability fields

### Project Nomad Integration Roadmap

**Phase 1: Basic WISE Integration**
- Point/polygon/line ignition support
- Standard output visualization
- Job status monitoring
- Basic error handling

**Phase 2: Advanced Features**
- Burning conditions customization
- Fuel patches
- Weather patches
- Multi-scenario runs

**Phase 3: Enhancement Integration**
- Brett Moore KML system
- 3D visualization with terrain
- Time-series animation
- Export options (TURF.js, multiple formats)

**Phase 4: Dual-Engine Support**
- FireSTARR integration via same abstraction layer
- Engine comparison tools
- Automatic engine selection based on use case
- Hybrid deterministic/probabilistic workflows

## Conclusion

WISE represents a mature, operationally-proven fire spread modeling system built on solid scientific foundations. Its vector-based Huygens wavelet propagation approach, combined with the empirically-validated Canadian FBP System, provides accurate and reliable fire growth predictions for operational fire management.

The deterministic nature of WISE makes it ideal for tactical decision-making where specific scenario outcomes are needed quickly. While it has limitations (no uncertainty quantification, computational intensity, deterministic single-outcome), these are well-understood and manageable within proper operational context.

For Project Nomad, WISE serves as the initial fire modeling engine, with the Fire Engine Abstraction Layer ensuring future flexibility to integrate FireSTARR (probabilistic) and other engines. This approach preserves decades of Canadian fire modeling expertise while enabling future innovation.

## References

### Primary Sources

- Forestry Canada. (1992). Development and Structure of the Canadian Forest Fire Behavior Prediction System (ST-X-3). https://cfs.nrcan.gc.ca/pubwarehouse/pdfs/10068.pdf

- Canadian Wildland Fire Information System. Canadian Forest Fire Behavior Prediction (FBP) System. https://cwfis.cfs.nrcan.gc.ca/background/summary/fbp

- Richards, G.D. (1990). An elliptical growth model of forest fire fronts and its numerical solution. International Journal of Numerical Methods in Engineering, 30(6), 1163-1179.

### Fire Spread Algorithm

- Anderson, D.H., Catchpole, E.A., De Mestre, N.J., & Parkes, T. (1982). Modelling the spread of grass fires. The Journal of the Australian Mathematical Society. Series B. Applied Mathematics, 23(4), 451-466.

- A Fire Perimeter Expansion Algorithm-Based on Huygens Wavelet Propagation. https://www.publish.csiro.au/wf/WF9930073

- Alexander, M.E., Smith, R.M., & Mann, C.L. (1988). A diagrammatic guide to elliptical shapes of wildland fires. Technology Transfer Note A-002, Northern Forestry Centre, Edmonton, Alberta.

### WISE and Prometheus

- FireGrowthModel.ca - Prometheus Overview. https://firegrowthmodel.ca/pages/prometheus_overview_e.html

- Wildfire Intelligence Simulation Engine (WISE) and the Future of Canadian Fire Growth Modelling Software. https://www.frames.gov/catalog/67109

- Development and structure of Prometheus: the Canadian Wildland Fire Growth Simulation Model. http://cfs.nrcan.gc.ca/publications?id=31775

### Comparative Modeling Approaches

- Modeling how fire spreads: Mathematical models and simulators. https://triplebyte.com/blog/how-fire-spreads-mathematical-models-and-simulators

- Software-Based Simulations of Wildfire Spread and Wind-Fire Interaction. https://www.mdpi.com/2571-6255/6/1/12

- Cell2Fire: A Cell-Based Forest Fire Growth Model. https://www.frontiersin.org/articles/10.3389/ffgc.2021.692706/full

### Operational Context

- Canada's Fire Behaviour Prediction System. https://natural-resources.canada.ca/forest-forestry/wildland-fires/canada-fire-behaviour-prediction-system

- Burn-P3 (Probability, Prediction, and Planning). https://www.canadawildfire.org/burn-p3-english

---

**Document Information:**
- Created: 2025-11-25
- Author: Sage (AI SME) - WISE Subject Matter Expert
- Version: 1.0
- Status: Complete
- Repository: Project Nomad - Documentation/Research/SME_Data/WISE/algorithms/

**Acknowledgments:**
- Franco Nogarin (GNWT) - Fire modeling expertise and operational context
- Brett Moore (CFS) - KML enhancement system insights
- Jordan Evans (CFS) - FireSTARR comparative analysis
- Canadian Forest Service - FBP System documentation and research
