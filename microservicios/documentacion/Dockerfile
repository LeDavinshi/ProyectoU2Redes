FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production
COPY . .
RUN npm prune --production || true

FROM node:20-alpine
# create non-root user (idempotent)
RUN addgroup -S app && adduser -S app -G app || true
WORKDIR /app
COPY --from=build /app /app
RUN chown -R app:app /app
USER app

ENV NODE_ENV=production PORT=4300
EXPOSE 4300
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget -qO- http://localhost:4300/health || exit 1
CMD ["npm", "start"]
