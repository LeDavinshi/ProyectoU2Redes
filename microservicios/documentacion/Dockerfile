FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

COPY . .

ENV PORT=4300
EXPOSE 4300

# Crear usuario no root
RUN addgroup -S app && adduser -S app -G app
USER app


CMD ["npm", "start"]
