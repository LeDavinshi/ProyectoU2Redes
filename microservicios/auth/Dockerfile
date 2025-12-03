### Build stage
FROM node:22-alpine3.21 AS builder

WORKDIR /app

# Install dependencies first (leverage cache)
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN \
  if [ -f package-lock.json ]; then npm ci --omit=dev; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile --production; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --prod; \
  else npm i --omit=dev; fi

# Copy source
COPY src ./src

### Runtime stage
FROM node:22-alpine3.21 AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

# Copy only what is needed to run
COPY --from=builder /app /app

# Install curl for healthcheck
RUN apk add --no-cache curl

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD curl -fsS http://localhost:4000/health || exit 1

USER app

CMD ["node", "src/server.js"]
