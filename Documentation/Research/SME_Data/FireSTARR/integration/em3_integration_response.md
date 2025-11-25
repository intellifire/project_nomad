# EasyMap 3 Integration Response for Project Nomad

**Document Version**: 1.0
**Date**: November 25, 2025
**Prepared for**: Project Nomad Fire Modeling GUI Integration
**Target Integration Date**: End of January 2026

---

## Executive Summary

EasyMap 3 (EM3) is a React + TypeScript wildfire intelligence Decision Support System (DSS) built on Mapbox GL, with an Express/TypeScript backend. The system uses a **React Context + Portal-based architecture** for integrating third-party components, making it well-suited for embedding Project Nomad's fire modeling interface.

**Integration Architecture:**
Nomad will be integrated as a **Git submodule** within EM3, allowing it to:
- Maintain its own repository and versioning
- Support both SAN (standalone) and ACN (agency-centric) deployment modes
- Use nested submodules for agency configs and optional model engines

**Key Integration Points:**
- **Repository Structure**: Git submodule at `submodules/nomad/`
- **Component Pattern**: React portal-based modals via ToolHost + ToolContext
- **Backend Integration**: Nomad routes imported directly into EM3's Express server
- **Authentication**: FusionAuth JWT-based with role-based access control
- **Spatial Data**: PostGIS via Universal Data Layer (UDL) + GeoServer proxy
- **Map Engine**: Mapbox GL JS (shared map instance possible)
- **Deployment**: Docker Compose with multi-profile support

This document addresses all integration questions raised by the Nomad team and provides specific code examples and recommendations.

---

## 1. Component Architecture

### Q: How are third-party components integrated into EasyMap 3?

**Answer: Git Submodule + React Portal-Based Modal Pattern**

Nomad will be integrated as a **Git submodule** with components rendered via EM3's **Context API + React Portal** architecture.

#### Submodule Structure

```
intellifire_easymap3/
├── src/
│   ├── backend/
│   │   └── server.ts              # Mounts Nomad routes
│   ├── components/
│   │   └── tools/
│   │       └── ToolHost.tsx       # Renders Nomad component
│   └── context/
│       └── ToolContext.tsx        # Registers 'nomad' tool
├── submodules/
│   └── nomad/                     # ← Git submodule
│       ├── src/
│       │   ├── components/        # React components (used in ACN & SAN)
│       │   │   └── ProjectNomad.tsx
│       │   ├── backend/
│       │   │   ├── routers/       # Exported for EM3 to mount (ACN)
│       │   │   │   └── nomadRouter.ts
│       │   │   └── server.ts      # Standalone server (SAN only)
│       │   └── index.ts           # Main exports for ACN consumers
│       ├── config/                # Default/generic config (in main repo)
│       └── submodules/
│           ├── config-nwt/        # NWT-specific config (optional)
│           ├── config-alberta/    # Other agency configs (optional)
│           └── engines/
│               ├── firestarr/     # FireSTARR integration (optional)
│               └── wise/          # WISE integration (optional)
├── tsconfig.json                  # Path alias: @nomad/*
└── vite.config.ts                 # Resolve alias for HMR
```

#### Import Path Configuration

To enable clean imports with Vite HMR support:

**File: `/tsconfig.json`**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@nomad/*": ["./submodules/nomad/src/*"]
    }
  }
}
```

**File: `/vite.config.ts`**
```typescript
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@nomad': path.resolve(__dirname, 'submodules/nomad/src')
    }
  }
});
```

This allows imports like:
```typescript
import ProjectNomad from '@nomad/components/ProjectNomad';
import nomadRouter from '@nomad/backend/routers/nomadRouter';
```

#### React Portal Integration Pattern

**File: `/src/context/ToolContext.tsx`** (lines 1-123)

```typescript
// ToolContext manages all integrated components
export type ToolKey =
  | 'dutylogs'
  | 'weatherStations'
  | 'wildfire'
  | 'nomad'  // ← Your component would be added here
  // ... other tools

export type ToolPayloads = {
  nomad?: {
    fireGeometry?: GeoJSON.Feature;
    fireId?: string;
    initialContext?: {
      mapExtent?: [number, number, number, number];
      selectedDate?: string;
    };
  };
  // ... other payloads
};
```

**File: `/src/components/tools/ToolHost.tsx`** (lines 24-343)

Components are registered in ToolHost and rendered via portals. Note the `@nomad` import path:

```typescript
import ProjectNomad from '@nomad/components/ProjectNomad';

const ToolHost: React.FC = () => {
  const { tools, payloads, closeTool } = useTools();

  return (
    <>
      {/* Example: Wildfire Explorer */}
      {tools.wildfire &&
        createPortal(
          <WildfireExplorer
            initialPosition={{ x: 400, y: 250 }}
            initialSize={{ width: 1200, height: 700 }}
            onClose={() => closeTool('wildfire')}
            initialFilters={payloads.wildfire?.initialFilters}
          />,
          document.body
        )}

      {/* Project Nomad - imported from submodule */}
      {tools.nomad &&
        createPortal(
          <ProjectNomad
            fireGeometry={payloads.nomad?.fireGeometry}
            fireId={payloads.nomad?.fireId}
            onClose={() => closeTool('nomad')}
            onComplete={(modelOutput) => {
              // Handle model completion
              console.log('Model complete:', modelOutput);
              closeTool('nomad');
            }}
          />,
          document.body
        )}
    </>
  );
};
```

#### Component Lifecycle

1. **Launch**: Call `openTool('nomad', payload)` from anywhere in the app
2. **Render**: ToolHost creates portal and mounts your component
3. **Execute**: Your component runs independently with full React lifecycle
4. **Return**: Call `closeTool('nomad')` or `onClose()` callback
5. **State**: Can pass data back via callbacks (see payload pattern)

**Advantages:**
- Full React component with hooks, state, context
- No iframe restrictions
- Access to shared resources (map instance, auth context)
- Clean separation of concerns

**File References:**
- Context definition: `/src/context/ToolContext.tsx`
- Component host: `/src/components/tools/ToolHost.tsx`
- Launch examples: `/src/easymap/EasyMap.tsx` (lines 127-161)

---

## 2. Authentication & Authorization

### Q: What authentication system does EasyMap 3 use?

**Answer: FusionAuth JWT with Role-Based Access Control**

EM3 uses **FusionAuth** for authentication with **JWT tokens** passed via:
1. `Authorization: Bearer <token>` header
2. `app.at` secure cookie (fallback)

#### JWT Token Structure

**File: `/src/backend/userRoles.ts`** (lines 41-78)

```typescript
// JWT payload contains:
{
  sub: "user-id-uuid",           // User ID
  email: "user@example.com",
  roles: ["admin", "FBAN"],      // Application roles
  applicationId: "...",
  scope: "openid profile email",
  exp: 1234567890,
  iat: 1234567890
}
```

#### Available User Information

From JWT token, you can extract:
- **User ID** (`sub` claim)
- **Email** (`email` claim)
- **Roles** (from FusionAuth registration)
- **Application ID** (identifies EM3 vs other apps)

#### Backend Validation

**File: `/src/backend/userRoles.ts`** (lines 84-254)

```typescript
// Middleware extracts and validates JWT
export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  // 1. Extract token from header or cookie
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader && !authHeader.startsWith('Bearer nul')) {
    token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;
  } else if (req.cookies && req.cookies['app.at']) {
    token = req.cookies['app.at'];
  }

  // 2. Extract user ID from JWT
  const userId = extractUserIdFromToken(token);

  // 3. Attach to request
  req.userId = userId;
  next();
};
```

#### Frontend Auth Protection

**File: `/src/PrivateRoute.tsx`** (lines 10-15)

```typescript
const PrivateRoute: React.FC<PrivateRouteProps> = ({ element }) => {
  const { isLoggedIn } = useFusionAuth();
  return isLoggedIn ? element : <Navigate to="/login" />;
};
```

#### How Nomad Should Validate Users

**Recommended Approach:**

1. **If Nomad runs its own backend:**
   - EM3 backend passes JWT token to Nomad backend
   - Nomad validates against FusionAuth
   - Nomad extracts roles for permission checks

2. **If Nomad is frontend-only:**
   - Nomad calls EM3 backend APIs
   - EM3 backend validates JWT (already configured)
   - No additional auth needed in Nomad

#### User Roles Available

From FusionAuth, users have roles like:
- `admin` - Full system access
- `FBAN` - Fire Behavior Analyst
- `modeler` - Fire modeler
- `user` - Basic user

**File References:**
- Auth middleware: `/src/backend/userRoles.ts`
- Frontend auth: `/src/PrivateRoute.tsx`
- FusionAuth router: `/src/backend/routers/fusionRouter.ts`

---

## 3. Spatial Data Integration

### Q: Does Nomad get direct PostGIS access or use EasyMap 3 APIs?

**Answer: Use EasyMap 3 APIs (Recommended)**

EM3 uses a **Universal Data Layer (UDL)** that abstracts MongoDB and PostGIS. **Recommendation: Use EM3's existing API endpoints** rather than direct database access.

#### Database Architecture

**File: `/src/udl/core/registry.ts`** (lines 14-81)

```typescript
// Entity Registry - shows migration status
export const udlRegistry: EntityRegistry = {
  // ✅ Migrated to PostgreSQL/PostGIS
  'stations': {
    database: 'postgresql',
    table: 'weather_stations',
    spatialColumn: 'location',    // PostGIS GEOMETRY
    jsonbColumn: 'data',           // Full document
    keyColumns: {
      'nesdis': 'nesdis',
      'region': 'region',
      'status': 'status'
    }
  },

  // ✅ Migrated to PostgreSQL/PostGIS
  'wildfires': {
    database: 'postgresql',
    table: 'wildfires',
    spatialColumn: 'geometry',     // PostGIS GEOMETRY
    jsonbColumn: 'data',
    keyColumns: {
      'fire_number': 'fire_number',
      'region': 'region',
      'wildfire_status': 'wildfire_status'
    }
  }
};
```

#### Available APIs

**Weather Stations API**

**File: `/src/backend/routers/weatherStationRouter.ts`**

```bash
GET  /api/weather-stations              # List all stations
GET  /api/weather-stations/:id          # Get single station
POST /api/weather-stations              # Create station
PUT  /api/weather-stations/:id          # Update station

# Query params: page, limit, search, region, status, sortBy, sortOrder
```

**Wildfires API**

**File: `/src/backend/routers/wildfireRouter.ts`**

```bash
GET    /api/wildfires                   # List wildfires
GET    /api/wildfires/:id               # Get single fire
POST   /api/wildfires                   # Create fire
PATCH  /api/wildfires/:id               # Update fire
DELETE /api/wildfires/:id               # Delete fire

# Query params: page, limit, search, region, status, cause, startDateFrom, etc.
```

**GeoServer Proxy API**

**File: `/src/backend/routers/geoserverRouter.ts`**

```bash
# WMS/WFS proxy (authenticated)
GET /api/geoserver/geoserver/wms?service=WMS&request=GetMap&...
GET /api/geoserver/geoserver/wfs?service=WFS&request=GetFeature&...

# Helper endpoints
GET  /api/geoserver/layers/list                        # List all layers
GET  /api/geoserver/layers/:workspace/:name/legend     # Get legend
POST /api/geoserver/layers/test                        # Test connection
```

#### Spatial Data Exchange Format

**Coordinate System**: **EPSG:4326** (WGS84 lat/long) is the primary CRS

**File: `/src/components/explorers/layerAdminExplorer/modals/ImportGeoServerModal.tsx`** (line 467)

All GeoJSON and WFS use `EPSG:4326` by default. PostGIS stores geometries in `EPSG:4326` for compatibility.

**Recommended Data Exchange:**

```typescript
// Launch Nomad with fire geometry
openTool('nomad', {
  fireGeometry: {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [-114.0719, 62.4540]  // [lon, lat] in EPSG:4326
    },
    properties: {
      fire_number: 'NT-WE-2024-001',
      fire_name: 'Test Fire',
      region: 'Dehcho'
    }
  }
});
```

#### Database Connection Details (If Direct Access Needed)

**⚠️ Not Recommended**, but available:

```bash
# PostGIS Connection (from .env)
Host: ${UDL_PG_HOST}
Port: ${UDL_PG_PORT}
Database: ${UDL_PG_DBNAME}
Username: ${UDL_PG_USERNAME}
Password: ${UDL_PG_PASSWORD}

