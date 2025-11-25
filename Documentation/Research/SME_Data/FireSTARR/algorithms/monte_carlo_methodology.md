# Monte Carlo Methodology

## Overview

FireSTARR uses Monte Carlo simulation to generate probabilistic fire growth predictions. Multiple independent fire simulations are executed with varying random thresholds and weather scenarios. Results are aggregated into burn probability surfaces that represent the likelihood of fire reaching each location.

## Simulation Hierarchy

```
Model
 │   • Thread pool management
 │   • Convergence checking
 │   • Result aggregation
 │
 └── Iteration
      │   • Groups scenarios using all weather streams
      │   • Generates random thresholds
      │
      └── Scenario
           │   • Single deterministic simulation
           │   • Event-driven spread loop
           │   • Tracks perimeter and intensity
           │
           └── SpreadInfo
                • Per-cell fire behavior calculation
                • FBP equations applied here
```

## Model Orchestration

### Thread Pool Management

FireSTARR uses a semaphore-based thread limiter:

```cpp
static Semaphore task_limiter{hardware_concurrency()};
```

**Thread Control:**
- `wait()`: Blocks until thread count <= limit, then increments
- `notify()`: Decrements count, wakes one waiting thread
- `CriticalSection`: RAII wrapper for automatic acquire/release

**Default Limit:** `std::thread::hardware_concurrency()` (all available cores)

### Convergence Control

Simulations continue until statistical stability is achieved.

**Three Parallel Statistical Tracks:**

| Metric | Description | Purpose |
|--------|-------------|---------|
| `all_sizes` | All fire sizes across iterations | Overall distribution stability |
| `means` | Mean fire size per iteration | Central tendency stability |
| `pct` | 95th percentile per iteration | Upper bound stability |

**Stopping Conditions:**

1. **Deterministic mode**: Stop after 1 iteration
2. **Simulation limit**: `scenarios >= MAXIMUM_SIMULATIONS`
3. **Time limit**: Wall-clock time exceeded
4. **Confidence achieved**: All three metrics meet `CONFIDENCE_LEVEL`

**Confidence Calculation:**

```
runs_required = max(
  runs_for_means,
  runs_for_pct,
  runs_for_sizes
)
```

Each uses variance-based estimation of runs needed to achieve target confidence.

## Iteration Structure

### Iteration Composition

```
Iteration
├── scenarios_[] (Scenario pointers)
├── final_sizes_ (SafeVector for thread-safe results)
└── cancelled_ (termination flag)
```

**Scenario Count:**
```
scenarios_per_iteration = weather_streams × ignition_scenarios
```

Example: 10 weather streams × 3 start points = 30 scenarios/iteration

### Iteration Reset

Before each run, `reset()` regenerates random thresholds:

```cpp
Iteration* Iteration::reset(mt19937* mt_extinction, mt19937* mt_spread) {
  for (auto& scenario : scenarios_) {
    scenario->reset(mt_extinction, mt_spread, &final_sizes_);
  }
}
```

This ensures statistical independence between iterations.

## Random Threshold Generation

### Seeding Strategy

Independent seeds for extinction and spread:

```cpp
seed_spread = {0, start_day, scaled_latitude, scaled_longitude}
seed_extinction = {1, start_day, scaled_latitude, scaled_longitude}

mt19937 mt_spread(seed_spread);
mt19937 mt_extinction(seed_extinction);
```

**Seed Components:**
- Type identifier (0=spread, 1=extinction)
- Start day (simulation date)
- Latitude × 10^(precision)
- Longitude × 10^(precision)

**Result:** Reproducible results for same location/date, different results across locations.

### Threshold Structure

Pre-generated thresholds for entire simulation duration:

```cpp
void make_threshold(vector<ThresholdSize>* thresholds, mt19937* mt, ...) {
  uniform_real_distribution<ThresholdSize> rand(0.0, 1.0);

  const auto general = rand(*mt);  // Scenario-level

  for (day in simulation_period) {
    const auto daily = rand(*mt);  // Daily variation

    for (hour in 0..23) {
      const auto hourly = rand(*mt);  // Hourly variation

      threshold = 1.0 - weighted_combination(general, daily, hourly);
    }
  }
}
```

### Three-Level Weighting

| Level | Scope | Effect |
|-------|-------|--------|
| Scenario | Entire simulation | Baseline probability shift |
| Daily | Each day | Day-to-day variation |
| Hourly | Each hour | Fine-grained variation |

