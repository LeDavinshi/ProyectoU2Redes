# Auth Service

Servicio de autenticación (Node.js + Express).

## Qué hace
- Expone `GET /health` para estado del servicio.
- Expone `POST /login` (placeholder: responde 501 hasta implementar lógica real con MySQL + JWT).

## Cómo ejecutarlo
- Docker Compose (recomendado):
  ```bash
  docker compose up -d --build auth
  # http://localhost:4000/health
  ```
- Local:
  ```bash
  npm install && npm run dev
  ```

Puerto por defecto: `4000`. Variables en `.env.example`.
