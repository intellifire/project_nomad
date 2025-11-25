# WISE Fire Modeling System - SME Documentation

> **Subject Matter Expert**: Sage (AI SME for WISE, FireSTARR, and Project Nomad)
> **Last Updated**: November 2025
> **Status**: Complete technical reference

## Overview

WISE (Wildfire Intelligence for Spatially-Explicit Systems) is a deterministic fire growth modeling system based on the Canadian Forest Fire Behavior Prediction (FBP) System. This documentation provides comprehensive technical reference for integrating WISE into Project Nomad.

**Key Context**:
- WISE is the successor to the Prometheus fire modeling system
- Uses Huygens wavelet propagation for fire perimeter growth
- Implemented via `wise_js_api` TypeScript library with Builder pattern
- Project Nomad will integrate WISE alongside FireSTARR via the Fire Engine Abstraction Layer

## Documentation Structure

### Architecture
System design and component relationships.

| Document | Description |
|----------|-------------|
| [System Overview](architecture/system_overview.md) | High-level architecture, key components, operational context |
| [Component Map](architecture/component_map.md) | Complete component inventory with file locations |
| [Data Flow](architecture/data_flow.md) | Input → processing → output data pipelines |

### Algorithms
Fire behavior science and calculation methods.

| Document | Description |
|----------|-------------|
| [Fire Spread Model](algorithms/fire_spread_model.md) | Huygens wavelet propagation, terrain effects, spotting |
| [FBP Implementation](algorithms/fbp_implementation.md) | Canadian FBP System, 18 fuel types, ROS/HFI/CFB calculations |
| [FWI Calculations](algorithms/fwi_calculations.md) | Fire Weather Index System, moisture codes, weather inputs |

### Integration
Patterns for integrating WISE with Project Nomad.

| Document | Description |
|----------|-------------|
| [API Patterns](integration/api_patterns.md) | Fire Engine Abstraction Layer, EngineManager, TypeScript patterns |
| [FGMJ Builder](integration/fgmj_builder.md) | WISE Builder pattern, job construction, workflow examples |
| [Nomad Integration Guide](integration/nomad_integration_guide.md) | Complete integration guide for Project Nomad |

### Reference
Technical specifications and troubleshooting.

| Document | Description |
|----------|-------------|
| [FGMJ Reference](reference/fgmj_reference.md) | Fire Growth Model Job file format specification |
| [Configuration Reference](reference/configuration_reference.md) | System configuration, environment variables, Docker setup |
| [Error Codes](reference/error_codes.md) | Error categories, troubleshooting, recovery strategies |
| [Output Formats](reference/output_formats.md) | Perimeter, grid, statistics outputs, MapBox GL integration |

## Quick Start

### For Project Nomad Developers

1. Start with [Nomad Integration Guide](integration/nomad_integration_guide.md) for complete integration patterns
2. Review [API Patterns](integration/api_patterns.md) for abstraction layer usage
3. Reference [Output Formats](reference/output_formats.md) for MapBox GL visualization

### For Understanding WISE Science

1. Read [Fire Spread Model](algorithms/fire_spread_model.md) for propagation theory
2. Study [FBP Implementation](algorithms/fbp_implementation.md) for fuel type behavior
3. Review [FWI Calculations](algorithms/fwi_calculations.md) for weather integration

### For Troubleshooting

1. Check [Error Codes](reference/error_codes.md) for diagnostic guidance
2. Review [Configuration Reference](reference/configuration_reference.md) for setup issues
3. Consult [FGMJ Reference](reference/fgmj_reference.md) for job validation errors

## Key Concepts

### Fire Engine Abstraction Layer

```
User Code → EngineManager → FireModelingEngine Interface → WISE/FireSTARR
```

The abstraction layer (from WiseGuy repository) allows Project Nomad to:
- Switch between WISE and FireSTARR without code changes
- Use standardized input/output types
- Support future engine implementations

### WISE Builder Pattern

```typescript
// High-level workflow
const wise = new WISE();
wise.setProjection(...);
wise.setFuelLookup(...);
wise.addIgnition(...);
wise.addWeatherStation(...);
wise.addScenario(...);
await wise.beginJobPromise();  // Generates FGMJ
```

### Job Execution Flow

```
Nomad Wizard → Abstraction Layer → WISE Builder → FGMJ File → WISE.EXE → Outputs → MapBox GL
```

## Related Resources

### WiseGuy Repository
The Fire Engine Abstraction Layer implementation:
- Location: `/Users/franconogarin/localcode/wiseguy/`
- Contains: EngineManager, WISEEngine, FireModelingEngine interface

### Existing Onboarding Docs
Higher-level overview documents:
- `Documentation/Research/Onboarding/wise_tech_summary.md`
- `Documentation/Research/Onboarding/wise_io.md`

### FireSTARR SME Documentation
Parallel documentation for the FireSTARR engine:
- Location: `Documentation/Research/SME_Data/FireSTARR/`

## Strategic Context

### Current State
- WISE is functional but faces maintenance challenges (compiled algorithms without source access)
- Techno Sylva acquisition has created licensing/ethical concerns
- WISE remains the production standard for Canadian fire agencies

### Transition Strategy
1. **Phase 1 (Current)**: WISE-only integration via abstraction layer
2. **Phase 2**: Dual engine support (WISE + FireSTARR)
3. **Phase 3**: FireSTARR primary, WISE fallback
4. **Phase 4**: FireSTARR-only (WISE sunset)

The abstraction layer ensures this transition requires zero changes to Nomad application code.

## Document Inventory

```
WISE/
├── index.md                              # This file
├── architecture/
│   ├── system_overview.md               # 25KB - System architecture
│   ├── component_map.md                 # 29KB - Component inventory
│   └── data_flow.md                     # 57KB - Data pipelines
├── algorithms/
│   ├── fire_spread_model.md             # 32KB - Propagation algorithms
│   ├── fbp_implementation.md            # 45KB - FBP System implementation
│   └── fwi_calculations.md              # 25KB - Weather index calculations
├── integration/
│   ├── api_patterns.md                  # 39KB - Abstraction layer patterns
│   ├── fgmj_builder.md                  # 34KB - Builder pattern usage
│   └── nomad_integration_guide.md       # 49KB - Complete Nomad integration
└── reference/
    ├── fgmj_reference.md                # 40KB - FGMJ file format
    ├── configuration_reference.md       # 27KB - Configuration options
    ├── error_codes.md                   # 23KB - Error handling
    └── output_formats.md                # 41KB - Output specifications
```

**Total Documentation**: ~466KB across 13 documents

---

*This documentation preserves decades of WISE fire modeling expertise for the next generation of fire modeling interfaces. The mission: democratizing fire modeling to save lives.*
