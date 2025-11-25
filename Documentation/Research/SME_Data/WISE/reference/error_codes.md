# WISE Error Codes and Troubleshooting Reference

## Document Overview

This reference documents error handling patterns, error codes, and troubleshooting strategies for the WISE fire modeling system based on analysis of the WiseGuy implementation and wise_js_api integration patterns.

## Error Categories

WISE errors fall into five primary categories:

1. **Validation Errors** - Input parameter validation failures
2. **Connection Errors** - Network/socket communication failures
3. **Execution Errors** - Model execution and processing failures
4. **Configuration Errors** - System configuration and setup issues
5. **Resource Errors** - File system, memory, and timeout issues

---

## 1. Validation Errors

### Error Category: `VALIDATION_ERROR`

Validation errors occur during model building when input parameters fail validation checks before job execution.

#### Common Validation Error Codes

| Error Code | Description | Common Causes |
|------------|-------------|---------------|
| `validation-failed` | General model validation failure | Invalid model configuration, missing required parameters |
| `ignition-invalid` | Ignition geometry validation failed | Invalid coordinates, unclosed polygons, self-intersecting geometries |
| `FGMJ_CREATION_FAILED` | Failed to generate FGMJ file | Builder API errors, invalid job structure |
| `INVALID_COORDINATES` | Coordinate validation failed | Out-of-bounds lat/lon, invalid coordinate pairs |
| `INVALID_FUEL_TYPE` | Fuel type not recognized | Unknown fuel code, missing fuel definition |
| `INVALID_WEATHER_DATA` | Weather parameters out of range | Temperature/humidity/wind outside valid ranges |
| `INVALID_TEMPORAL_RANGE` | Invalid time range specified | End time before start time, duration <= 0 |

#### Validation Error Response Format

```typescript
{
  valid: false,
  errors: string[],
  warnings?: string[]
}
```

#### Example Validation Error

```javascript
{
  valid: false,
  errors: [
    "Point ignition caused 3 validation error(s): 'coordinates' is invalid for 'ignition': Invalid latitude value -95.0 (must be between -90 and 90)..."
  ],
  warnings: []
}
```

#### Validation Tree Structure

WISE uses hierarchical validation trees where errors can be nested:

```javascript
function handleErrorNode(node) {
    if (node.children.length == 0) {
        // Leaf node - actual error
        console.error(`'${node.getValue()}' is invalid for '${node.propertyName}': "${node.message}"`);
    } else {
        // Branch node - recurse through children
        node.children.forEach(child => handleErrorNode(child));
    }
}
```

**Leaf Node Error Example:**
```
'85' is invalid for 'fuelType': "Fuel type 85 is not defined in lookup table"
```

**Branch Node Error Example:**
```
Ignition validation failed:
  └─ Polygon validation failed:
      └─ Coordinate validation failed:
          └─ 'coordinates[0]' is invalid: "Polygon is not closed (first and last coordinates must match)"
```

---

## 2. Connection Errors

### Error Category: `CONNECTION_ERROR`

Connection errors occur when communication with WISE Builder fails.

#### Common Connection Error Codes

| Error Code | Description | Common Causes |
|------------|-------------|---------------|
| `CONNECTION_FAILED` | Cannot establish socket connection | Builder not running, incorrect host/port, network issues |
| `CONNECTION_TIMEOUT` | Connection attempt timed out | Builder overloaded, network latency |
| `MQTT_CONNECTION_FAILED` | MQTT broker unreachable | MQTT broker not running, incorrect credentials |
| `SOCKET_ERROR` | Socket communication error | Connection dropped mid-operation |
| `BUILDER_NOT_RESPONDING` | Builder not responding to requests | Builder process hung or crashed |

#### Connection Test Result Format

```typescript
{
  connected: boolean,
  latency: number,  // -1 if failed
  errors: string[],
  engineInfo?: {
    name: string,
    version: string,
    status: 'ready' | 'busy' | 'error'
  }
}
```

#### Example Connection Error

```javascript
{
  connected: false,
  latency: -1,
  errors: ["WISE connection failed: connect ECONNREFUSED 127.0.0.1:32479"]
}
```

