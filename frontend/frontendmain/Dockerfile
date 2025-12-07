# Etapa 1: Build
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --progress=false
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Etapa 2: Nginx para servir archivos (imagen oficial, versión fija)
FROM nginx:1.27.4
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Usar puerto no privilegiado en contenedor
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
