# Core Service

Servicio principal que expone APIs REST para gestión de usuarios, funcionarios y cargos.

Security hardening applied:

- Middlewares: `helmet`, `xss-clean`, `hpp`, rate limiting with `express-rate-limit`.
- Body size limits and CORS allowlist configurable via `CORS_ORIGINS`.
- Healthcheck resilient: returns `db: false` when DB not available to avoid restart loops.
- Reads DB password from environment or Docker secret file (`/run/secrets/mysql_root_password`).
- Dockerfile hardened: multistage build, non-root user, `COPY --chown`, healthcheck.

Environment
- See `.env.example` in this folder. Avoid committing real secrets.

Run locally (dev):

```powershell
cd microservicios\core
npm install
npm run dev
```

Run with Docker Compose (repo root):

```powershell
docker compose build core
docker compose up -d core
```

If you use Docker secrets, mount `mysql_root_password` and the service will read it automatically.