#### Troubleshooting Connection Issues

**Step 1: Verify Builder is Running**
```bash
# Check if WISE Builder process is active
ps aux | grep WISE_Builder
```

**Step 2: Test Socket Connection**
```bash
# Test if Builder port is accessible
telnet localhost 32479
```

**Step 3: Verify Environment Variables**
```javascript
const BUILDER_HOST = process.env.WISE_BUILDER_HOST;
const BUILDER_PORT = Number(process.env.WISE_BUILDER_PORT);

console.log(`Connecting to WISE Builder at ${BUILDER_HOST}:${BUILDER_PORT}`);
```

**Step 4: Check MQTT Broker**
```javascript
const MQTT_HOST = process.env.WISE_BUILDER_MQTT_HOST;
const MQTT_PORT = process.env.WISE_BUILDER_MQTT_PORT;

// Verify MQTT credentials
const MQTT_USERNAME = process.env.WISE_BUILDER_MQTT_USER;
const MQTT_PASSWD = process.env.WISE_BUILDER_MQTT_PASS;
```

---

## 3. Execution Errors

### Error Category: `EXECUTION_ERROR`

Execution errors occur during model run after successful job creation.

#### Common Execution Error Codes

| Error Code | Description | Common Causes |
|------------|-------------|---------------|
| `execution-failed` | Model execution failed | WISE engine error, invalid model state |
| `execution-error` | Critical execution error | Unhandled exception during model run |
| `WISE_EXECUTION_ERROR` | WISE-specific execution failure | Engine-level error, corrupted input data |
| `FGMJ_FILE_NOT_FOUND` | FGMJ file missing | Builder failed to create job file |
| `OUTPUT_GENERATION_FAILED` | Failed to generate outputs | Write permissions, disk space issues |
| `PARTIAL_SUCCESS` | Job completed with warnings | Some outputs generated, some failed |
| `TIMEOUT` | Job exceeded time limit | Complex model, insufficient resources |

#### Execution Error Response Format

```typescript
{
  jobId: string,
  status: 'failed',
  engine: string,
  engineVersion: string,
  startTime: Date,
  endTime: Date,
  duration: number,
  error: {
    code: string,
    message: string,
    details?: any
  },
  metadata: {
    ignitionType: 'point' | 'polygon' | 'line' | 'existing',
    ignitionData: any,
    duration: number,
    options: any
  }
}
```

#### Example Execution Error

```javascript
{
  jobId: "wise-point-1700000000000-abc123xyz",
  status: "failed",
  engine: "WISE",
  engineVersion: "1.0.6-beta.5",
  error: {
    code: "WISE_EXECUTION_ERROR",
    message: "FGMJ file not found: /jobs/job_20240625064422915/job.fgmj",
    details: {
      expectedPath: "/jobs/job_20240625064422915/job.fgmj",
      jobName: "job_20240625064422915"
    }
  }
}
```

#### Execution Status Tracking

WISE jobs go through multiple status states:

```
PENDING → VALIDATING → RUNNING → COMPLETED/FAILED/TIMEOUT
```

**Status Values:**
- `pending` - Job created but not started
- `running` - Job executing (FGMJ created, WISE engine processing)
- `completed` - Job finished successfully
- `failed` - Job failed with errors
- `cancelled` - Job cancelled by user
- `timeout` - Job exceeded time limit

#### MQTT Event Monitoring for Errors

```javascript
const manager = new JobManager(jobName);

manager.on('statisticsReceived', (args) => {
    // Monitor progress
    args.statistics.forEach(stat => {
        console.log(`${stat.key}: ${stat.value}`);
    });
});

manager.on('error', (error) => {
    // Handle execution errors
    console.error('WISE execution error:', error);
});

manager.on('scenarioComplete', (args) => {
    // Check for completion status
    if (args.errorCount > 0) {
        console.error(`Job completed with ${args.errorCount} errors`);
    }
});
```

---

## 4. Configuration Errors

### Error Category: `CONFIGURATION_ERROR`

Configuration errors occur when system setup or environment is incorrect.

