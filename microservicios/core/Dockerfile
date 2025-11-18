# Core service Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install --only=production

COPY src ./src

ENV NODE_ENV=production
ENV PORT=4200

# Crear usuario no root
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 4200

CMD ["node", "src/server.js"]