# Schemas
- public.weather_stations
- public.wildfires
```

**File References:**
- UDL registry: `/src/udl/core/registry.ts`
- Weather API: `/src/backend/routers/weatherStationRouter.ts`
- Wildfire API: `/src/backend/routers/wildfireRouter.ts`
- GeoServer proxy: `/src/backend/routers/geoserverRouter.ts`

---

## 4. Launch Context

### Q: How will users launch Nomad from EasyMap 3?

**Answer: Multiple Entry Points Available**

EM3 supports several launch mechanisms, all using the same `openTool()` pattern.

#### 1. Right-Click Context Menu (Map Layer)

**File: `/src/easymap/EasyMap.tsx`** (lines 127-161)

```typescript
// Custom event from map layer
useEffect(() => {
  const wildfireDetailHandler = (e: any) => {
    const fireNumber = e.detail?.fireNumber;
    openTool('wildfireDetail', { fireId: fireNumber });
  };
  window.addEventListener('show-wildfire-details', wildfireDetailHandler);

  return () => {
    window.removeEventListener('show-wildfire-details', wildfireDetailHandler);
  };
}, [openTool]);
```

**For Nomad:**

```typescript
// In your map layer click handler
map.on('click', 'wildfires-layer', (e) => {
  const fireNumber = e.features[0].properties.fire_number;

  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('launch-nomad-modeler', {
    detail: {
      fireNumber,
      geometry: e.features[0].geometry,
      mapExtent: map.getBounds().toArray()
    }
  }));
});

// In EasyMap.tsx, listen for it
window.addEventListener('launch-nomad-modeler', (e) => {
  openTool('nomad', {
    fireId: e.detail.fireNumber,
    fireGeometry: e.detail.geometry,
    initialContext: {
      mapExtent: e.detail.mapExtent
    }
  });
});
```

#### 2. Top Menu Bar

**File: `/src/components/navigation/TopMenuBar.tsx`**

Add menu item:

```typescript
{
  label: 'Fire Modeling',
  action: () => openTool('nomad'),
  icon: <FontAwesomeIcon icon={faFireFlameCurved} />,
  roles: ['admin', 'FBAN', 'modeler']  // Restrict by role
}
```

#### 3. URL Query Parameters

**File: `/src/easymap/EasyMap.tsx`** (lines 104-117)

```typescript
// Supports launching via URL
// Example: /map?tool=nomad&fireId=NT-WE-2024-001

const tool = searchParams.get('tool');
const fireId = searchParams.get('fireId');

if (tool === 'nomad') {
  openTool('nomad', fireId ? { fireId } : undefined);
}
```

#### 4. Programmatic Launch

From any React component:

```typescript
import { useTools } from '@/context/ToolContext';

const MyComponent = () => {
  const { openTool } = useTools();

  return (
    <button onClick={() => openTool('nomad', {
      fireId: 'NT-WE-2024-001',
      fireGeometry: {...}
    })}>
      Launch Fire Model
    </button>
  );
};
```

#### Context Data Available at Launch

```typescript
interface NomadLaunchContext {
  // Fire identification
  fireId?: string;              // Fire number from DIP
  fireName?: string;

  // Spatial context
  fireGeometry?: GeoJSON.Feature;  // Point, line, or polygon
  mapExtent?: [number, number, number, number];  // Current map bounds
  mapCenter?: [number, number];    // Current map center
  mapZoom?: number;                // Current zoom level

  // Temporal context
  selectedDate?: string;           // ISO 8601 datetime
  dateRange?: {
    start: string;
    end: string;
  };

  // Fire metadata (from wildfire API)
  fireMetadata?: {
    region: string;
    status: string;
    cause: string;
    estimated_size: number;
    discovery_date: string;
    // ... other fields
  };
}
```

**File References:**
- Event handling: `/src/easymap/EasyMap.tsx` (lines 127-161)
- Menu bar: `/src/components/navigation/TopMenuBar.tsx`
- Tool context: `/src/context/ToolContext.tsx`

---

## 5. Data Sources

### Q: Weather data, fuel types, fire data availability?

**Answer: Comprehensive Data Sources Available**

#### Weather Data

**File: `/src/backend/routers/weatherStationRouter.ts`**

```bash
# Weather Stations API (PostgreSQL via UDL)
GET /api/weather-stations?region=Dehcho&status=active

Response:
{
  data: [{
    _id: "...",
    nesdis: "3001F5AC",
    name: "Fort Simpson A",
    region: "Dehcho",
    latitude: 61.76,
    longitude: -121.23,
    elevation: 169,
    status: "active",
    cffdrsMode: "standard"
  }],
  total: 45,
  page: 1
}
```

**File: `/src/backend/routers/weatherDataRouter.ts`**

```bash
# Weather Records API (MongoDB - not yet migrated)
GET /api/weather-data/:stationId?startDate=2024-01-01&endDate=2024-01-31

Response:
{
  data: [{
    station_id: "...",
    timestamp: "2024-01-01T12:00:00Z",
    temp: 15.5,      // °C
    rh: 45,          // %
    wspd: 12.5,      // km/h
    wdir: 270,       // degrees
    rain: 0,         // mm
    // ... CFFDRS indices
    ffmc: 85.3,
    dmc: 35.2,
    dc: 120.5,
    isi: 5.2,
    bui: 45.8,
    fwi: 12.3
  }]
}
```

**Weather Data Format:** Real-time and historical data available via:
- EM3 weather stations API
- Can integrate with SpotWX API (per your plan)
- ECCC weather data (future)

#### Fuel Types

**GeoServer WMS/WCS Layers**

**File: `/src/backend/routers/geoserverRouter.ts`**

```bash
# Available fuel type layers (via GeoServer proxy)
GET /api/geoserver/layers/list

Response includes:
{
  name: "nwt:fuel_types",
  title: "NWT Fuel Types",
  workspace: "nwt",
  layerName: "fuel_types",
  queryable: true,
  boundingBox: {...},
  styles: ["default", "fbp_fuel_types"]
}

# Access as WCS (raster)
GET /api/geoserver/geoserver/wcs?
  service=WCS&
  version=2.0.1&
  request=GetCoverage&
  coverageId=nwt:fuel_types&
  format=image/tiff

# Access as WFS (vector - if available)
GET /api/geoserver/geoserver/wfs?
  service=WFS&
  version=2.0.0&
  request=GetFeature&
  typename=nwt:fuel_types&
  outputFormat=application/json
```

**Available Fuel Type Layers:**
- NWT FBP fuel types (Canadian Fire Behavior Prediction system)
- DEM data (Digital Elevation Model)
- Slope/aspect derivatives

#### Fire Data

**Hotspot Data (MODIS/VIIRS)**

**File: `/src/easymap/liveLayers/providers/FireHotspotLayerProvider.ts`**

```typescript
// Live fire hotspot layer
// Fetches MODIS/VIIRS detections
// Available via live layer provider
```

**Fire Polygon/Point Data (DIP)**

**File: `/src/backend/routers/wildfireRouter.ts`**

```bash
# Wildfire data from DIP (PostgreSQL via UDL)
GET /api/wildfires?region=Dehcho&status=active