#### Common Configuration Error Codes

| Error Code | Description | Common Causes |
|------------|-------------|---------------|
| `MISSING_ENV_VARIABLE` | Required environment variable not set | Incomplete .env configuration |
| `INVALID_DATASET_PATH` | Dataset files not found | Incorrect path, missing files |
| `MISSING_PROJECTION_FILE` | Projection file (.prj) not found | Incomplete dataset |
| `MISSING_FUEL_MAP` | Fuel map file not found | Incomplete dataset |
| `MISSING_ELEVATION_DATA` | Elevation raster not found | Optional but may be required |
| `INVALID_LUT_FILE` | Lookup table invalid or missing | Corrupted or missing fuel definitions |

#### Required Environment Variables

```bash
# WISE Builder Connection
WISE_BUILDER_HOST=localhost
WISE_BUILDER_PORT=32479

# MQTT Configuration
WISE_BUILDER_MQTT_HOST=localhost
WISE_BUILDER_MQTT_PORT=1883
WISE_BUILDER_MQTT_TOPIC=wise/events
WISE_BUILDER_MQTT_USER=username
WISE_BUILDER_MQTT_PASS=password

# Dataset Configuration
CONTAINER_DATASET_PATH=/path/to/dataset
CONTAINER_DATASET_BBOXFILE=bbox.txt
CONTAINER_DATASET_LUTFILE=fuel.lut
CONTAINER_DATASET_PROJFILE=projection.prj
CONTAINER_DATASET_ELEVATION_RASTER=elevation.tif
CONTAINER_DATASET_FUEL_RASTER=fuelmap.tif

# Job Management
WISE_PROJECT_JOBS_FOLDER=/path/to/jobs
WISE_INTERNAL_RAIN_FOLDER=/path/to/rain
CONTAINER_WISE_BIN_PATH=/usr/local/bin/WISE

# Model Configuration
MODEL_TIMEOUT=300000  # 5 minutes in milliseconds
PERIMETER_DISPLAY_INTERVAL_HOURS=1
MODEL_TIMZEONE_OFFSET=America/Edmonton
```

#### Environment Variable Validation

```javascript
function checkConstants() {
    const required = [
        'WISE_BUILDER_HOST',
        'WISE_BUILDER_PORT',
        'WISE_PROJECT_JOBS_FOLDER',
        'CONTAINER_DATASET_PATH',
        'CONTAINER_DATASET_LUTFILE',
        'CONTAINER_DATASET_PROJFILE',
        'CONTAINER_DATASET_FUEL_RASTER'
    ];

    for (const constant of required) {
        if (!process.env[constant]) {
            console.error(`ERROR: Missing Constant! ${constant} is not set!`);
            process.exit(1);
        }
    }
}
```

---

## 5. Resource Errors

### Error Category: `RESOURCE_ERROR`

Resource errors occur when system resources are exhausted or unavailable.

#### Common Resource Error Codes

| Error Code | Description | Common Causes |
|------------|-------------|---------------|
| `TIMEOUT` | Job execution timeout | Complex model, MODEL_TIMEOUT too low |
| `OUT_OF_MEMORY` | Insufficient memory | Large datasets, memory leak |
| `DISK_SPACE_FULL` | Insufficient disk space | Output folder full |
| `FILE_WRITE_ERROR` | Cannot write output files | Permission issues, disk full |
| `TOO_MANY_JOBS` | Job queue full | System overloaded |

#### Timeout Configuration

```javascript
// Default: 5 minutes (300000 ms)
const MODEL_TIMEOUT = process.env.MODEL_TIMEOUT ?
    parseInt(process.env.MODEL_TIMEOUT) : 300000;

// Timeout handling
const timeoutId = setTimeout(() => {
    console.log('⏰ TIMEOUT: Killing process after timeout');
    childProcess.kill('SIGTERM');
}, MODEL_TIMEOUT);
```

#### Job Result Status After Timeout