**Formula:**
```
threshold = 1.0 - (
  SCENARIO_WEIGHT × general +
  DAILY_WEIGHT × daily +
  HOURLY_WEIGHT × hourly
) / total_weight
```

## Scenario Execution

### Event-Driven Simulation Loop

```cpp
while (!cancelled_ && !scheduler_.empty()) {
  evaluateNextEvent();
}
```

**Event Priority Queue:**
- Events sorted by time (then type for consistency)
- Only active events consume CPU

### Event Types

| Event | Purpose |
|-------|---------|
| `NewFire` | Initialize fire from ignition point/perimeter |
| `FireSpread` | Calculate and apply spread for timestep |
| `Save` | Snapshot current state to probability map |
| `EndSimulation` | Terminate simulation loop |

### FireSpread Event Processing

1. **Collect burning points** with ROS >= minimum threshold
2. **Group by SpreadKey** (fuel, slope, aspect) for efficiency
3. **Calculate spread offsets** using ellipse geometry
4. **Apply offsets** to determine next-hour positions
5. **Check extinction** for each new position
6. **Update perimeter** and intensity maps

### Duration Calculation

```cpp
duration = min(
  max_duration,
  MAXIMUM_SPREAD_DISTANCE × cell_size / max_ros
)
```

Prevents numerical instability and overshoot.

## Spread Probability Mechanics

### Spread Decision

For each burning cell:

```cpp
SpreadInfo info = calculateSpread(fuel, slope, aspect, weather);
ros = info.headRos();

if (ros >= ros_minimum) {
  // Cell selected for spreading
  apply_spread_offsets(info.offsets());
}
```

**Key Insight:** Variation across scenarios comes primarily from:
- Different weather streams
- Different extinction thresholds
- Not from per-cell ROS variation

### Survival Probability Comparison

```cpp
bool survives(time, cell, time_at_location) {
  // High moisture exception
  if (mc > 100 || (mc >= 109 && time_at_location < 5)) {
    return true;
  }

  // Threshold comparison
  return extinctionThreshold(time) < weather->survivalProbability(time, fuel);
}
```

**Logic:**
- Pre-generated `extinctionThreshold`: Random [0,1] value
- Physics-based `survivalProbability`: Modeled probability [0,1]
- **Fire survives if:** threshold < survivalProbability

### Extinction Pathways

1. **Survival check fails**: `survives()` returns false
2. **Fire surrounded**: All 8 neighbors already burned

**Time-at-Location Effect:**
- Longer fire duration → higher extinction probability
- Represents fuel exhaustion and intensity decay

## Probability Aggregation

### Per-Scenario Aggregation

When scenario completes:

```cpp
void ProbabilityMap::addProbability(const IntensityMap& for_time) {
  lock_guard<mutex> lock(mutex_);

  for (auto& [location, intensity] : for_time) {
    all_.data[location] += 1;  // Increment burn count

    // Classify by intensity
    if (intensity <= low_max) {
      low_.data[location] += 1;
    } else if (intensity <= med_max) {
      med_.data[location] += 1;
    } else {
      high_.data[location] += 1;
    }
  }

  sizes_.push_back(for_time.fireSize());
}
```

### Cross-Iteration Aggregation

```cpp
void ProbabilityMap::addProbabilities(const ProbabilityMap& rhs) {
  lock_guard<mutex> lock(mutex_);
  lock_guard<mutex> lock_rhs(rhs.mutex_);

  // Sum counts for each grid
  merge(all_, rhs.all_);
  merge(low_, rhs.low_);
  merge(med_, rhs.med_);
  merge(high_, rhs.high_);

  // Combine size distributions
  merge_sorted(sizes_, rhs.sizes_);
}
```

### Final Probability Calculation

```
probability[cell] = burn_count[cell] / total_scenarios
```

**Output Range:** [0.0, 1.0]

**Interpretation:** Fraction of scenarios in which fire reached this cell.

## Convergence Criteria

### Statistical Basis

Convergence uses variance-based confidence estimation:

```cpp
bool Statistics::isConfident(MathSize confidence_level) {
  return actual_error <= acceptable_error;
}

size_t Statistics::runsRequired(MathSize confidence_level) {
  // Estimate runs needed based on current variance
  return calculated_runs;
}
```

### Confidence Levels

