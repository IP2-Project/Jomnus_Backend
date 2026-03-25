FROM node:18-alpine AS development
WORKDIR /app

# Install all dependencies (including dev dependencies for hot reload)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source files
COPY . .

# Development stage ready for hot reload
EXPOSE 3000

FROM node:18-alpine AS builder
WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

# Use production environment
ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Ensure non-root runtime user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

# Directly run the built app
CMD ["node", "dist/main.js"]