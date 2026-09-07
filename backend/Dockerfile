# ─── Stage 0: Development (for docker-compose override) ──────────────────────
FROM node:22-alpine AS development

WORKDIR /app

# Install all dependencies (including dev) for tsx watch
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source for live reload
COPY tsconfig.json ./
COPY src ./src

# Expose port for dev server
EXPOSE 3001

# Default command overridden by docker-compose
CMD ["npx", "tsx", "watch", "src/server.ts"]

# ─── Stage 1: Build (production) ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Stage 2: Production ───────────────────────────────────────────────────
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling in containers
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy built artifacts from builder stage
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/dist ./dist

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start with dumb-init for proper SIGTERM handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
