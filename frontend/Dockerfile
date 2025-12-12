# Frontend Dockerfile - Multi-stage build
FROM node:22-alpine AS builder

# Build-time args for Vite (baked into bundle)
ARG VITE_MAPBOX_TOKEN
ARG VITE_API_BASE_URL
ARG VITE_SIMPLE_AUTH=true

# Export as ENV so Vite can read them during build
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SIMPLE_AUTH=$VITE_SIMPLE_AUTH

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
COPY package-lock.json ./
RUN npm ci

# Copy source and build
COPY frontend/ .
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