Response:
{
  data: [{
    _id: "...",
    fire_number: "NT-WE-2024-001",
    region: "Dehcho",
    wildfire_status: "Active",
    cause: "Lightning",
    estimated_size: 125.5,        // hectares
    estimated_start_date: "2024-07-15",
    latitude: "62.4540",          // DM.M format
    longitude: "-114.0719",
    latitudeDD: 62.756666,        // Decimal degrees
    longitudeDD: -114.119833,
    geometry: {                   // PostGIS geometry
      type: "Point",
      coordinates: [-114.119833, 62.756666]
    }
  }]
}
```

**Data Access Pattern:**

```typescript
// Example: Fetch weather and fire data for modeling
const fetchModelingInputs = async (fireId: string) => {
  // 1. Get fire data
  const fireResp = await fetch(`/api/wildfires/${fireId}`);
  const fireData = await fireResp.json();

  // 2. Get nearest weather station
  const stationsResp = await fetch(
    `/api/weather-stations?region=${fireData.region}&status=active`
  );
  const stations = await stationsResp.json();

  // 3. Get recent weather data
  const weatherResp = await fetch(
    `/api/weather-data/${stations.data[0]._id}?` +
    `startDate=${fireData.estimated_start_date}&` +
    `endDate=${new Date().toISOString().split('T')[0]}`
  );
  const weather = await weatherResp.json();

  // 4. Get fuel type at fire location (WCS)
  const fuelResp = await fetch(
    `/api/geoserver/geoserver/wcs?` +
    `service=WCS&version=2.0.1&request=GetCoverage&` +
    `coverageId=nwt:fuel_types&` +
    `subset=Lat(${fireData.latitudeDD})&` +
    `subset=Long(${fireData.longitudeDD})`
  );

  return {
    fire: fireData,
    weather: weather.data,
    stations: stations.data,
    fuelType: fuelResp
  };
};
```

**File References:**
- Weather stations: `/src/backend/routers/weatherStationRouter.ts`
- Weather data: `/src/backend/routers/weatherDataRouter.ts`
- Wildfires: `/src/backend/routers/wildfireRouter.ts`
- GeoServer: `/src/backend/routers/geoserverRouter.ts`
- Hotspots: `/src/easymap/liveLayers/providers/FireHotspotLayerProvider.ts`

---

## 6. Technical Environment

### Q: Deployment, backend services, technology constraints?

**Answer: Docker-Based Deployment with Flexible Backend Options**

#### Deployment Architecture

**Current Setup:**

```
┌─────────────────────────────────────────────────┐
│  Nginx (Reverse Proxy)                          │
│  - Serves built React app                       │
│  - Proxies /api/* to backend                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Node.js Backend (Express + TypeScript)         │
│  - Port: ${VITE_BACKEND_PORT}                   │
│  - Handles: Auth, Data APIs, GeoServer proxy    │
└─────────────────────────────────────────────────┘
                    ↓
┌──────────────┬──────────────┬──────────────────┐
│  PostgreSQL  │  MongoDB     │  GeoServer       │
│  (PostGIS)   │  (legacy)    │  (WMS/WFS)       │
└──────────────┴──────────────┴──────────────────┘
```

**File: `/vite.config.ts`** (lines 28-56)

```typescript
// Vite dev server proxies to backend
server: {
  port: frontendPort,
  proxy: {
    '/api': {
      target: `http://localhost:${backendPort}`,
      changeOrigin: true,
      secure: false,
    }
  }
}
```

**File: `/src/backend/server.ts`** (lines 1-200)

```typescript
// Backend Express server
const app = express();

// Routers
app.use('/api/weather-stations', weatherStationRouter);
app.use('/api/wildfires', wildfireRouter);
app.use('/api/geoserver', geoserverRouter);
app.use('/api/fusion', fusionRouter);
// ... more routers
```

#### Backend Integration: Submodule Import Pattern

**ACN Mode (EasyMap 3 Integration):**

Nomad's backend routes are **imported directly** from the submodule into EM3's Express server:

```typescript
// In /src/backend/server.ts
import nomadRouter from '@nomad/backend/routers/nomadRouter.js';

// Mount Nomad routes alongside other EM3 routes
app.use('/api/nomad', nomadRouter);
```

**Benefits of direct import:**
- Single process, no inter-service communication overhead
- Uses EM3's existing auth middleware seamlessly
- Follows the established router pattern (weatherStationRouter, wildfireRouter, etc.)
- Simpler deployment and debugging
- Vite HMR works for backend changes too (via tsx watch)

**SAN Mode (Standalone):**

When running standalone, Nomad uses its own Express server:

```typescript
// In submodules/nomad/src/backend/server.ts (SAN mode only)
import express from 'express';
import nomadRouter from './routers/nomadRouter.js';

const app = express();
app.use('/api/nomad', nomadRouter);
app.listen(3541);
```

**Key insight:** The same `nomadRouter.ts` is used in both modes - only the hosting server differs.

#### Where Will Model Execution Run?

**Recommended: Backend Server**

```typescript
// In nomadRouter.ts
router.post('/execute-model', authenticateUser, async (req, res) => {
  const { fireGeometry, weatherData, fuelType, modelType } = req.body;

  // 1. Prepare inputs for FireSTARR/WISE
  const inputFiles = await prepareModelInputs({
    fireGeometry,
    weatherData,
    fuelType
  });

  // 2. Execute model via shell
  const { spawn } = await import('child_process');
  const process = spawn('/path/to/firestarr', [
    '--input', inputFiles.path,
    '--output', outputPath
  ]);

  // 3. Track execution
  const modelRunId = uuid.v4();
  await saveModelRun({
    id: modelRunId,
    userId: req.userId,
    status: 'running',
    inputs: inputFiles
  });

  res.json({
    modelRunId,
    status: 'running',
    statusUrl: `/api/nomad/status/${modelRunId}`
  });

  // 4. Process completion (async)
  process.on('exit', async (code) => {
    if (code === 0) {
      const outputs = await parseModelOutputs(outputPath);
      await updateModelRun(modelRunId, {
        status: 'complete',
        outputs
      });
      // Send notification
      sendNotification(req.userId, {
        type: 'model-complete',
        modelRunId
      });
    }
  });
});
```

#### Technology Constraints

**Browser Compatibility:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- No IE11 support
- ES2020+ JavaScript

**Network/Firewall:**
- **Mapbox API**: Requires internet access to `api.mapbox.com`
- **GeoServer**: Internal network or VPN access
- **CORS**: Configured for `${VITE_CORS_ORIGIN}`

**File: `/src/backend/server.ts`** (lines 62-67)

```typescript
// CORS configuration
const allowedOrigins = process.env.VITE_CORS_ORIGIN.split(',');
// Example: https://em3.intellifirenwt.com,http://localhost:3535
```

**Deployment Process:**

```bash
# 1. Build application
npm run all:build

# 2. Docker deployment (currently manual - no compose file found)
# Using multi-profile pattern for staging/uat/prod

# 3. Environment-specific configs
VITE_TITLE_PROD=production  # or staging, testing, localDev
```

**File References:**
- Vite config: `/vite.config.ts`
- Backend server: `/src/backend/server.ts`
- CORS config: Lines 62-67 in server.ts
- Package scripts: `/package.json`

---

## 7. Model Output Storage

### Q: Where should model results be stored?

**Answer: PostgreSQL via UDL (Recommended)**

EM3's UDL system provides a clean abstraction for storing structured data. **Recommendation: Store model outputs in PostgreSQL** using the same hybrid pattern as wildfires and weather stations.

#### Storage Strategy

**Hybrid Storage Pattern:**

```sql
-- PostgreSQL table for model runs
CREATE TABLE nomad_model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fire_id VARCHAR(50),
  model_type VARCHAR(50) NOT NULL,  -- 'wise' | 'firestarr'
  run_type VARCHAR(50),             -- 'deterministic' | 'probabilistic'
  status VARCHAR(50),               -- 'queued' | 'running' | 'complete' | 'failed'

  -- Geometry columns (PostGIS)
  input_geometry GEOMETRY(GEOMETRY, 4326),

  -- JSONB for flexible storage
  data JSONB NOT NULL,              -- Full model run details

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_fire_id (fire_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Table for model outputs (one-to-many)
CREATE TABLE nomad_model_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_run_id UUID REFERENCES nomad_model_runs(id) ON DELETE CASCADE,
  output_type VARCHAR(100),         -- 'fire_perimeter' | 'intensity_grid' | etc.
  time_step INTEGER,                -- For temporal outputs

  -- Geometry column (PostGIS)
  geometry GEOMETRY(GEOMETRY, 4326),

  -- JSONB for output properties
  properties JSONB,

  -- File storage reference (if large files)
  file_path VARCHAR(500),
  file_size BIGINT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**JSONB Data Structure:**

```json
{
  "inputs": {
    "fireGeometry": {...},
    "weatherData": [...],
    "fuelType": "C-2",
    "temporal": {
      "startDate": "2024-07-15T14:00:00Z",
      "duration": 48
    }
  },
  "parameters": {
    "model": "firestarr",
    "version": "1.2.3",
    "settings": {...}
  },
  "outputs": {
    "summary": {
      "finalSize": 450.5,
      "peakIntensity": 12500,
      "maxROS": 25.3
    },
    "files": [
      {
        "type": "perimeter",
        "path": "/outputs/run-123/perimeter.geojson",
        "url": "/api/nomad/outputs/123/perimeter.geojson"
      }
    ]
  },
  "notifications": {
    "email": true,
    "webPush": true,
    "recipients": ["user@example.com"]
  }
}
```

#### API Endpoints for Storage

```bash
# Create model run
POST /api/nomad/runs
{
  "fire_id": "NT-WE-2024-001",
  "model_type": "firestarr",
  "input_geometry": {...},
  "parameters": {...}
}

# Get model runs
GET /api/nomad/runs?userId=...&status=complete

# Get model outputs
GET /api/nomad/runs/:id/outputs

# Download output file
GET /api/nomad/outputs/:runId/perimeter.geojson
```

#### Should Outputs Be Visible in EM3 Map?

**Yes - Via Layer System**

**File: `/src/easymap/layers2/WFSLayer.ts`**

```typescript
// Add model outputs as toggleable layer
const modelOutputLayer = new WFSLayer({
  id: 'nomad-model-outputs',
  name: 'Fire Model Outputs',
  source: {
    url: '/api/nomad/outputs/geojson',
    type: 'geojson'
  },
  style: {
    type: 'fill',
    paint: {
      'fill-color': '#ff6b6b',
      'fill-opacity': 0.4
    }
  }
});

// Register with LayerRegistry
const registry = LayerRegistry.getInstance(map);
registry.addLayer(modelOutputLayer);
```

**Integration Example:**

```typescript
// When model completes, add to map
const handleModelComplete = (modelRunId: string) => {
  // 1. Fetch output geometries
  const outputs = await fetch(`/api/nomad/runs/${modelRunId}/outputs`).then(r => r.json());

  // 2. Add as GeoJSON source
  map.addSource(`nomad-output-${modelRunId}`, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: outputs.map(o => ({
        type: 'Feature',
        geometry: o.geometry,
        properties: {
          outputType: o.output_type,
          timeStep: o.time_step,
          ...o.properties
        }
      }))
    }
  });

  // 3. Add layer
  map.addLayer({
    id: `nomad-output-${modelRunId}`,
    type: 'fill',
    source: `nomad-output-${modelRunId}`,
    paint: {
      'fill-color': [
        'match',
        ['get', 'outputType'],
        'fire_perimeter', '#ff6b6b',
        'ember_zone', '#ffa500',
        '#999999'
      ],
      'fill-opacity': 0.5
    }
  });

  // 4. Add to layer switcher
  addLayerToSwitcher({
    id: `nomad-output-${modelRunId}`,
    name: `Model Run ${modelRunId.slice(0, 8)}`,
    category: 'Fire Models',
    visible: true
  });
};
```

**File References:**
- UDL registry: `/src/udl/core/registry.ts`
- WFS layer: `/src/easymap/layers2/WFSLayer.ts`
- Layer registry: `/src/easymap/layers2/LayerRegistry.ts`
- Layer drawer: `/src/easymap/layerDrawer/`

---

## 8. Notification System

### Q: Does EasyMap 3 have notification infrastructure?

**Answer: GitHub Integration Available, Web Push Planned**

EM3 currently has **GitHub integration for support issues**. For model completion notifications, you'll need to implement a notification service.

#### Existing Infrastructure

**File: `/src/backend/routers/githubRouter.ts`**

```typescript
// GitHub issues API for support/bug reporting
// Not suitable for user notifications
```

**No built-in notification system currently.**

#### Recommended Notification Implementation

**Option 1: Custom Notification Service**

```typescript
// File: /src/backend/services/notificationService.ts

interface Notification {
  userId: string;
  type: 'model-complete' | 'model-failed' | 'system-alert';
  title: string;
  message: string;
  data?: any;
}

class NotificationService {
  // 1. Email notifications (via SMTP)
  async sendEmail(notification: Notification) {
    const user = await getUserById(notification.userId);

    await sendEmail({
      to: user.email,
      subject: notification.title,
      html: `
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.type === 'model-complete' ? `
          <a href="${process.env.BASE_URL}/map?tool=nomad&runId=${notification.data.runId}">
            View Results
          </a>
        ` : ''}
      `
    });
  }

  // 2. Web push notifications
  async sendWebPush(notification: Notification) {
    const subscriptions = await getPushSubscriptions(notification.userId);

    for (const sub of subscriptions) {
      await webpush.sendNotification(sub, JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: '/icon.png',
        data: notification.data
      }));
    }
  }

  // 3. In-app notifications (stored in DB)
  async createInAppNotification(notification: Notification) {
    await db.notifications.insert({
      ...notification,
      read: false,
      created_at: new Date()
    });

    // Emit via WebSocket/SSE for real-time
    io.to(notification.userId).emit('notification', notification);
  }
}

export const notificationService = new NotificationService();
```

**Option 2: Integrate with Existing System**

If NWT has an existing notification infrastructure:

```typescript
// Proxy to agency notification service
async function sendNotification(userId: string, notification: any) {
  await fetch(process.env.AGENCY_NOTIFICATION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AGENCY_NOTIFICATION_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      ...notification
    })
  });
}
```

**Implementation Example:**

```typescript
// In nomadRouter.ts
import { notificationService } from '../services/notificationService.js';

// When model completes
process.on('exit', async (code) => {
  if (code === 0) {
    await updateModelRun(modelRunId, { status: 'complete' });

    // Send notifications
    await notificationService.sendEmail({
      userId: req.userId,
      type: 'model-complete',
      title: 'Fire Model Complete',
      message: `Your ${modelType} model run for fire ${fireId} has completed successfully.`,
      data: {
        runId: modelRunId,
        fireId
      }
    });

    await notificationService.sendWebPush({
      userId: req.userId,
      type: 'model-complete',
      title: 'Fire Model Complete',
      message: `Model ${modelRunId.slice(0, 8)} finished`,
      data: { runId: modelRunId }
    });

    await notificationService.createInAppNotification({
      userId: req.userId,
      type: 'model-complete',
      title: 'Model Complete',
      message: `Fire model for ${fireId} completed`,
      data: { runId: modelRunId }
    });
  }
});
```

**Frontend Notification Display:**

```typescript
// In-app notification component
const NotificationBanner: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Listen for real-time notifications
    const socket = io('/');
    socket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="notification-banner">
      {notifications.map(n => (
        <div key={n.id} className={`notification notification-${n.type}`}>
          <h4>{n.title}</h4>
          <p>{n.message}</p>
          {n.data?.runId && (
            <button onClick={() => openTool('nomad', { runId: n.data.runId })}>
              View Results
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
```

**File References:**
- GitHub router: `/src/backend/routers/githubRouter.ts`
- Support tool: `/src/easymap/mapcontrols/SupportTool/SupportTool.tsx`

---

## Integration Recommendations

Based on the analysis above, here are our recommendations for successful integration:

### 1. Repository Structure

**✅ Use:** Git submodule with nested submodules for configs/engines

**Setup Commands:**
```bash
# Add Nomad as submodule to EM3
cd intellifire_easymap3
git submodule add <nomad-repo-url> submodules/nomad

# Initialize Nomad's nested submodules (optional, per deployment)
cd submodules/nomad
git submodule update --init submodules/config-nwt
git submodule update --init submodules/engines/firestarr
```

**Nomad Repository Structure:**
```
nomad/
├── src/
│   ├── components/           # React components (ACN & SAN)
│   ├── backend/
│   │   ├── routers/          # Exported for EM3 (ACN)
│   │   └── server.ts         # Standalone server (SAN only)
│   └── index.ts              # Main exports
├── config/                   # Default config (always included)
└── submodules/
    ├── config-nwt/           # NWT config (optional)
    ├── config-alberta/       # Other agencies (optional)
    └── engines/
        ├── firestarr/        # FireSTARR (optional)
        └── wise/             # WISE (optional)
```

### 2. Component Integration

**✅ Use:** React portal-based modal pattern with `@nomad` path alias

**Implementation Steps:**
1. Add path alias to `tsconfig.json` and `vite.config.ts` (see Section 1)
2. Add `'nomad'` to `ToolKey` type in `/src/context/ToolContext.tsx`
3. Define payload interface for launch context
4. Import and register component in `/src/components/tools/ToolHost.tsx`
5. Add menu item and/or map event listeners

**Advantages:**
- Full React component with state management
- Access to EM3 context (auth, map instance)
- Clean lifecycle management
- No iframe restrictions
- Vite HMR works across submodule boundary

### 3. Backend Architecture

**✅ Use:** Import Nomad router directly from submodule

**Nomad Router (in submodule):**
```typescript
// File: submodules/nomad/src/backend/routers/nomadRouter.ts
import express from 'express';
import type { Request, Response, Router } from 'express';

const router: Router = express.Router();

// Note: Auth middleware applied by EM3 when mounting
router.post('/runs', async (req: Request, res: Response) => {
  // Create model run
});

router.get('/runs/:id', async (req: Request, res: Response) => {
  // Get model run status
});

router.get('/runs/:id/outputs', async (req: Request, res: Response) => {
  // Get model outputs
});

export default router;
```

**Mount in EM3 server.ts:**
```typescript
import nomadRouter from '@nomad/backend/routers/nomadRouter.js';
import { authenticateUser } from './userRoles.js';

// Apply EM3's auth middleware when mounting
app.use('/api/nomad', authenticateUser, nomadRouter);
```

**Benefits:**
- Same router works in both ACN and SAN modes
- EM3 controls auth middleware application
- Single process in ACN mode

### 3. Data Storage

**✅ Use:** PostgreSQL/PostGIS via UDL pattern

**Create entity registration:**
```typescript
// In /src/udl/core/registry.ts
'nomad_runs': {
  database: 'postgresql',
  table: 'nomad_model_runs',
  schema: 'public',
  spatialColumn: 'input_geometry',
  jsonbColumn: 'data',
  keyColumns: {
    'fire_id': 'fire_id',
    'user_id': 'user_id',
    'status': 'status'
  }
}
```

### 4. Spatial Data Access

**✅ Use:** EM3 API endpoints (not direct DB access)

**Benefits:**
- Authentication already handled
- UDL abstraction (MongoDB → PostgreSQL migration transparent)
- Consistent error handling
- Logging and monitoring

### 5. Authentication

**✅ Use:** JWT tokens from EM3's FusionAuth

**Frontend:**
```typescript
// JWT automatically included in requests via FusionAuth SDK
const response = await fetch('/api/nomad/runs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(modelParams)
});
```

**Backend validates automatically:**
```typescript
router.post('/runs', authenticateUser, async (req, res) => {
  // req.userId is populated by middleware
  const userId = req.userId;
});
```

### 6. Map Integration

**✅ Use:** Shared Mapbox GL instance

**Access map from Nomad component:**
```typescript
interface NomadProps {
  map?: mapboxgl.Map;  // Pass from EasyMap
  onClose: () => void;
}

const ProjectNomad: React.FC<NomadProps> = ({ map, onClose }) => {
  // Can add layers directly to EM3 map
  const addOutputToMap = (output: GeoJSON.FeatureCollection) => {
    map?.addSource('nomad-output', {
      type: 'geojson',
      data: output
    });

    map?.addLayer({
      id: 'nomad-output',
      type: 'fill',
      source: 'nomad-output',
      paint: {
        'fill-color': '#ff6b6b',
        'fill-opacity': 0.5
      }
    });
  };
};
```

### 7. Notifications

**✅ Implement:** Custom notification service

**Priority:**
1. Email notifications (SMTP)
2. In-app notifications (DB + WebSocket)
3. Web push (PWA feature)

### 8. Deployment

**✅ Deploy:** As Git submodule within EM3

**ACN Deployment (with EM3):**
```bash
# Clone EM3 with submodules
git clone --recursive <em3-repo-url>

# Or if already cloned, initialize submodules
git submodule update --init --recursive

# Build includes submodule code automatically
npm run all:build
```

**SAN Deployment (Standalone):**
```bash
# Clone Nomad directly
git clone --recursive <nomad-repo-url>

# Initialize only needed submodules
cd nomad
git submodule update --init config/  # Default config
git submodule update --init submodules/engines/firestarr  # If using FireSTARR

# Run standalone
npm run dev  # Uses nomad/src/backend/server.ts
```

**Docker Considerations:**
```dockerfile
# In EM3 Dockerfile, ensure submodules are included
COPY --chown=node:node . .
RUN git submodule update --init --recursive
```

---

## Code Examples

### Complete Integration Example

**1. Add Nomad to ToolContext**

```typescript
// File: /src/context/ToolContext.tsx
export type ToolKey =
  | 'dutylogs'
  | 'weatherStations'
  | 'wildfire'
  | 'nomad'  // ← Add this
  | ... other tools;

export type ToolPayloads = {
  nomad?: {
    fireId?: string;
    fireGeometry?: GeoJSON.Feature;
    initialContext?: {
      mapExtent?: [number, number, number, number];
      mapCenter?: [number, number];
      selectedDate?: string;
    };
  };
  // ... other payloads
};
```

**2. Register in ToolHost**

```typescript
// File: /src/components/tools/ToolHost.tsx
import ProjectNomad from '@nomad/components/ProjectNomad';  // ← Submodule import

const ToolHost: React.FC = () => {
  const { tools, payloads, closeTool } = useTools();
  const { refreshLayers } = useLayerDrawer();

  return (
    <>
      {/* ... existing tools ... */}

      {/* Project Nomad */}
      {tools.nomad &&
        createPortal(
          <ProjectNomad
            className="windowed-explorer"
            initialPosition={{
              x: window.innerWidth <= 768 ? 10 : 300,
              y: window.innerWidth <= 768 ? 10 : 150,
            }}
            initialSize={{
              width: window.innerWidth <= 768
                ? window.innerWidth - 20
                : Math.min(1400, window.innerWidth - 320),
              height: window.innerHeight <= 768
                ? window.innerHeight - 20
                : Math.min(900, window.innerHeight - 200),
            }}
            fireId={payloads.nomad?.fireId}
            fireGeometry={payloads.nomad?.fireGeometry}
            initialContext={payloads.nomad?.initialContext}
            onClose={() => closeTool('nomad')}
            onComplete={(modelRun) => {
              console.log('Model complete:', modelRun);
              refreshLayers(); // Refresh to show new outputs
              closeTool('nomad');
            }}
          />,
          document.body
        )}
    </>
  );
};
```

**3. Add Launch Event Handler**

```typescript
// File: /src/easymap/EasyMap.tsx
useEffect(() => {
  // Listen for Nomad launch from map
  const nomadLaunchHandler = (e: any) => {
    const { fireNumber, geometry, mapExtent } = e.detail;

    openTool('nomad', {
      fireId: fireNumber,
      fireGeometry: geometry,
      initialContext: {
        mapExtent,
        selectedDate: new Date().toISOString()
      }
    });
  };

  window.addEventListener('launch-nomad', nomadLaunchHandler);

  return () => {
    window.removeEventListener('launch-nomad', nomadLaunchHandler);
  };
}, [openTool]);
```

**4. Create Nomad Component (in submodule)**

```typescript
// File: submodules/nomad/src/components/ProjectNomad.tsx
import React, { useState, useEffect } from 'react';
import './ProjectNomad.scss';