```javascript
{
    jobId: "wise-point-1700000000000-abc123xyz",
    status: "timeout",
    finalStatus: "TIMEOUT",
    resultType: "timeout",
    error: {
        code: "TIMEOUT",
        message: "Job killed after timeout",
        details: {
            timeout: 300000,
            jobName: "job_20240625064422915"
        }
    }
}
```

---

## Error Response Patterns

### Abstraction Layer Error Format

The Fire Engine Abstraction Layer standardizes error responses:

```typescript
interface ModelingResult {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Engine Manager Error Handling

```typescript
// Engine not found
throw new Error(`Engine '${engineName}' not found. Available engines: ${this.listEngines().join(', ')}`);

// Validation failure
throw new Error(`Engine '${engineName}' validation failed: ${validation.errors.join(', ')}`);

// Connection failure
throw new Error(`Engine '${engineName}' connection failed: ${connectionTest.errors.join(', ')}`);

// Capability not supported
throw new Error(`Active engine '${this.activeEngine.getName()}' does not support point ignition`);

// No active engine
throw new Error('No active engine set. Use setActiveEngine() first.');
```

---

## Common Error Scenarios and Solutions

### Scenario 1: Point Ignition Validation Failure

**Error:**
```
Point ignition caused model to become invalid: 'coordinates' is invalid for 'ignition'
```

**Cause:** Invalid latitude/longitude values

**Solution:**
```javascript
// Validate coordinates before adding ignition
if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude ${lat} (must be -90 to 90)`);
}
if (lon < -180 || lon > 180) {
    throw new Error(`Invalid longitude ${lon} (must be -180 to 180)`);
}

const latLongObj = new modeller.globals.LatLon(lat, lon);
const ignition = prom.addPointIgnition(latLongObj, startTime);

// Validate model after adding ignition
if (!prom.isValid()) {
    const errors = prom.checkValid();
    console.error('Model validation failed:', errors);
}
```

### Scenario 2: Polygon Ignition Not Closed

**Error:**
```
Polygon is not closed (first and last coordinates must match)
```

**Cause:** Polygon coordinates array doesn't form a closed ring

**Solution:**
```javascript
// Ensure polygon is closed
const coords = polygon.coordinates[0].map(pair =>
    new modeller.globals.LatLon(pair[1], pair[0])
);

// Check if polygon is closed
const first = coords[0];
const last = coords[coords.length - 1];

if (first.lat !== last.lat || first.lon !== last.lon) {
    coords.push(coords[0]); // Close the polygon
}

const ignition = prom.addPolygonIgnition(coords, startTime);
```

### Scenario 3: FGMJ File Not Found

**Error:**
```
FGMJ file not found: /jobs/job_20240625064422915/job.fgmj
```

**Cause:** Builder failed to create FGMJ or job folder path incorrect

**Solution:**
```javascript
// Create job via Builder
const wrapper = await prom.beginJobPromise();
const jobName = wrapper.name.replace(/^\s+|\s+$/g, "");
const jobPath = `${process.env.WISE_PROJECT_JOBS_FOLDER}/${jobName}`;
const fgmjPath = `${jobPath}/job.fgmj`;

// Verify FGMJ was created
const fs = require('fs');
if (!fs.existsSync(fgmjPath)) {
    throw new Error(`FGMJ file not found: ${fgmjPath}`);
}

console.log(`✅ FGMJ created: ${fgmjPath}`);
```

### Scenario 4: Connection Refused

**Error:**
```
connect ECONNREFUSED 127.0.0.1:32479
```

**Cause:** WISE Builder not running or wrong port

**Solution:**
```bash
# 1. Check if Builder is running
ps aux | grep WISE_Builder

# 2. Start Builder if needed
/usr/local/bin/WISE_Builder &

# 3. Verify port in environment
echo $WISE_BUILDER_PORT

# 4. Test connection
telnet localhost 32479
```

### Scenario 5: Model Timeout

**Error:**
```
Job killed after timeout (300000ms)
```

**Cause:** Model complexity exceeds timeout limit

**Solution:**
```bash
# Increase timeout in .env
MODEL_TIMEOUT=600000  # 10 minutes

# Or for very complex models
MODEL_TIMEOUT=1800000  # 30 minutes
```

