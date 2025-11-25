# WISE Configuration Reference

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Author**: Sage (WISE SME)
**Purpose**: Comprehensive configuration reference for WISE fire modeling system

## Overview

This document provides detailed configuration options for the WISE (Wildfire Intelligence and Simulation Engine) fire modeling system, covering server connections, Builder API settings, Docker deployment, environment variables, and performance tuning.

---

## Table of Contents

1. [Server Configuration](#server-configuration)
2. [WISE Builder Connection](#wise-builder-connection)
3. [MQTT Event System Configuration](#mqtt-event-system-configuration)
4. [Environment Variables](#environment-variables)
5. [Docker Service Configuration](#docker-service-configuration)
6. [Dataset Configuration](#dataset-configuration)
7. [Output Configuration](#output-configuration)
8. [Performance Tuning](#performance-tuning)
9. [Job Management Configuration](#job-management-configuration)
10. [Security Configuration](#security-configuration)

---

## Server Configuration

### ServerConfiguration Class

The `ServerConfiguration` class provides the core connection settings for WISE Builder and MQTT services.

**TypeScript Definition:**

```typescript
class ServerConfiguration {
    builderPort: number;           // WISE Builder service port
    builderAddress: string;        // WISE Builder IP/hostname
    mqttPort: number;             // MQTT broker port
    mqttAddress: string;          // MQTT broker IP/hostname
    mqttTopic: string;            // MQTT topic namespace
    mqttUsername?: string;        // MQTT authentication username
    mqttPassword?: string;        // MQTT authentication password
    exampleDirectory: string;     // Directory for example files
}
```

**Usage Example:**

```javascript
const modeller = require('wise_js_api');

// Initialize server configuration
let serverConfig = new modeller.defaults.ServerConfiguration();

// Initialize socket connection to WISE Builder
modeller.globals.SocketHelper.initialize(
    serverConfig.builderAddress,
    serverConfig.builderPort
);
```

**Default Values:**

- `builderAddress`: `"localhost"`
- `builderPort`: `32479`
- `mqttAddress`: `"localhost"`
- `mqttPort`: `1883`
- `mqttTopic`: `"wise"`

---

## WISE Builder Connection

### Socket Connection Initialization

WISE uses socket-based communication with the Builder service for all computational operations.

**Configuration Pattern:**

```javascript
// Method 1: Using ServerConfiguration defaults
let serverConfig = new defaults.ServerConfiguration();
globals.SocketHelper.initialize(
    serverConfig.builderAddress,
    serverConfig.builderPort
);

// Method 2: Direct configuration
globals.SocketHelper.initialize('192.168.1.100', 32479);

// Method 3: Environment-based configuration
const BUILDER_HOST = process.env.WISE_BUILDER_HOST || 'localhost';
const BUILDER_PORT = Number(process.env.WISE_BUILDER_PORT) || 32479;

globals.SocketHelper.initialize(BUILDER_HOST, BUILDER_PORT);
```

### Connection Validation

```javascript
// Validate server configuration before use
if (serverConfig.builderAddress.includes('localhost') && isProduction) {
    throw new Error('Production environment should not use localhost');
}

// Log configuration for debugging
serverConfig.log();
```

### Connection Timeout Configuration

```javascript
// Set custom timeout for Builder operations (milliseconds)
const BUILDER_TIMEOUT = 60000; // 60 seconds

// Configure in environment
process.env.WISE_BUILDER_TIMEOUT = '60000';
```

---

## MQTT Event System Configuration

MQTT provides real-time event monitoring for long-running WISE jobs.

### Basic MQTT Configuration

```javascript
const serverConfig = new defaults.ServerConfiguration();

// MQTT connection settings
const mqttConfig = {
    address: serverConfig.mqttAddress,      // 'localhost' or MQTT broker IP
    port: serverConfig.mqttPort,            // 1883 (default) or custom
    topic: serverConfig.mqttTopic,          // 'wise' or custom namespace
    username: serverConfig.mqttUsername,    // Optional authentication
    password: serverConfig.mqttPassword     // Optional authentication
};
```

### Environment Variable Configuration

```javascript
const MQTT_HOST = process.env.WISE_BUILDER_MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.WISE_BUILDER_MQTT_PORT || 1883;
const MQTT_NAMESPACE = process.env.WISE_BUILDER_MQTT_TOPIC || 'wise';
const MQTT_USERNAME = process.env.WISE_BUILDER_MQTT_USER;
const MQTT_PASSWORD = process.env.WISE_BUILDER_MQTT_PASS;
```

### JobManager MQTT Setup

```javascript
const client = require('wise_js_api/client');

// Create job manager for MQTT event monitoring
const jobManager = new client.JobManager(jobName);

// Subscribe to events
jobManager.on('statisticsReceived', (args) => {
    console.log('Statistics update:', args.statistics);
});

jobManager.on('scenarioComplete', (args) => {
    console.log('Scenario completed:', args.scenarioName);
});

jobManager.on('error', (error) => {
    console.error('MQTT Error:', error);
});
```

### Reconnection Configuration

```javascript
const jobEventManager = {
    reconnectDelay: 5000,           // Delay between reconnection attempts (ms)
    maxReconnectAttempts: 5,        // Maximum reconnection attempts
    connectionTimeout: 10000        // Connection timeout (ms)
};
```

---

## Environment Variables

### Core WISE Variables

```bash
# WISE Builder Connection
WISE_BUILDER_HOST=localhost          # Builder service hostname/IP
WISE_BUILDER_PORT=32479              # Builder service port
WISE_BUILDER_TIMEOUT=60000           # Connection timeout (ms)

# MQTT Event System
WISE_BUILDER_MQTT_HOST=localhost     # MQTT broker hostname/IP
WISE_BUILDER_MQTT_PORT=1883          # MQTT broker port
WISE_BUILDER_MQTT_TOPIC=wise         # MQTT topic namespace
WISE_BUILDER_MQTT_USER=              # MQTT username (optional)
WISE_BUILDER_MQTT_PASS=              # MQTT password (optional)

# Job Management
WISE_PROJECT_JOBS_FOLDER=/wise/jobs  # Job output directory
WISE_INTERNAL_RAIN_FOLDER=/wise/rain # Rain grid file storage
PROJECT_JOBS_FOLDER=/wise/jobs       # Legacy variable name

# Dataset Paths
CONTAINER_DATASET_PATH=/wise/data/dataset
CONTAINER_DATASET_BBOXFILE=bbox.txt
CONTAINER_DATASET_LUTFILE=fuel_lookup_table.lut
CONTAINER_DATASET_PROJFILE=projection.prj
CONTAINER_DATASET_ELEVATION_RASTER=elevation.tif
CONTAINER_DATASET_FUEL_RASTER=fuels.tif

# WISE Binary Execution
CONTAINER_WISE_BIN_PATH=/wise/bin    # Path to WISE executable

# Timezone & Display
MODEL_TIMEZONE_OFFSET=America/Edmonton
PERIMETER_DISPLAY_INTERVAL_HOURS=1   # Hours between output perimeters

# Database Configuration (optional for job tracking)
DB_HOST=localhost
DB_PORT=27017
DB_NAME=wise_jobs
DB_USER=wise_user
DB_PASSWORD=wise_password

# Debug & Logging
DEBUG=false                          # Enable debug output
LOG_LEVEL=info                       # Logging level (debug/info/warn/error)
```

### Docker-Specific Variables

```bash
# SSH Gateway Configuration (for ARM64 → x86_64 tunnel)
WISE_SSH_HOST=your-wise-server.example.com
WISE_SSH_PORT=22
WISE_SSH_USER=wise
WISE_SSH_KEY_PATH=./docker/.ssh/wise_gateway

# Remote WISE Server
WISE_REMOTE_HOST=127.0.0.1
WISE_REMOTE_PORT=8080
WISE_SSH_TUNNEL=true

# Gateway Service
GATEWAY_PORT=3000
NODE_ENV=development

# PostgreSQL (for job tracking)
POSTGRES_HOST=wise-db
POSTGRES_PORT=5432
POSTGRES_DB=wise_jobs
POSTGRES_USER=wise
POSTGRES_PASSWORD=wise_password

# Redis (for job queuing)
REDIS_HOST=wise-redis
REDIS_PORT=6379
```

---

## Docker Service Configuration

### docker-compose.yml Overview

The WISE system uses a multi-container architecture supporting ARM64 development with x86_64 WISE execution via SSH tunneling.

### Service: wise-dev (Development Environment)

```yaml
wise-dev:
  build:
    context: .
    dockerfile: docker/Dockerfile.dev
    platforms:
      - linux/arm64
  container_name: wise-dev-environment
  ports:
    - "3000:3000"    # Development server
    - "3001:3001"    # API server
    - "9229:9229"    # Node.js debugging
  volumes:
    - .:/workspace
    - /workspace/node_modules
    - ./Dogrib_dataset:/workspace/data/dogrib:ro
    - ./output:/workspace/output
  environment:
    - NODE_ENV=development
    - WISE_REMOTE_HOST=localhost
    - WISE_REMOTE_PORT=6101
    - WISE_SSH_TUNNEL=true
  networks:
    - wise-network
  depends_on:
    - wise-api-gateway
```

**Configuration Options:**

- `NODE_ENV`: `development` | `production` | `test`
- `WISE_REMOTE_HOST`: Target WISE server hostname (via gateway)
- `WISE_REMOTE_PORT`: Target WISE server port
- `WISE_SSH_TUNNEL`: Enable SSH tunnel proxy (`true` | `false`)

### Service: wise-api-gateway (SSH Tunnel Proxy)

```yaml
wise-api-gateway:
  build:
    context: .
    dockerfile: docker/Dockerfile.gateway
    platforms:
      - linux/arm64
  container_name: wise-api-gateway
  ports:
    - "6100:6100"    # WISE API proxy
    - "6101:6101"    # WISE Builder proxy
  environment:
    - WISE_REMOTE_HOST=${WISE_SERVER_HOST:-your-work-server.com}
    - WISE_REMOTE_PORT=${WISE_SERVER_PORT:-6101}
    - SSH_TUNNEL_ENABLED=true
    - SSH_KEY_PATH=/ssh/wise_server_key
  volumes:
    - ./docker/ssh:/ssh:ro
  networks:
    - wise-network
```

**Configuration Options:**

- `WISE_REMOTE_HOST`: Remote WISE server hostname
- `WISE_REMOTE_PORT`: Remote WISE Builder port
- `SSH_TUNNEL_ENABLED`: Enable SSH tunnel (`true` | `false`)
- `SSH_KEY_PATH`: Path to SSH private key (inside container)

### Service: wise-db (PostgreSQL Database)

```yaml
wise-db:
  image: postgres:15-alpine
  container_name: wise-database
  platform: linux/arm64
  ports:
    - "5432:5432"
  environment:
    - POSTGRES_DB=wise_jobs
    - POSTGRES_USER=wise_user
    - POSTGRES_PASSWORD=${DB_PASSWORD:-wise_dev_password}
  volumes:
    - wise_db_data:/var/lib/postgresql/data
    - ./docker/sql/init.sql:/docker-entrypoint-initdb.d/init.sql
  networks:
    - wise-network
```

**Configuration Options:**

- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password (use environment variable for security)

### Service: wise-redis (Job Queue & Cache)

```yaml
wise-redis:
  image: redis:7-alpine
  container_name: wise-redis
  platform: linux/arm64
  ports:
    - "6379:6379"
  volumes:
    - wise_redis_data:/data
  networks:
    - wise-network
```

### Service: kml-enhancer (Brett Moore's KML Enhancement)

```yaml
kml-enhancer:
  build:
    context: .
    dockerfile: docker/Dockerfile.kml
    platforms:
      - linux/arm64
  container_name: wise-kml-enhancer
  ports:
    - "3002:3002"
  volumes:
    - ./contributions/brett_moore_CFS:/kml-scripts:ro
    - ./output:/workspace/output
  environment:
    - R_SCRIPT_PATH=/kml-scripts/Shp_To_KML.R
  networks:
    - wise-network
```

**Configuration Options:**

- `R_SCRIPT_PATH`: Path to KML enhancement R script

### Remote WISE Server (x86_64)

```yaml
# Deployed separately on x86_64 server
wise-server:
  image: wise/server:latest
  container_name: wise-execution-server
  platform: linux/amd64
  ports:
    - "6101:6101"
  volumes:
    - ./server-data:/wise/data
    - ./server-output:/wise/output
  environment:
    - WISE_WORKER_THREADS=4        # CPU cores for parallel processing
    - WISE_MAX_JOBS=10              # Maximum concurrent jobs
```

**Configuration Options:**

- `WISE_WORKER_THREADS`: Number of CPU cores to use (default: 4)
- `WISE_MAX_JOBS`: Maximum concurrent job limit (default: 10)

---

## Dataset Configuration

WISE requires spatial datasets including elevation (DEM), fuel types, and projection information.

### Dataset File Paths

```bash
# Base dataset directory
CONTAINER_DATASET_PATH=/wise/data/dataset

# Required dataset files
CONTAINER_DATASET_BBOXFILE=bbox.txt              # Bounding box coordinates
CONTAINER_DATASET_LUTFILE=fuel_lookup_table.lut  # Fuel type lookup table
CONTAINER_DATASET_PROJFILE=projection.prj        # Spatial reference system
CONTAINER_DATASET_ELEVATION_RASTER=elevation.tif # Digital Elevation Model
CONTAINER_DATASET_FUEL_RASTER=fuels.tif         # Fuel type raster
```

### Fuel Lookup Table (LUT) Configuration

The LUT file maps raster values to Canadian Forest Fire Behavior Prediction (FBP) fuel types.

**LUT File Format:**

```
# Fuel Type Lookup Table
# Format: RASTER_VALUE FUEL_CODE FUEL_NAME
1 C-1 Spruce-Lichen Woodland
2 C-2 Boreal Spruce
3 C-3 Mature Jack or Lodgepole Pine
4 C-4 Immature Jack or Lodgepole Pine
5 C-5 Red and White Pine
6 C-6 Conifer Plantation
7 C-7 Ponderosa Pine - Douglas-Fir
10 D-1 Leafless Aspen
11 D-2 Green Aspen
15 M-1 Boreal Mixedwood - Leafless
16 M-2 Boreal Mixedwood - Green
17 M-3 Dead Balsam Fir Mixedwood - Leafless
18 M-4 Dead Balsam Fir Mixedwood - Green
20 O-1a Matted Grass
21 O-1b Standing Grass
25 S-1 Jack or Lodgepole Pine Slash
26 S-2 White Spruce - Balsam Slash
27 S-3 Coastal Cedar - Hemlock - Douglas-Fir Slash
99 Non-Fuel Non-burnable (water, rock, urban)
```

**LUT Configuration in Code:**

```javascript
const CONTAINER_DATASET_LUTFILE = process.env.CONTAINER_DATASET_LUTFILE;
const lutPath = `${CONTAINER_DATASET_PATH}/${CONTAINER_DATASET_LUTFILE}`;

// Validate LUT file exists
const fs = require('fs');
if (!fs.existsSync(lutPath)) {
    throw new Error(`Fuel LUT file not found: ${lutPath}`);
}
```

### Projection File (.prj) Configuration

Defines the spatial reference system for the dataset.

**Example projection.prj (NAD83 UTM Zone 11N):**

```
PROJCS["NAD_1983_UTM_Zone_11N",
    GEOGCS["GCS_North_American_1983",
        DATUM["North_American_Datum_1983",
            SPHEROID["GRS_1980",6378137,298.257222101]],
        PRIMEM["Greenwich",0],
        UNIT["Degree",0.017453292519943295]],
    PROJECTION["Transverse_Mercator"],
    PARAMETER["False_Easting",500000],
    PARAMETER["False_Northing",0],
    PARAMETER["Central_Meridian",-117],
    PARAMETER["Scale_Factor",0.9996],
    PARAMETER["Latitude_Of_Origin",0],
    UNIT["Meter",1]]
```

### Bounding Box Configuration

Defines the spatial extent of the dataset.

**bbox.txt Format:**

```
# Bounding box in dataset projection units (usually meters)
# Format: xmin ymin xmax ymax
450000 5900000 550000 6000000
```

---

## Output Configuration

### Job Output Directory Structure

WISE Builder creates timestamped job folders with a standardized structure:

```
/wise/jobs/
└── job_20240625064422915/        # Timestamped job folder
    ├── job.fgmj                   # WISE job configuration file
    ├── status.json                # Job status tracking
    ├── Inputs/                    # Input files generated by Builder
    │   ├── weather_stream.txt
    │   ├── ignition.shp
    │   └── fuel_patches.shp
    └── Outputs/                   # Model results
        ├── perimeters/
        │   ├── perimeter_001.shp  # Fire perimeter shapefiles
        │   ├── perimeter_002.shp
        │   └── perimeter_003.shp
        ├── grids/
        │   ├── fire_intensity.tif
        │   ├── rate_of_spread.tif
        │   └── flame_length.tif
        ├── statistics/
        │   └── fire_statistics.csv
        └── kml/
            └── fire_animation.kmz
```

### Output Format Configuration

```javascript
// Configure output formats via WISE Builder API
const prom = new modeller.wise.WISE();

// Set job name (determines folder name)
prom.setName('Point_Ignition_Fire_2024');

// Configure output options via scenario
const scenario = prom.addScenario();

// Enable specific output types
scenario.setExportUnits(true);           // Export with units
scenario.setExportDuration(true);        // Export time duration
scenario.setExportProjection(true);      // Include projection info

// Configure perimeter output intervals
const displayInterval = process.env.PERIMETER_DISPLAY_INTERVAL_HOURS || 1;
scenario.setDisplayInterval(displayInterval * 3600); // Convert to seconds
```

### Summary Output Configuration

```javascript
async function setSummaryOptions(summary) {
    // Enable comprehensive output sections
    summary.outputs.outputApplication = true;
    summary.outputs.outputFBP = true;
    summary.outputs.outputFBPPatches = true;
    summary.outputs.outputGeoData = true;
    summary.outputs.outputIgnitions = true;
    summary.outputs.outputInputs = true;
    summary.outputs.outputLandscape = true;
    summary.outputs.outputScenario = true;
    summary.outputs.outputScenarioComments = true;
    summary.outputs.outputWxPatches = true;
    summary.outputs.outputWxStreams = true;
    summary.outputs.outputAssetInfo = true;
    summary.outputs.outputWxData = true;
}
```

### KML/KMZ Output Enhancement

Brett Moore's KML enhancement system provides optimized visualization output.

```javascript
// Configure KML enhancement
const kmlConfig = {
    includeTimespan: true,                    // Add time animation
    generateLegend: true,                     // Include legend image
    colorRamp: [                              // Fire intensity color scale
        '#EF2820',  // High intensity (red)
        '#F89E46',  // Medium-high (orange)
        '#F1FB7C',  // Medium (yellow)
        '#A6CAAD',  // Low (green)
        '#38A1D0'   // Very low (blue)
    ],
    outputDirectory: './output/kml',          // KML output path
    timezoneHandling: 'local'                 // Timezone for timestamps
};
```

---

## Performance Tuning

### Builder Connection Performance

```javascript
// Batch processing configuration
const batchConfig = {
    batchSize: 10,              // Process N jobs per batch
    batchDelay: 100,            // Delay between batches (ms)
    concurrentJobs: 5           // Maximum parallel job submissions
};

async function processBatch(jobs, config) {
    const results = [];

    for (let i = 0; i < jobs.length; i += config.batchSize) {
        const batch = jobs.slice(i, i + config.batchSize);
        const batchPromises = batch.map(job => submitJob(job));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        if (i + config.batchSize < jobs.length) {
            await new Promise(resolve =>
                setTimeout(resolve, config.batchDelay)
            );
        }
    }

    return results;
}
```

### WISE Engine Performance Settings

```bash
# Environment variables for WISE execution performance
WISE_WORKER_THREADS=4           # CPU cores for parallel processing
WISE_MAX_JOBS=10                # Maximum concurrent jobs
WISE_MEMORY_LIMIT=4096          # Memory limit in MB
WISE_THREAD_PRIORITY=normal     # Thread priority (low/normal/high)
```

### Job Execution Optimization

```javascript
// Job defaults configuration for performance
async function configureJobDefaults() {
    const jDefaults = await new modeller.defaults.JobDefaults()
        .getDefaultsPromise();

    // Configure FGM (Fire Growth Model) options
    jDefaults.fgmDefaults = {
        maxAcceleration: true,          // Enable acceleration
        distanceResolution: 1.0,        // Spatial resolution (meters)
        perimeterResolution: 1.0,       // Perimeter resolution (meters)
        minimumSpreadingROS: 0.001      // Minimum rate of spread threshold
    };

    // Configure FBP options
    jDefaults.fbpDefaults = {
        terrainEffect: true,            // Include terrain in calculations
        useGreenup: true                // Use greenup conditions
    };

    return jDefaults;
}
```

### Memory Management

```javascript
// Resource cleanup pattern
class WISEJobManager {
    constructor() {
        this.activeJobs = new Set();
        this.maxActiveJobs = 10;
    }

    async submitJob(job) {
        // Wait if at capacity
        while (this.activeJobs.size >= this.maxActiveJobs) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.activeJobs.add(job);

        try {
            const result = await this.executeJob(job);
            return result;
        } finally {
            this.activeJobs.delete(job);
        }
    }

    cleanup() {
        this.activeJobs.clear();
    }
}
```

### Grid Output Optimization

```javascript
// Configure grid output resolution for performance
const gridConfig = {
    outputResolution: 10,           // Grid cell size (meters)
    compressionLevel: 6,            // TIFF compression (1-9)
    outputFormat: 'GTiff',          // Output format
    tileSize: 256,                  // Tile size for tiled output
    enableOverviews: true           // Generate pyramid overviews
};
```

---

## Job Management Configuration

### Job Folder Configuration

```javascript
// Configure job output location
const PROJECT_JOBS_FOLDER = process.env.WISE_PROJECT_JOBS_FOLDER || '/wise/jobs';

// Validate job folder exists
const fs = require('fs');
if (!fs.existsSync(PROJECT_JOBS_FOLDER)) {
    fs.mkdirSync(PROJECT_JOBS_FOLDER, { recursive: true });
}

// Job naming pattern
function generateJobName(ignitionType, timestamp) {
    const dt = timestamp || new Date();
    const dateStr = dt.toISOString().replace(/[:-]/g, '').replace('T', '_').split('.')[0];
    return `job_${ignitionType}_${dateStr}`;
}
```

### Status Tracking Configuration

```javascript
// status.json structure
const jobStatus = {
    jobId: 'job_20240625064422915',
    status: 'running',              // pending/running/completed/failed
    startTime: '2024-06-25T06:44:22.915Z',
    endTime: null,
    progress: 0.45,                 // 0.0 to 1.0
    currentScenario: 'scenario_1',
    totalScenarios: 3,
    errors: [],
    warnings: []
};

// Write status file
const statusPath = `${jobPath}/status.json`;
fs.writeFileSync(statusPath, JSON.stringify(jobStatus, null, 2));
```

### Job Retention Policy

```javascript
// Configure job cleanup policy
const retentionConfig = {
    maxJobAge: 30,                  // Days to retain completed jobs
    maxFailedJobAge: 7,             // Days to retain failed jobs
    maxStorageSize: 100,            // GB maximum storage
    cleanupInterval: 86400          // Cleanup check interval (seconds)
};

async function cleanupOldJobs(config) {
    const now = Date.now();
    const maxAge = config.maxJobAge * 24 * 60 * 60 * 1000;

    const jobDirs = fs.readdirSync(PROJECT_JOBS_FOLDER);

    for (const jobDir of jobDirs) {
        const jobPath = path.join(PROJECT_JOBS_FOLDER, jobDir);
        const statusPath = path.join(jobPath, 'status.json');

        if (fs.existsSync(statusPath)) {
            const status = JSON.parse(fs.readFileSync(statusPath));
            const jobAge = now - new Date(status.endTime).getTime();

            if (status.status === 'completed' && jobAge > maxAge) {
                fs.rmSync(jobPath, { recursive: true, force: true });
                console.log(`Cleaned up old job: ${jobDir}`);
            }
        }
    }
}
```

---

## Security Configuration

### SSH Tunnel Configuration

For ARM64 → x86_64 remote WISE server access via SSH tunnel.

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -f ./docker/.ssh/wise_gateway -N ""

# Set proper permissions
chmod 600 ./docker/.ssh/wise_gateway
chmod 644 ./docker/.ssh/wise_gateway.pub
```

**Gateway .env Configuration:**

```bash
# SSH Connection
WISE_SSH_HOST=your-wise-server.example.com
WISE_SSH_PORT=22
WISE_SSH_USER=wise
WISE_SSH_KEY_PATH=./docker/.ssh/wise_gateway

# Remote WISE Server
WISE_REMOTE_HOST=127.0.0.1
WISE_REMOTE_PORT=8080

# Security
SSH_STRICT_HOST_KEY_CHECKING=yes
SSH_KNOWN_HOSTS=/ssh/known_hosts
```

### Authentication Configuration

```javascript
// MQTT authentication
const mqttConfig = {
    username: process.env.WISE_BUILDER_MQTT_USER,
    password: process.env.WISE_BUILDER_MQTT_PASS
};

// Never log credentials
if (mqttConfig.username) {
    console.log(`MQTT authentication enabled for user: ${mqttConfig.username}`);
} else {
    console.log('MQTT authentication disabled (anonymous)');
}
```

### Input Sanitization

```javascript
// Sanitize user inputs before processing
function sanitizeModelInputs(inputs) {
    const sanitized = {};

    // Whitelist allowed properties
    const allowedProperties = [
        'lat', 'lon', 'duration', 'fuelType',
        'elevation', 'temperature', 'windSpeed'
    ];

    allowedProperties.forEach(prop => {
        if (inputs.hasOwnProperty(prop)) {
            sanitized[prop] = inputs[prop];
        }
    });

    // Validate numeric ranges
    if (sanitized.lat < -90 || sanitized.lat > 90) {
        throw new Error('Invalid latitude');
    }

    if (sanitized.lon < -180 || sanitized.lon > 180) {
        throw new Error('Invalid longitude');
    }

    return sanitized;
}
```

### File Path Security

```javascript
// Prevent path traversal attacks
function validateJobPath(jobName) {
    // Only allow alphanumeric, underscore, hyphen
    if (!/^[a-zA-Z0-9_-]+$/.test(jobName)) {
        throw new Error('Invalid job name');
    }

    const jobPath = path.join(PROJECT_JOBS_FOLDER, jobName);

    // Ensure path is within jobs folder
    const normalizedPath = path.normalize(jobPath);
    if (!normalizedPath.startsWith(PROJECT_JOBS_FOLDER)) {
        throw new Error('Path traversal detected');
    }

    return normalizedPath;
}
```

---

## Configuration Best Practices

### Environment-Specific Configuration

```javascript
class WISEConfiguration {
    constructor(environment = 'development') {
        this.environment = environment;
        this.config = this.loadConfiguration();
    }

    loadConfiguration() {
        const baseConfig = {
            builderAddress: 'localhost',
            builderPort: 32479,
            mqttAddress: 'localhost',
            mqttPort: 1883
        };

        const envConfigs = {
            development: {
                ...baseConfig,
                debug: true,
                timeout: 30000,
                maxJobs: 5
            },
            staging: {
                ...baseConfig,
                builderAddress: process.env.WISE_BUILDER_HOST,
                debug: false,
                timeout: 60000,
                maxJobs: 10
            },
            production: {
                ...baseConfig,
                builderAddress: process.env.WISE_BUILDER_HOST,
                mqttAddress: process.env.WISE_MQTT_HOST,
                debug: false,
                timeout: 120000,
                maxJobs: 20
            }
        };

        return envConfigs[this.environment] || envConfigs.development;
    }

    validate() {
        if (this.environment === 'production' &&
            this.config.builderAddress.includes('localhost')) {
            throw new Error('Production cannot use localhost');
        }
    }

    initialize() {
        this.validate();

        modeller.globals.SocketHelper.initialize(
            this.config.builderAddress,
            this.config.builderPort
        );

        console.log(`WISE configured for ${this.environment} environment`);
    }
}
```

### Configuration Validation

```javascript
function validateConfiguration() {
    const required = [
        'WISE_BUILDER_HOST',
        'WISE_BUILDER_PORT',
        'WISE_PROJECT_JOBS_FOLDER',
        'CONTAINER_DATASET_PATH'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}`
        );
    }

    console.log('Configuration validated successfully');
}
```

---

## Related Documentation

- [WISE Technology Summary](../wise_tech_summary.md) - System overview and architecture
- [WISE I/O Reference](../wise_io.md) - Input/output specifications
- [API Overview](../../WiseGuy/WISEKB/01-api-overview.md) - wise_js_api reference
- [Best Practices](../../WiseGuy/WISEKB/11-best-practices.md) - Implementation patterns

---

**Document Maintainer**: Sage (WISE SME)
**Source Repository**: WiseGuy (`/Users/franconogarin/localcode/wiseguy/`)
**Target Project**: Project Nomad - National Fire Modeling GUI
