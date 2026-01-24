<p align="center">
  <img src="assets/logo/nomad-logo.png" alt="Project Nomad Logo" width="200"/>
</p>

<p align="center">
  <img src="assets/screenshots/Screenshot_mvp_v0.png" alt="Screenshot" width="1200"/>
</p>

# Project Nomad

A national fire modeling GUI system for Canadian wildfire management.

## Mission

Democratizing fire modeling to save lives through accessible, modern interfaces.

## Overview

Project Nomad is a TypeScript React GUI for fire modeling. It provides a MapBox GL-based map interface for fire behavior analysis and prediction modeling in wildfire management operations.

**Current Status**: Phase 1 MVP Complete. Working SAN deployment with FireSTARR integration, full visualization pipeline, and installer for easy deployment.

## Deployment

### SAN (Stand Alone Nomad)
Self-hosted application for individual users or small teams:
- Bundled frontend with local backend
- SQLite for data storage
- Simple file-based authentication
- Docker or Metal (bare metal) infrastructure modes
- Ideal for field operations or standalone deployments

## Fire Modeling Engine

### FireSTARR
Open-source probabilistic fire modeling:
- Monte Carlo simulation for burn probability
- Canadian FBP System implementation
- Fast C++ execution
- Active development

## Core Features

**Model Setup Wizard**
- Ignition input (point drawing on map)
- Temporal configuration (start time, duration)
- Weather data integration (SpotWX)

**Model Review**
- Fire perimeter visualization on MapBox GL
- Burn probability maps
- Time-stepped animation
- Export to multiple formats

**Data Sources**
- National fuel type grids
- National DEM
- ECCC weather data
- MODIS/VIIRS hotspots

## Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | TypeScript, React |
| Map | MapBox GL JS |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite |
| Model Engine | FireSTARR |
| Infrastructure | Docker or Metal (bare metal) |

## Documentation

### Component Embedding
For embedding the Nomad dashboard in external applications:
- **[EMBEDDING.md](EMBEDDING.md)** - Consumer entry point for embedding
- **[openNomad/README.md](frontend/src/openNomad/README.md)** - Complete adapter implementation guide
- **[docs/examples/](docs/examples/)** - Runnable integration examples

### SME Documentation
Technical references for fire modeling:
- **FireSTARR**: `Documentation/Research/SME_Data/FireSTARR/`

### Project Specification
- `draft_plan.md` - Detailed architecture and workflow specification

### Configuration
- `demo.json` - Example data source configuration

## Project Structure

```
project_nomad/
├── frontend/
│   └── src/
│       ├── App.tsx           # Main orchestration
│       ├── features/         # Feature modules
│       │   ├── Map/          # MapBox GL integration
│       │   ├── Wizard/       # Reusable wizard component
│       │   ├── ModelSetup/   # Fire model setup workflow
│       │   ├── ModelReview/  # Results visualization
│       │   ├── Dashboard/    # Draft models management
│       │   ├── Export/       # Output export
│       │   └── Notifications/# Job status notifications
│       ├── openNomad/        # Embeddable component API
│       │   ├── api.ts        # IOpenNomadAPI interface
│       │   ├── customization/# White-label theming
│       │   ├── default/      # SAN mode implementation
│       │   └── examples/     # Integration examples
│       ├── services/         # API communication
│       ├── components/       # Shared components
│       └── shared/utils/     # Utilities
├── backend/
│   └── src/                  # Express API server
├── docs/
│   └── examples/             # Runnable integration examples
│       ├── react-minimal/    # React + Vite example
│       └── vanilla-js/       # UMD script tag example
├── Documentation/
│   └── persist/
│       └── SMEKB/Nomad/      # SME Knowledge Base
│           └── plan/
│               ├── nomad_master_plan.md
│               └── SST/      # Single Source of Truth diagrams
├── EMBEDDING.md              # Component embedding guide
└── assets/logo/              # Project branding
```

## Installation

The interactive installer handles all configuration and dependencies:

```bash
git clone https://github.com/WISE-Developers/project_nomad.git
cd project_nomad
./scripts/install_nomad_setup.sh
```

The installer will guide you through:
1. **Infrastructure selection** - Docker (recommended) or Metal (bare metal)
2. **FireSTARR dataset** - Download or use existing (~50GB national fuel/DEM data)
3. **FireSTARR binary** - Download or use existing
4. **Configuration** - Paths, ports, and environment setup

The installer validates all prerequisites and offers to fix common issues automatically.

### Quick Start (Docker)

For Docker deployments, the installer configures everything. After running the installer:

```bash
docker compose up -d
```

Access the application at http://localhost:8080

### Quick Start (Metal)

For bare metal deployments, the installer builds the application. After running the installer:

```bash
npm start
```

Access the application at http://localhost:3001

## Development

```bash
npm install
npm run dev            # Watch mode (frontend + backend)
npm test               # Run tests
npm run lint           # ESLint
```

## Contributing

Contributions welcome. See open issues or contact the maintainers.

## License

AGPLv3 - See [LICENSE](LICENSE) for details.

---

*Project Nomad - Making fire modeling accessible to those who need it most.*