| Level | Meaning |
|-------|---------|
| 95% | StdDev estimate has <5% relative error |
| 90% | StdDev estimate has <10% relative error |

### Convergence Logic

```cpp
if (for_means.isConfident(CONFIDENCE_LEVEL) &&
    for_pct.isConfident(CONFIDENCE_LEVEL) &&
    for_sizes.isConfident(CONFIDENCE_LEVEL)) {
  return 0;  // Stop - all confident
}

return max(
  for_means.runsRequired(CONFIDENCE_LEVEL),
  for_pct.runsRequired(CONFIDENCE_LEVEL),
  for_sizes.runsRequired(CONFIDENCE_LEVEL)
);  // Continue - return runs needed
```

## Threading and Synchronization

### Semaphore Pattern

```cpp
class Semaphore {
  mutex mutex_;
  condition_variable cv_;
  int used_;   // Current threads
  int limit_;  // Maximum threads

  void wait() {
    unique_lock<mutex> l(mutex_);
    cv_.wait(l, [this] { return used_ <= limit_; });
    ++used_;
  }

  void notify() {
    unique_lock<mutex> l(mutex_);
    --used_;
    cv_.notify_one();
  }
};
```

### Protected Resources

| Resource | Protection | Purpose |
|----------|-----------|---------|
| ProbabilityMap grids | `mutex` | Prevent race on aggregation |
| IntensityMap cells | `mutex` | Prevent race on burn recording |
| Scenario counters | `atomic<size_t>` | Lock-free progress tracking |
| Model state flags | `mutex` | Coordinate completion status |

### Asynchronous Execution

```cpp
// Spawn scenario threads
for (scenario in iteration) {
  threads.emplace_back(run_scenario, scenario);
}

// Join after iteration
for (thread& t : threads) {
  t.join();
}
```

**Timer Thread:**
- Dedicated thread monitors wall-clock time
- Checks every 1 second
- Sets `is_out_of_time_` flag if exceeded
- Cancels remaining simulations gracefully

## Simulation Limits

### Maximum Simulations

```cpp
if (all_sizes.size() >= MAXIMUM_SIMULATIONS) {
  stop_simulation();
}
```

Default: 10,000 scenarios (not iterations)

### Time Limit

```cpp
if (runTime() >= TIME_LIMIT) {
  cancel_remaining_scenarios();
}
```

Default: Configurable via settings

### Deterministic Mode

For single-run debugging:

```cpp
if (DETERMINISTIC_MODE) {
  stop_after_iteration(1);
}
```

## Output Generation

### Probability Surfaces

For each output day (1, 2, 3, 7, 14):

```cpp
probability_grid = saveToProbabilityFile(
  burn_counts,
  total_scenarios,
  output_directory,
  day_number
);
```

**Output Format:**
- GeoTIFF with LZW compression
- Float32 values [0.0, 1.0]
- UTM NAD83 projection
- NoData for non-simulated areas

### Intensity Classification

| Class | Threshold | Color (typical) |
|-------|-----------|-----------------|
| Low | < 500 kW/m | Yellow |
| Moderate | 500-4000 kW/m | Orange |
| High | > 4000 kW/m | Red |

### Statistical Outputs

- Mean fire size across all scenarios
- Standard deviation of fire size
- 95th percentile fire size
- Number of scenarios reaching convergence

## Key Design Principles

### Independence Through Pre-Generation

Random thresholds generated before simulation:
- Eliminates correlation between spread decisions
- Enables reproducibility with same seeds
- Separates randomization from physics

### Convergence via Iteration

Statistical stability emerges from repetition:
- More scenarios → better probability estimates
- Variance reduction follows sqrt(N)
- Adaptive stopping minimizes unnecessary computation

### Event-Driven Efficiency

Only active fire fronts consume CPU:
- No iteration over entire grid each timestep
- Variable timesteps based on fire behavior
- Efficient for small fires in large domains

### Thread-Safe Aggregation

Parallel execution with safe result collection:
- Mutex-protected probability maps
- Atomic counters for progress tracking
- Lock-free where possible for performance

## References

1. Finney, M.A. (2005). The challenge of quantitative risk analysis for wildland fire. Forest Ecology and Management.
2. Parisien, M.A. et al. (2005). Mapping wildfire susceptibility with the BURN-P3 simulation model. Canadian Journal of Forest Research.
3. Anderson, K. et al. (2019). FireSTARR Fire Spread Probability Model.
