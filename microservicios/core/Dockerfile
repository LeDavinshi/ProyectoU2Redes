# Core service Dockerfile
### Build stage
FROM node:20-alpine AS builder

ENV NODE_ENV=production
WORKDIR /app

# Copiar manifest para cache
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi

# Copiar código
COPY src ./src

### Runtime
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Crear usuario no-root (idempotente)
RUN addgroup -S app || true; adduser -S -G app app || true

# Copiar desde builder con ownership
COPY --from=builder --chown=app:app /app /app

# Instalar curl para healthcheck
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
	CMD curl -fsS --max-time 5 http://localhost:4200/health || exit 1

USER app

CMD ["node", "src/server.js"]
