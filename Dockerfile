# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Final stage
FROM node:18-alpine

WORKDIR /app

# Install pg_isready dependency
RUN apk add --no-cache postgresql-client

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY backend/ .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run application
CMD ["npm", "start"]