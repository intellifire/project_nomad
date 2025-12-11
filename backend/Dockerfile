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

# Install GDAL runtime libraries and Docker CLI (for spawning FireSTARR containers)
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    ca-certificates \
    curl \
    gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built app and node_modules from workspace structure
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./

EXPOSE 3001
CMD ["node", "dist/index.js"]
