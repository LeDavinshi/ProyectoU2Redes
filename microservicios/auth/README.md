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
