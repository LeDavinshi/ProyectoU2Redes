# Servicio `documentacion` — instrucciones de ejecución y pruebas

Resumen
- Servicio minimal para subir, listar, descargar y eliminar documentos (PDF) para funcionarios.

Variables de entorno
- `PORT` — puerto HTTP (por defecto `4300`).
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` — conexión a MariaDB/MySQL.
- `DB_PASSWORD` — contraseña en texto (no recomendado).
- `DB_PASSWORD_FILE` — ruta a un archivo que contiene sólo la contraseña (recomendado con Docker secrets, p.ej. `/run/secrets/doc_db_password`).
- `CORS_ORIGINS` — orígenes permitidos separados por comas.
- `RATE_WINDOW_MS`, `RATE_MAX` — configuración del rate limiter.

Archivos importantes
- `server.js` — servidor Express con middlewares de seguridad (helmet, xss-clean, hpp), rate limiting y soporte de lectura de secretos desde archivo.
- `Dockerfile` — multistage, ejecuta como usuario no-root y contiene `HEALTHCHECK`.
- `.env.example` — ejemplo de variables de entorno.

Ejecutar localmente (desarrollo)
1. Copiar ejemplo y ajustar secretos:

```powershell
cd microservicios\documentacion
Copy-Item .env.example .env
# Edita .env y pon DB_PASSWORD o DB_PASSWORD_FILE
```

2. Instalar dependencias y ejecutar:

```powershell
npm install
npm start
```

3. Probar endpoint de health (PowerShell):

```powershell
Invoke-RestMethod -Uri http://localhost:4300/health -Method GET
```

Probar endpoints (curl examples)
- Listar documentos de `funcionarioId=1` (necesita header `x-user-id` con id válido):

```powershell
curl -v "http://localhost:4300/documentos?funcionarioId=1" -H "x-user-id: 1"
```

- Subir un PDF (ejemplo):

```bash
curl -v -F "archivo=@./sample.pdf" -F "funcionarioid=1" -F "tipodocumento=CONSTANCIA" -F "nombredocumento=MiDoc.pdf" -H "x-user-id: 1" http://localhost:4300/documentos
```

- Descargar un documento (id ejemplo `123`):

```bash
curl -H "x-user-id: 1" -o descargado.pdf http://localhost:4300/documentos/123/download
```

Ejecutar con Docker
1. Construir imagen:

```powershell
cd microservicios\documentacion
docker build -t documentacion-service:local .
```

2. Ejecutar contenedor (ejemplo rápido, no recomendable para producción con DB en otro contenedor):

```powershell
docker run --rm -p 4300:4300 -e DB_HOST=mysql-master -e DB_USER=admin -e DB_PASSWORD=admin123 documentacion-service:local
```

Usar Docker Compose & Secrets (recomendado)
- Cree un archivo `secrets/doc_db_password.txt` con la contraseña y agregue al `docker-compose.yml`:

```yaml
services:
  documentacion:
    build: ./microservicios/documentacion
    environment:
      - DB_HOST=mysql-master
      - DB_USER=admin
      - DB_PASSWORD_FILE=/run/secrets/doc_db_password
    secrets:
      - doc_db_password

secrets:
  doc_db_password:
    file: ./secrets/doc_db_password.txt
```

Notas de seguridad y pruebas
- Prefiera `DB_PASSWORD_FILE` con Docker secrets en lugar de `DB_PASSWORD` en texto.
- Antes de probar endpoints protegidos, asegúrese de que la base de datos y la tabla `Usuarios` contengan los usuarios con `id` que utilice en `x-user-id`.
- Para auditoría de dependencias:

```powershell
cd microservicios\documentacion
npm audit --production
# opcional: npm audit fix
```

- Para escanear la imagen (requiere `trivy` instalado):

```powershell
trivy image documentacion-service:local
```

Problemas comunes
- Si el `/health` devuelve `db: false` revise credenciales y que el servicio de base de datos esté accesible desde la red Docker.
- Si subidas fallan por tamaño, revise `limits.fileSize` (actualmente 20 MB) y la configuración de `uploadDir`.