```javascript
// Implement progressive timeout strategy
const complexityFactor = calculateModelComplexity(ignitionData);
const dynamicTimeout = BASE_TIMEOUT * complexityFactor;

console.log(`Setting timeout to ${dynamicTimeout}ms based on model complexity`);
```

### Scenario 6: Partial Success

**Error:**
```
Model completed with warnings: Some outputs generated, some failed
```

**Cause:** Non-critical errors during output generation

**Solution:**
```javascript
// Handle partial success gracefully
if (result.finalStatus === 'PARTIAL_SUCCESS') {
    console.log(`⚠️ Partial success: ${result.resultType}`);

    // Check which outputs are available
    if (result.outputs.kmlFiles && result.outputs.kmlFiles.length > 0) {
        console.log(`✅ KML outputs available: ${result.outputs.kmlFiles.length}`);
    }

    if (result.outputs.statisticsFiles && result.outputs.statisticsFiles.length > 0) {
        console.log(`✅ Statistics available`);
    }

    // Proceed with available outputs
    return { success: true, partialSuccess: true, result };
}
```

---

## Logging and Debugging

### WISE Logger Configuration

```javascript
const modeller = require('WISE_JS_API');

// Set log level
modeller.globals.WISELogger.getInstance().setLogLevel(
    modeller.globals.WISELogLevel.VERBOSE  // 1 - Most detailed
    // modeller.globals.WISELogLevel.DEBUG    // 2 - Debug info
    // modeller.globals.WISELogLevel.INFO     // 3 - Informational
    // modeller.globals.WISELogLevel.WARN     // 4 - Warnings only
    // modeller.globals.WISELogLevel.NONE     // 5 - Silent
);

// Log custom messages
modeller.globals.WISELogger.getInstance().info("Job started");
modeller.globals.WISELogger.getInstance().error("Job failed");
```

### Error Logging Pattern

```javascript
try {
    console.log(`🔄 Starting model for ${fireId}`);
    const result = await executeModel(fireData);
    console.log(`✅ Model complete: ${result.jobId}`);
} catch (error) {
    console.error(`❌ CRITICAL ERROR: ${error.message}`);
    console.error(`📍 Stack trace:`, error.stack);

    // Log to database/file
    await logError({
        fireId,
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        context: { fireData }
    });
}
```

### Status Icons for Error Reporting

```javascript
function getErrorIcon(errorType) {
    switch (errorType) {
        case 'validation-failed': return '❌';
        case 'ignition-invalid': return '🔥';
        case 'execution-failed':
        case 'execution-error': return '⚠️';
        case 'timeout': return '⏰';
        case 'connection-error': return '🔌';
        default: return '❓';
    }
}

function getFriendlyStatus(errorType) {
    switch (errorType) {
        case 'validation-failed': return 'Model validation failed';
        case 'ignition-invalid': return 'Invalid ignition point';
        case 'execution-failed': return 'Model execution failed';
        case 'execution-error': return 'Critical execution error';
        case 'timeout': return 'Job exceeded time limit';
        default: return `Error: ${errorType}`;
    }
}
```

---

## Recovery Strategies

### Automatic Retry Pattern

