# Etapa 1: Build
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
# usar npm ci para reproducibilidad; evitar auditorías durante build
RUN npm ci --prefer-offline --no-audit --progress=false
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Etapa 2: Nginx para servir archivos (imagen oficial, versión fija)
FROM nginx:1.27.4
# limpiar html por si acaso
RUN rm -rf /usr/share/nginx/html/*

# copiar artefactos de build
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto no privilegiado (si desea ejecutar sin root en el futuro)
EXPOSE 8080

# Healthcheck simple (curl incluido en imagen oficial)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Arrancar nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]

