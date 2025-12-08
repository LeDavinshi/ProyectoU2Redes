# Auth Service

Servicio de autenticación (Node.js + Express) para el proyecto.

## Endpoints

- GET `/health` retorna estado del servicio.
- POST `/login` placeholder (retorna 501 hasta integrar lógica real).

## Variables de entorno

Ver `.env.example`.

## Ejecutar en local (sin Docker)

```bash
# desde microservicios/auth
npm install
npm run dev
# Servicio en http://localhost:4000
```

## Construir y correr con Docker individualmente

```bash
# desde microservicios/auth
docker build -t auth-service .
docker run --rm -p 4000:4000 --env-file .env auth-service
```

## Orquestado con docker-compose (raíz del repo)

En `docker-compose.yml` ya existe el servicio `auth`. Puedes levantarlo junto con los frontends:

```bash
docker compose up -d --build auth frontend-admin frontend-funcionario
```

### Conectividad a MySQL

- Por defecto `DB_HOST` apunta a `mysql-master` y `DB_PORT` a `3306`.
- Si ejecutas la base con `db/docker-compose.yml` en un stack separado, necesitarás una red compartida entre stacks:
  - Opción A (recomendada): unificar todo en un único `docker-compose.yml`.
  - Opción B: crear una red externa y unir ambos stacks a esa red.
    ```bash
    docker network create mysql-network
    # luego ajusta los compose para usar `external: true` en `mysql-network`
    ```

Ajusta `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` según tu entorno.

    ## Security hardening (changes)

    Se implementaron las siguientes mejoras al servicio para reducir la superficie de ataque y aumentar la seguridad de las implementaciones en producción:

- Código de la aplicación
- Se añadieron middlewares de seguridad: `helmet`, `xss-clean`, `hpp`.
- Se añadieron límites de tamaño de solicitud (`REQUEST_BODY_LIMIT`) para mitigar ataques de gran carga útil.
- Se añadió limitación de velocidad (`express-rate-limit`) con ventana configurable y número máximo de solicitudes.
- Se implementó la firma JWT para las respuestas de autenticación (`JWT_SECRET`, `JWT_EXPIRES`).
- Gestión de errores más segura (evitando la filtración de errores internos a los clientes).
- Validación básica del entorno en `src/server.js` para que falle rápidamente cuando faltan secretos críticos en producción.

- Imagen de Docker
- Compilación multietapa: las dependencias de producción se instalan en la etapa de compilación; la imagen en tiempo de ejecución solo contiene lo necesario.
- `NODE_ENV=production` se configura con antelación para instalaciones y optimizaciones correctas. - Se creó un usuario no root (uid `app` `1000`) y los archivos se copiaron con `--chown` para evitar problemas de permisos.
- Se incluye una comprobación de estado ligera que se ejecuta como usuario `app`.

- Entorno
- Se actualizó `.env.example` con las nuevas variables: `JWT_SECRET`, `JWT_EXPIRES`, `REQUEST_BODY_LIMIT`, `RATE_LIMIT_WINDOW_MINUTES`, `RATE_LIMIT_MAX`, `COURSE_ORIGINS`, `DB_CONN_LIMIT`, `DB_CONNECT_TIMEOUT_MS`.

## Cómo compilar y verificar (PowerShell)

Desde la raíz del repositorio:
```powershell
cd 'c:\Users\juanm\Documents\GitHub\ProjectU2Networks'
docker compose build auth
docker compose up -d auth
# Espere unos segundos y luego pruebe el estado
curl http://localhost:4000/health
```

Si prefiere ejecutar sin Docker:
```powershell
cd microservices\auth
npm install
npm run dev
# then: http://localhost:4000/health
```

## Recomendaciones y próximos pasos

- Agregue pruebas de integración para flujos de autenticación y comprobaciones de estado automatizadas en CI.
## Usando secretos con Docker Compose

Este repositorio proporciona archivos de secretos de muestra en `./secrets/*.txt.sample`. Para pruebas locales, puede copiarlos y rellenar valores reales:

```powershell
# desde la raíz del repositorio
cp .\secrets\jwt_secret.txt.sample .\secrets\jwt_secret.txt
cp .\secrets\mysql_root_password.txt.sample .\secrets\mysql_root_password.txt
# Edite los archivos y establezca secretos fuertes
```

Cuando ejecute `docker compose up`, los secretos declarados se montarán en los servicios en `/run/secrets/<nombre>`.

Notas:
- El servicio `auth` lee `JWT_SECRET` de `process.env.JWT_SECRET` o de `/run/secrets/jwt_secret` (preferido para producción).
- Para producción, utilice un gestor de secretos adecuado o secretos de Docker Swarm/Kubernetes en lugar de comprometer archivos secretos en disco.