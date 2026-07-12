FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependencias para compilar better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim

WORKDIR /app

# Instalar dependencias para compilar better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.js ./

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/database.sqlite

# Directorio para la base de datos persistente
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["npm", "start"]
