# Backend Dockerfile
FROM node:22-slim AS builder

WORKDIR /app

# Install GDAL native libraries (required for gdal-async)
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace root package files first (for dependency caching)
COPY package.json package-lock.json ./

# Copy backend package.json (workspace member)
COPY backend/package.json ./backend/

# Install all workspace dependencies
RUN npm ci --workspace=@nomad/backend

# Copy backend source
COPY backend/ ./backend/

# Build backend
RUN npm run build --workspace=@nomad/backend

# Production stage
FROM node:22-slim AS production

# Install GDAL runtime libraries
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built app and node_modules from workspace structure
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./

EXPOSE 3001
CMD ["node", "dist/index.js"]
