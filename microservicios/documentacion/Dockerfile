FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

COPY . .

ENV PORT=4300
EXPOSE 4300

CMD ["npm", "start"]
