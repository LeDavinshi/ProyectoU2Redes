
FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 4500

# Crear usuario no root
RUN addgroup -S app && adduser -S app -G app
USER app

CMD ["npm", "start"]

