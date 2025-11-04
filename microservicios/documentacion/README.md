# Documentacion Service

Servicio para descargar documentos almacenados en MySQL.

## Qué hace
- `GET /health` verifica estado del servicio y conexión a la DB.
- `GET /documents/:id/download` descarga el archivo (usa headers Content-Type y Content-Disposition).

Tabla esperada (por defecto `documentos`):
- `id INT PK AUTO_INCREMENT`
- `filename VARCHAR(255)`
- `mime_type VARCHAR(100)`
- `data LONGBLOB`

## Cómo ejecutarlo
- Docker Compose (recomendado):
  ```bash
  docker compose up -d --build documentacion
  # http://localhost:4100/health
  ```
- Local:
  ```bash
  npm install && npm run dev
  ```

Puerto por defecto: `4100`. Variables en `.env.example` (DB y `DOCS_TABLE`).
