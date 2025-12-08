### Etapa de build - generar dependencias de producción y archivos de la aplicación
FROM node:22-alpine3.21 AS builder

ENV NODE_ENV=production
WORKDIR /app

# Copiar lock/manifest primero para aprovechar la caché de capas
COPY package.json package-lock.json* ./

# Instalar solo dependencias de producción (rápido y reproducible)
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm i --omit=dev --no-audit --no-fund; fi

# Copiar código fuente de la aplicación
COPY src ./src

### Etapa runtime - imagen mínima para ejecución
FROM node:22-alpine3.21 AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Crear usuario/grupo no-root de forma idempotente. Si ya existen, continuar sin fallar.
# No forzar un UID específico para evitar errores en entornos donde el UID ya está en uso.
RUN addgroup -S app || true; adduser -S -G app app || true

# Copiar la aplicación construida desde la etapa builder y establecer propiedad al usuario no-root
COPY --from=builder --chown=app:app /app /app

# Instalar herramienta ligera para healthcheck en la misma capa para reducir tamaño
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

EXPOSE 4000

# Healthcheck ligero
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD curl -fsS --max-time 5 http://localhost:4000/health || exit 1

# Ejecutar como usuario no-root
USER app

# Usar la forma exec para que las señales se propaguen correctamente
CMD ["node", "src/server.js"]
