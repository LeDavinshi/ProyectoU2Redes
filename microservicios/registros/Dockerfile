 FROM node:20-alpine
 
 WORKDIR /app
 
 COPY package.json package-lock.json* ./
 RUN npm ci --omit=dev || npm install --omit=dev
 
 COPY src ./src
 
 ENV NODE_ENV=production
 EXPOSE 4400 
 
 # Crear usuario no root
 RUN addgroup -S app && adduser -S app -G app
 USER app
 
 CMD ["node", "src/server.js"]
