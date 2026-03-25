# Project Nomad Quick Start Guide

Choose your installation method:

- **[Deterministic Installers (New)](#deterministic-installers)** - One-line curl install, no git required
- **[Interactive Installer](#interactive-installer)** - Full wizard with all options (requires git)

---

## Deterministic Installers (Recommended)

Get Nomad running in minutes without git clone. These scripts use pre-configured defaults for SAN mode.

### Prerequisites

- **Docker installers**: Docker Desktop or Docker Engine
- **Metal installers**: Node.js >= 20, GDAL libraries
- All installers: MapBox API token ([get one free](https://account.mapbox.com/access-tokens/))

### Quick Install

#### Linux/macOS - Docker (Recommended)

```bash
export VITE_MAPBOX_TOKEN=pk.your_token_here
curl -fsSL https://raw.githubusercontent.com/WISE-Developers/project_nomad/main/scripts/install-nomad-san-docker.sh | bash
```

**Access**: http://localhost:3901

#### Linux/macOS - Metal (Native)

```bash
export VITE_MAPBOX_TOKEN=pk.your_token_here
curl -fsSL https://raw.githubusercontent.com/WISE-Developers/project_nomad/main/scripts/install-nomad-san-metal.sh | bash
```

**Access**: http://localhost:4901

#### Windows - Docker (PowerShell)

```powershell
$env:VITE_MAPBOX_TOKEN = "pk.your_token_here"
iwr -useb https://raw.githubusercontent.com/WISE-Developers/project_nomad/main/scripts/install-nomad-san-docker.ps1 | iex
```

**Access**: http://localhost:3901

### Custom Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_MAPBOX_TOKEN` | (required) | MapBox API token |
| `INSTALL_DIR` | `./project_nomad` | Where to extract Nomad |
| `FIRESTARR_DATASET_PATH` | `~/firestarr_data` | Dataset location |
| `AUTO_INSTALL_DATASET` | (unset) | Set to `1` to auto-download dataset |

**Examples:**

```bash
# Custom dataset path
curl ... | VITE_MAPBOX_TOKEN=pk.xxx FIRESTARR_DATASET_PATH=/data/nomad bash

# Auto-download dataset
curl ... | VITE_MAPBOX_TOKEN=pk.xxx AUTO_INSTALL_DATASET=1 bash

# Install without starting
curl ... | VITE_MAPBOX_TOKEN=pk.xxx SKIP_START=1 bash
```

### Post-Install

**Docker:**
```bash
cd project_nomad
docker compose logs -f    # View logs
docker compose down         # Stop
docker compose up -d        # Start
```

**Metal:**
```bash
cd project_nomad
npm run start    # Production mode
npm run dev      # Development mode
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Docker not available" | Install Docker Desktop |
| "Node.js too old" | Install Node.js >= 20 |
| "GDAL not found" | `sudo apt-get install gdal-bin` |
| "MapBox token required" | Get free token at mapbox.com |

---

## Interactive Installer

For full control over all options (ACN mode, custom database, OIDC auth, etc.), use the interactive wizard.

### Prerequisites

- **Git** - to clone the repository
- Docker & Docker Compose (Docker mode) or Node.js >= 20 (Metal mode)
- ~55GB disk space for the FireSTARR dataset

### Installation

```bash
git clone https://github.com/WISE-Developers/project_nomad.git
cd project_nomad
./install.sh
```

The wizard will guide you through:
1. **Deployment Mode** - SAN (standalone) or ACN (agency)
2. **Infrastructure** - Docker or Metal
3. **Dataset** - Download new or use existing
4. **FireSTARR Binary** - Download or use existing (Metal only)

### Start the Application

**Docker:**
```bash
docker compose up -d
```
Access at `http://<hostname>:3901`

**Metal:**
```bash
npm start
```
Access at `http://<hostname>:4901`

---

## Available Installers

| Script | Platform | Mode | Use Case |
|--------|----------|------|----------|
| `install-nomad-san-docker.sh` | Linux/macOS | Docker | Quick start, no dependencies |
| `install-nomad-san-metal.sh` | Linux/macOS | Metal | Native performance |
| `install-nomad-san-docker.ps1` | Windows | Docker | PowerShell users |
| `./install.sh` (interactive) | All | Any | Full configuration |

---

## Need Help?

- **Documentation**: See `README.md` and `Documentation/` folder
- **Issues**: https://github.com/WISE-Developers/project_nomad/issues
- **Original Installer**: Use `./install.sh` from a git clone

## License

Project Nomad is licensed under AGPL-3.0. See `LICENSE` file for details.
