## Servicio Core — Hardening (español)

Este documento resume las mejoras de seguridad (hardening) aplicadas al microservicio `core` y cómo verificar su correcto funcionamiento.

**Resumen de cambios aplicados**
- Middlewares de seguridad: `helmet`, `xss-clean` y `hpp` para proteger headers, evitar XSS y prevenir HTTP parameter pollution.
- Limitación de tamaño de peticiones: `express.json({ limit })` para mitigar payloads grandes.
- Rate limiting: `express-rate-limit` configurado por variables de entorno.
- CORS: lista de orígenes permitidos configurable vía `CORS_ORIGINS`.
- Lectura de secretos: la contraseña de la BD puede provenir de `process.env.DB_PASSWORD`, de `DB_PASSWORD_FILE` o de `/run/secrets/mysql_root_password` cuando se usan secrets de Docker.
- Healthcheck tolerante: `/health` devuelve `200` y `db: false` si la BD no está lista, evitando reinicios continuos durante el arranque.
- Dockerfile endurecido: multistage build, instalación de dependencias en etapa de build, copia con `--chown`, usuario no-root y healthcheck en runtime.

**Archivos relevantes**
- `microservicios/core/src/server.js` — middlewares, límites, lectura de secretos.
- `microservicios/core/Dockerfile` — imagen multietapa y usuario no-root.
- `microservicios/core/.env.example` — variables de entorno esperadas.

**Variables de entorno importantes**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (o `DB_PASSWORD_FILE`).
- `CORS_ORIGINS` — orígenes permitidos (coma-separados).
- `REQUEST_BODY_LIMIT`, `RATE_LIMIT_WINDOW_MINUTES`, `RATE_LIMIT_MAX`.

Ejemplo de uso local (desarrollo)

1. Instalar dependencias y ejecutar en modo desarrollo:

```powershell
cd microservicios\core
npm install
npm run dev
```

2. Probar health:

```powershell
Invoke-RestMethod -Uri http://localhost:4200/health -UseBasicParsing
```

Ejemplo con Docker Compose (desde la raíz del repo)

```powershell
# Construir y levantar solo el servicio core
docker compose build core
docker compose up -d core
Start-Sleep -Seconds 5
Invoke-RestMethod -Uri http://localhost:4200/health -UseBasicParsing
```

Si usas Docker secrets, puedes crear `secrets/mysql_root_password.txt` y `secrets/jwt_secret.txt` (no los subas al repo). Docker Compose monta estos archivos en `/run/secrets/` y el servicio los leerá automáticamente.

**Recomendaciones adicionales (producción)**
- Almacenar secretos en un gestor centralizado (Vault, AWS Secrets Manager, Azure Key Vault) en lugar de archivos en disco.
- Ejecutar escaneos de dependencias e imágenes (`npm audit`, `trivy`) y resolver vulnerabilidades críticas antes del despliegue.
- Evitar exponer puertos de bases de datos públicamente; usar redes internas de Docker o VPCs.
- Habilitar `read_only: true` en contenedores cuando sea posible y montar solo los volúmenes estrictamente necesarios.
- Fijar versiones (no usar `:latest`) para imágenes base en `docker-compose.yml`.
- Añadir pruebas automatizadas e integración en CI para validar healthchecks y flujos críticos.

Si quieres que aplique alguna de las recomendaciones (por ejemplo: usar Docker secrets por defecto en `docker-compose.yml`, añadir `read_only: true` a contenedores, o fijar versiones de imágenes), dímelo y lo implemento.
