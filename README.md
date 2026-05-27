# back-parchapp

API REST monolítica de **ParchApp**: plataforma para turistas que centraliza ofertas de entretenimiento, cultura y gastronomía, generación de rutas personalizadas y reservas con establecimientos locales. Este repositorio implementa el backend definido en el stack del proyecto (Node.js + Express + PostgreSQL).

## Contexto en el ecosistema

| Repositorio      | Rol                                      |
|------------------|------------------------------------------|
| `db-parchapp`    | Esquema PostgreSQL, migraciones y CSV de semilla |
| `back-parchapp`  | Lógica de negocio y exposición HTTP      |
| `front-parchapp` | App móvil (Expo / React Native)          |

Arquitectura general: **cliente-servidor** con un único backend monolítico y base de datos relacional, orientada a la fase MVP del producto.

## Arquitectura del repositorio

El código sigue una organización por capas dentro de `src/`:

```
src/
├── config/          # Variables de entorno (Zod)
├── db/              # Pool de conexión pg
├── middleware/      # Autenticación JWT (Bearer)
├── routes/          # Routers Express por dominio
├── repositories/    # Acceso a datos (SQL parametrizado)
├── services/        # Lógica transversal (p. ej. auth)
├── models/          # Tipos TypeScript
├── utils/           # HttpError, wrapAsync
├── container.ts     # Inyección manual de repositorios
├── app.ts           # Montaje de middleware y /api/v1
└── server.ts        # Punto de entrada HTTP
```

**Flujo de una petición:** `routes` → (opcional) `middleware/auth` → `repositories` / `services` → PostgreSQL.

**Prefijo de API:** todas las rutas viven bajo `/api/v1`. Documentación detallada de endpoints en [`endpoints-doc.md`](./endpoints-doc.md).

| Módulo de rutas        | Responsabilidad principal                          |
|------------------------|----------------------------------------------------|
| `health`               | Estado del servicio y conexión a BD                |
| `auth`                 | Login y emisión de JWT                             |
| `interests`            | Catálogo de intereses del turista                  |
| `establishments`       | Establecimientos y servicios                       |
| `events`               | Eventos publicados por establecimientos            |
| `bookings`             | Reservas (MVP “Reserva tu parche”)                 |
| `routesCrud`           | Rutas y paradas del turista                        |
| `sync`                 | Carga de datos de demostración desde CSV           |

### Sincronización de datos (`POST /sync/seed`)

En desarrollo, el catálogo de lugares, restaurantes y rutas de ejemplo **no** se inserta al levantar PostgreSQL. El backend lee los CSV de `db-parchapp/seed/csv`, los carga en tablas *staging* con `COPY` y ejecuta el procedimiento `sp_populate_from_seed_staging()` definido en la base de datos.

- Ruta: `POST /api/v1/sync/seed`
- Header obligatorio: `x-seed-secret` (valor de `SEED_SYNC_SECRET` en `.env`)
- Requiere que el esquema SQL ya esté aplicado y que `SEED_CSV_DIR` apunte a la carpeta `seed/csv` del repo `db-parchapp`.

## Requisitos previos

- Node.js 20+ (recomendado)
- PostgreSQL en ejecución (p. ej. vía `db-parchapp` con Docker)
- Esquema y migraciones aplicados en la BD (ver README de `db-parchapp`)
- Datos poblados con `POST /sync/seed` en la **primera** ejecución del proyecto

## Configuración

1. Copiar variables de entorno:

   ```bash
   cp .env.example .env
   ```

2. Ajustar en `.env`:

   | Variable            | Descripción |
   |---------------------|-------------|
   | `DATABASE_URL`      | Conexión con rol `parchapp_app` (ver `db-parchapp/sql/parchapp_database_init.sql`) |
   | `PORT`              | Puerto HTTP (por defecto `3000`) |
   | `JWT_SECRET`        | Secreto para firmar tokens (mín. 16 caracteres) |
   | `CORS_ORIGIN`       | Origen permitido o `*` en desarrollo |
   | `SEED_SYNC_SECRET`  | Secreto compartido con quien invoque `/sync/seed` |
   | `SEED_CSV_DIR`      | Ruta **absoluta** a `db-parchapp/seed/csv` |

## Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo con recarga (tsx watch)
npm run dev

# Compilar TypeScript
npm run build

# Producción (tras build)
npm start
```

La API quedará disponible en `http://localhost:3000` (o el `PORT` configurado). Comprobar salud:

```bash
curl http://localhost:3000/api/v1/health
```

### Primera vez: poblar datos de ejemplo

Con el backend en marcha y la BD vacía de catálogo:

```bash
curl -X POST http://localhost:3000/api/v1/sync/seed \
  -H "x-seed-secret: dev_seed_sync_secret"
```

(Usar el mismo valor que `SEED_SYNC_SECRET` en `.env`.)

Tras el seed, puedes iniciar sesión con el usuario de catálogo creado por el procedimiento almacenado: `seed.catalog@parchapp.local` / `DemoSeed2024!` (ver documentación en `db-parchapp`).

## Mejoras futuras

- **Portal de establecimientos** (funcionalidad core #2): panel web con Next.js para registro, horarios, promociones y gestión de reservas.
- **Generador de rutas optimizado**: orden de visita, tiempos y distancias automáticos (hoy el CRUD de rutas es manual en el MVP).
- **Reseñas y favoritos** (core #4): calificaciones y señales para mejorar recomendaciones.
- **Funcionalidades secundarias**: compartir ruta por enlace, mapa básico, chat turista–establecimiento, historial de rutas.
- **Seguridad de producción**: rotar contraseñas de roles BD, restringir o eliminar `/sync/seed`, endurecer `CORS_ORIGIN` y políticas de rate limiting.
- **Observabilidad**: logging estructurado, métricas y trazas antes de considerar microservicios.
- **Evolución arquitectónica**: mantener el monolito mientras se valida el MVP; evaluar extracción por dominios solo si el negocio escala (migración gradual a microservicios).

## Referencias

- Esquema y seed CSV: repositorio `db-parchapp`
- Cliente móvil: repositorio `front-parchapp`
