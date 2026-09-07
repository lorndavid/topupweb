# ─── Stage 0: Development (for docker-compose override) ────────────────────
FROM node:22-alpine AS development

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY vite.config.ts ./
COPY tsconfig.json ./
COPY src/env.d.ts ./
COPY index.html ./
COPY src ./src
COPY public ./public
COPY tailwind.config.ts ./

ENV NODE_ENV=development
EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]

# ─── Stage 1: Build (production) ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY src/env.d.ts ./
COPY index.html ./
COPY src ./src
COPY public ./public
COPY tailwind.config.ts ./

# Build
RUN npm run build

# ─── Stage 2: Nginx Production ─────────────────────────────────────────────
FROM nginx:alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user and set ownership
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d && \
    chown -R appuser:appgroup /run && \
    mkdir -p /app/run && chown -R appuser:appgroup /app/run

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start with dumb-init for proper SIGTERM handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off; pid_file=/app/run/nginx.pid;"]