```javascript
async function executeWithRetry(jobFunction, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${maxRetries}`);
            return await jobFunction();
        } catch (error) {
            console.error(`Attempt ${attempt} failed: ${error.message}`);

            if (attempt === maxRetries) {
                throw error; // Final attempt failed
            }

            // Exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

### Fallback Strategies

```javascript
// Strategy 1: Polygon to Point Ignition Fallback
if (polygonValidation.failed) {
    console.log('⚠️ Polygon invalid, falling back to centroid point');
    const centroid = turf.centroid(polygonGeometry);
    const pointIgnition = createPointIgnition(centroid);
    return pointIgnition;
}

// Strategy 2: Connection Failover
async function connectWithFailover(primaryHost, backupHost) {
    try {
        return await connect(primaryHost);
    } catch (error) {
        console.log(`⚠️ Primary connection failed, trying backup`);
        return await connect(backupHost);
    }
}

// Strategy 3: Graceful Degradation
if (elevationData.missing) {
    console.log('⚠️ Elevation data missing, using flat terrain assumption');
    options.elevation = 0;
    options.slope = 0;
}
```

### Error Recovery Workflow

```
1. DETECT ERROR
   ↓
2. LOG ERROR DETAILS
   ↓
3. CLASSIFY ERROR TYPE
   ↓
4. CHECK IF RETRYABLE
   ├─ YES → RETRY WITH BACKOFF
   └─ NO → ATTEMPT FALLBACK
       ├─ FALLBACK SUCCESS → CONTINUE WITH WARNING
       └─ FALLBACK FAILS → FAIL GRACEFULLY
```

---

## Best Practices

### 1. Pre-Execution Validation

```javascript
// Validate ALL inputs before starting job
async function validateBeforeExecution(inputs) {
    const errors = [];

    if (!inputs.ignition) errors.push('Missing ignition data');
    if (!inputs.startTime) errors.push('Missing start time');
    if (!inputs.duration || inputs.duration <= 0) errors.push('Invalid duration');

    // Validate coordinates
    if (inputs.ignition.type === 'point') {
        if (inputs.ignition.lat < -90 || inputs.ignition.lat > 90) {
            errors.push(`Invalid latitude: ${inputs.ignition.lat}`);
        }
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
}
```

### 2. Comprehensive Error Context

```javascript
// Include context in all errors
throw new Error(JSON.stringify({
    code: 'VALIDATION_FAILED',
    message: 'Point ignition validation failed',
    context: {
        fireId: 'FS001-25',
        lat: 62.5,
        lon: -114.3,
        timestamp: new Date().toISOString()
    }
}));
```

### 3. Graceful Error Handling

```javascript
// Continue processing other items on error
for (const fire of fireList) {
    try {
        await processFire(fire);
        successCount++;
    } catch (error) {
        console.error(`❌ Failed to process ${fire.id}: ${error.message}`);
        failedFires.push({ fire, error: error.message });
        failureCount++;
        // Continue with next fire instead of crashing
    }
}

console.log(`Processed: ${successCount} success, ${failureCount} failed`);
```

### 4. Detailed Status Reporting

```javascript
// Provide detailed status updates
console.log('=====================================================');
console.log('📊 PROCESSING SUMMARY:');
console.log(`✅ Successful models: ${successfulModels}`);
console.log(`❌ Failed/Skipped models: ${failedModels}`);
console.log(`⚠️ Partial success: ${partialSuccessModels}`);
console.log(`⏰ Timeouts: ${timeoutModels}`);
console.log(`📊 Total processed: ${totalProcessed}`);
console.log('=====================================================');
```

---

## Quick Reference Table

| Symptom | Likely Category | First Check | Quick Fix |
|---------|----------------|-------------|-----------|
| "ECONNREFUSED" | Connection | Builder running? | Start WISE Builder |
| "validation failed" | Validation | Check input params | Validate coordinates/ranges |
| "FGMJ not found" | Execution | Job folder exists? | Check WISE_PROJECT_JOBS_FOLDER |
| "timeout" | Resource | MODEL_TIMEOUT value | Increase timeout |
| "ignition-invalid" | Validation | Geometry valid? | Check polygon closure |
| "MQTT connection failed" | Connection | MQTT broker running? | Check MQTT credentials |
| "fuel type invalid" | Configuration | LUT file correct? | Verify fuel definitions |
| Partial outputs | Execution | Disk space? | Check permissions and space |

---

## Related Documentation

- **Job Management:** `/Users/franconogarin/localcode/wiseguy/WISEKB/07-job-management.md`
- **Best Practices:** `/Users/franconogarin/localcode/wiseguy/WISEKB/11-best-practices.md`
- **Design Patterns:** `/Users/franconogarin/localcode/wiseguy/WISEKB/03-design-patterns.md`
- **Engine Abstraction:** `/Users/franconogarin/localcode/wiseguy/src/engines/WISEEngine.ts`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-25
**Source Repository:** WiseGuy - Fire Engine Abstraction Layer
**Author:** Sage (WISE SME)