interface ProjectNomadProps {
  className?: string;
  initialPosition: { x: number; y: number };
  initialSize: { width: number; height: number };
  fireId?: string;
  fireGeometry?: GeoJSON.Feature;
  initialContext?: {
    mapExtent?: [number, number, number, number];
    mapCenter?: [number, number];
    selectedDate?: string;
  };
  onClose: () => void;
  onComplete: (modelRun: any) => void;
}

const ProjectNomad: React.FC<ProjectNomadProps> = ({
  fireId,
  fireGeometry,
  initialContext,
  onClose,
  onComplete
}) => {
  const [modelRun, setModelRun] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const executeModel = async (params: any) => {
    setLoading(true);

    try {
      const response = await fetch('/api/nomad/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fire_id: fireId,
          input_geometry: fireGeometry,
          ...params
        })
      });

      const run = await response.json();
      setModelRun(run);

      // Poll for completion
      const pollInterval = setInterval(async () => {
        const statusResp = await fetch(`/api/nomad/runs/${run.modelRunId}`);
        const status = await statusResp.json();

        if (status.status === 'complete') {
          clearInterval(pollInterval);
          setLoading(false);
          onComplete(status);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setLoading(false);
          alert('Model execution failed');
        }
      }, 5000);
    } catch (error) {
      console.error('Model execution error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="project-nomad-modal">
      <div className="project-nomad-header">
        <h2>Fire Modeling - Project Nomad</h2>
        <button onClick={onClose}>×</button>
      </div>

      <div className="project-nomad-content">
        {loading ? (
          <div>Running model...</div>
        ) : (
          <div>
            {/* Your wizard UI here */}
            <button onClick={() => executeModel({ modelType: 'firestarr' })}>
              Execute Model
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectNomad;
```

**5. Create Backend Router (in submodule)**

```typescript
// File: submodules/nomad/src/backend/routers/nomadRouter.ts
import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

// Note: UDL and auth middleware are injected by EM3 when mounting (ACN mode)
// In SAN mode, Nomad uses its own data layer

// POST /api/nomad/runs - Create model run
// Auth middleware applied by EM3: app.use('/api/nomad', authenticateUser, nomadRouter)
router.post('/runs', async (req: Request, res: Response) => {
  try {
    const { fire_id, input_geometry, model_type, parameters } = req.body;
    const userId = req.userId;

    // Create model run record
    const result = await udl.insert('nomad_runs', {
      user_id: userId,
      fire_id,
      model_type,
      run_type: parameters.runType,
      status: 'queued',
      data: {
        inputs: { input_geometry, ...parameters },
        created_at: new Date().toISOString()
      }
    });

    const modelRunId = result.insertedId;

    // Execute model asynchronously
    executeModelAsync(modelRunId, input_geometry, parameters);

    res.json({
      modelRunId,
      status: 'queued',
      statusUrl: `/api/nomad/runs/${modelRunId}`
    });
  } catch (error) {
    console.error('Error creating model run:', error);
    res.status(500).json({ error: 'Failed to create model run' });
  }
});

// GET /api/nomad/runs/:id - Get model run status
router.get('/runs/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const run = await udl.findOne('nomad_runs', { _id: id });

    if (!run) {
      res.status(404).json({ error: 'Model run not found' });
      return;
    }

    res.json(run);
  } catch (error) {
    console.error('Error fetching model run:', error);
    res.status(500).json({ error: 'Failed to fetch model run' });
  }
});

export default router;
```

**6. Mount Router in EM3 Server**

```typescript
// File: /src/backend/server.ts
import nomadRouter from '@nomad/backend/routers/nomadRouter.js';
import { authenticateUser } from './userRoles.js';

// Mount Nomad router with EM3's auth middleware
app.use('/api/nomad', authenticateUser, nomadRouter);
```

---

## Items Needing Further Discussion

The following items require additional discussion and decision-making:

1. **Model Execution Environment**
   - Where will FireSTARR/WISE executables be installed?
   - Do they run on the same server as EM3 backend?
   - Are there GPU requirements?
   - What are the system dependencies?

2. **Large File Storage**
   - Model outputs can be large (rasters, time-series)
   - Should we use S3/object storage or local filesystem?
   - What's the retention policy for old model runs?

3. **Role Mapping**
   - What roles should have access to modeling?
   - Should there be quotas/limits per role?
   - `admin`, `FBAN`, `modeler` - others needed?

4. **Configuration System**
   - Should Nomad use EM3's configuration or Git submodule pattern?
   - Where do agency-specific model parameters live?
   - How are default settings managed?

5. **Notification Preferences**
   - Should notification preferences be per-user or per-run?
   - Integration with existing NWT notification infrastructure?
   - Push notification service provider?

6. **Model Output Visualization**
   - Should outputs auto-load to map or require manual toggle?
   - Layer styling - default styles or user customizable?
   - Time-series animation for temporal outputs?

7. **Performance/Scalability**
   - Expected concurrent model runs?
   - Queue management for heavy workloads?
   - Background workers needed?

8. **Data Sharing**
   - Can model runs be shared between users?
   - Public vs private model outputs?
   - Export formats required?

---

## Contact & Next Steps

### Development Environment Access

We can provide:
- **Staging environment** for integration testing
- **Sample data** for weather, fires, fuel types
- **API documentation** (Swagger/OpenAPI if needed)
- **Database schema** for PostGIS tables

### Technical Contact

For integration questions:
- Review this document with your team
- Prepare specific technical questions
- Schedule integration kickoff meeting

### Timeline

| Milestone | Target Date | Dependencies |
|-----------|-------------|--------------|
| Integration kickoff | Mid-December 2025 | This document review |
| Dev environment setup | Late December 2025 | Access provisioning |
| PoC integration | Mid-January 2026 | Component registration |
| Backend API integration | Late January 2026 | Model execution testing |
| Testing & refinement | End January 2026 | Full workflow testing |

### Recommended Approach

1. **Week 1-2**: Review this document, decide on architecture choices
2. **Week 3**: Set up development environment, test ToolHost pattern with dummy component
3. **Week 4**: Implement backend API endpoints, test model execution
4. **Week 5-6**: Full integration, wizard UI, map integration
5. **Week 7-8**: Testing, refinement, documentation

---

## Appendix: Critical File References

### Component Integration
- `/src/context/ToolContext.tsx` - Tool registry and context
- `/src/components/tools/ToolHost.tsx` - Component host with portals
- `/src/easymap/EasyMap.tsx` - Event handlers and launch logic

### Authentication
- `/src/backend/userRoles.ts` - JWT validation middleware
- `/src/PrivateRoute.tsx` - Frontend route protection
- `/src/backend/routers/fusionRouter.ts` - User management API

### Spatial Data
- `/src/udl/core/registry.ts` - Entity registry (migration status)
- `/src/backend/routers/weatherStationRouter.ts` - Weather stations API
- `/src/backend/routers/wildfireRouter.ts` - Wildfires API
- `/src/backend/routers/geoserverRouter.ts` - GeoServer proxy

### Map Integration
- `/src/easymap/layers2/` - Layer class implementations
- `/src/easymap/liveLayers/BaseLayerProvider.ts` - Live layer pattern
- `/src/easymap/layerDrawer/` - Layer management UI

### Configuration
- `/vite.config.ts` - Frontend dev server, proxy config, and `@nomad` alias
- `/tsconfig.json` - TypeScript paths including `@nomad/*`
- `/src/backend/server.ts` - Backend Express server (mounts Nomad router)
- `/package.json` - Build scripts and dependencies

### Nomad Submodule Structure
- `/submodules/nomad/src/components/` - React components (ACN & SAN)
- `/submodules/nomad/src/backend/routers/` - Express routers (imported by EM3)
- `/submodules/nomad/src/backend/server.ts` - Standalone server (SAN only)
- `/submodules/nomad/src/index.ts` - Main exports for ACN consumers
- `/submodules/nomad/config/` - Default configuration
- `/submodules/nomad/submodules/config-nwt/` - NWT-specific config (optional)
- `/submodules/nomad/submodules/engines/firestarr/` - FireSTARR engine (optional)

---

**Document prepared by**: EasyMap 3 Development Team
**For**: Project Nomad Integration Team
**Last updated**: November 25, 2025
