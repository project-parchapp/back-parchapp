# Documentación de endpoints — ParchApp API

API REST del backend `back-parchapp`. Todas las rutas están bajo el prefijo **`/api/v1`**.

**URL base (desarrollo):** `http://localhost:3000/api/v1` (puerto configurable con `PORT` en `.env`).

---

## Convenciones generales

### Formato de petición

- Cuerpo JSON en endpoints `POST` y `PATCH` (`Content-Type: application/json`).
- Límite de cuerpo: **1 MB**.

### Autenticación

Los endpoints protegidos exigen el header:

```http
Authorization: Bearer <token_jwt>
```

El token se obtiene con `POST /auth/login`. Expira en **7 días**. El payload del JWT incluye `sub` (id de usuario), `email` y `role`.

Roles posibles (`UserRole`): `tourist`, `establishment_admin`, `platform_admin`.

### Respuestas de error

Errores controlados (`HttpError`):

```json
{
  "error": "Mensaje legible",
  "details": {}
}
```

`details` aparece en validaciones (p. ej. errores de Zod con `400`). Errores no controlados responden `500` con:

```json
{ "error": "Error interno del servidor" }
```

### CORS

Origen permitido según `CORS_ORIGIN` en `.env` (`*` o lista separada por comas). Credenciales habilitadas.

---

## Health

### `GET /health`

Comprueba que el servicio responde y el estado de la base de datos.

| | |
|---|---|
| **Autenticación** | No |
| **Query** | — |

**Respuesta `200`**

```json
{
  "status": "ok",
  "database": "up"
}
```

`database` puede ser `"up"` o `"down"`.

---

## Autenticación

### `POST /auth/login`

Inicia sesión y devuelve JWT + datos del usuario.

| | |
|---|---|
| **Autenticación** | No |

**Cuerpo**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `email` | string | Sí | Email válido |
| `password` | string | Sí | No vacío |

**Respuesta `200`**

```json
{
  "token": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "display_name": "Nombre",
    "phone": null,
    "avatar_url": null,
    "role": "tourist",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

**Errores**

| Código | Motivo |
|--------|--------|
| `400` | Cuerpo inválido |
| `401` | Credenciales inválidas o usuario inactivo |

---

## Intereses

### `GET /interests`

Lista todos los intereses disponibles (catálogo).

| | |
|---|---|
| **Autenticación** | No |

**Respuesta `200`**

Array de objetos:

| Campo | Tipo |
|-------|------|
| `id` | string (UUID) |
| `code` | string |
| `name` | string |
| `description` | string \| null |
| `sort_order` | number |
| `created_at` | string (ISO fecha) |

---

## Establecimientos

### `GET /establishments`

Lista establecimientos con paginación.

| | |
|---|---|
| **Autenticación** | No |

**Query**

| Parámetro | Tipo | Default | Máximo |
|-----------|------|---------|--------|
| `limit` | number | 50 | 200 |
| `offset` | number | 0 | — |

**Respuesta `200`**

Array de `EstablishmentRow` (ver modelo abajo).

---

### `GET /establishments/:id`

Obtiene un establecimiento por ID.

| | |
|---|---|
| **Autenticación** | No |
| **Parámetros de ruta** | `id` — UUID del establecimiento |

**Respuesta `200`**

Objeto `EstablishmentRow`.

**Errores**

| Código | Motivo |
|--------|--------|
| `404` | Establecimiento no encontrado |

---

### `POST /establishments`

Crea un establecimiento. El propietario es el usuario autenticado.

| | |
|---|---|
| **Autenticación** | Sí (Bearer) |

**Cuerpo**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `legal_name` | string | Sí | 1–255 caracteres |
| `trade_name` | string | Sí | 1–255 caracteres |
| `description` | string | No | |
| `contact_email` | string \| null | No | Email válido o `null` |
| `contact_phone` | string | No | Máx. 40 caracteres |
| `website_url` | string | No | Máx. 2000 caracteres |
| `address_line` | string | No | |
| `city` | string | Sí | 1–120 caracteres |
| `country_code` | string | Sí | Exactamente 2 caracteres (ISO) |
| `latitude` | string \| number | Sí | Se guarda como string |
| `longitude` | string \| number | Sí | Se guarda como string |
| `status` | string | No | `pending_review` \| `active` \| `suspended` \| `closed` |

**Respuesta `201`**

Objeto `EstablishmentRow` creado (`owner_user_id` = usuario del token).

**Errores**

| Código | Motivo |
|--------|--------|
| `400` | Cuerpo inválido |
| `401` | Sin token o token inválido |

---

### `PATCH /establishments/:id`

Actualiza parcialmente un establecimiento. Solo el **propietario** (`owner_user_id`) puede modificarlo.

| | |
|---|---|
| **Autenticación** | Sí (Bearer) |
| **Parámetros de ruta** | `id` — UUID |

**Cuerpo**

Mismos campos que `POST`, todos opcionales (actualización parcial).

**Respuesta `200`**

Objeto `EstablishmentRow` actualizado.

**Errores**

| Código | Motivo |
|--------|--------|
| `400` | Cuerpo inválido |
| `401` | No autenticado |
| `403` | No es el propietario |
| `404` | Establecimiento no encontrado |

---

### `DELETE /establishments/:id`

Elimina un establecimiento. Solo el propietario.

| | |
|---|---|
| **Autenticación** | Sí (Bearer) |
| **Parámetros de ruta** | `id` — UUID |

**Respuesta `204`**

Sin cuerpo.

**Errores**

| Código | Motivo |
|--------|--------|
| `401` | No autenticado |
| `403` | No es el propietario |
| `404` | Establecimiento no encontrado |

---

### Modelo `EstablishmentRow`

| Campo | Tipo |
|-------|------|
| `id` | string |
| `owner_user_id` | string |
| `legal_name` | string |
| `trade_name` | string |
| `description` | string \| null |
| `contact_email` | string \| null |
| `contact_phone` | string \| null |
| `website_url` | string \| null |
| `address_line` | string \| null |
| `city` | string |
| `country_code` | string |
| `latitude` | string |
| `longitude` | string |
| `status` | `pending_review` \| `active` \| `suspended` \| `closed` |
| `created_at` | string (ISO fecha) |
| `updated_at` | string (ISO fecha) |

---

## Rutas (itinerarios)

Todos los endpoints de esta sección requieren **autenticación** (el router aplica `requireAuth` globalmente). Solo se accede a rutas del usuario del token.

### `GET /routes`

Lista las rutas del usuario autenticado.

**Query**

| Parámetro | Tipo | Default | Máximo |
|-----------|------|---------|--------|
| `limit` | number | 50 | 200 |
| `offset` | number | 0 | — |

**Respuesta `200`**

Array de `RouteRow` (sin paradas).

---

### `POST /routes`

Crea una ruta para el usuario autenticado.

**Cuerpo**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `name` | string | Sí | 1–200 caracteres |
| `description` | string | No | |
| `status` | string | No | `draft` \| `saved` \| `completed` \| `archived` |
| `total_estimated_minutes` | number | No | Entero |
| `origin_latitude` | string \| number | No | |
| `origin_longitude` | string \| number | No | |
| `generation_context` | any (JSON) | No | Contexto de generación de la ruta |

**Respuesta `201`**

Objeto `RouteRow`.

**Errores**

| Código | Motivo |
|--------|--------|
| `400` | Cuerpo inválido |
| `401` | Token requerido o inválido |

---

### `GET /routes/:routeId`

Obtiene una ruta con sus paradas.

| **Parámetros de ruta** | `routeId` — UUID |

**Respuesta `200`**

`RouteRow` más array `stops` (`RouteStopRow[]`).

**Errores**

| Código | Motivo |
|--------|--------|
| `404` | Ruta no encontrada o no pertenece al usuario |

---

### `PATCH /routes/:routeId`

Actualiza parcialmente una ruta del usuario.

**Cuerpo**

Mismos campos que `POST /routes`, todos opcionales.

**Respuesta `200`**

Objeto `RouteRow` actualizado.

**Errores**

| Código | Motivo |
|--------|--------|
| `400` | Cuerpo inválido |
| `404` | Ruta no encontrada |

---

### `DELETE /routes/:routeId`

Elimina una ruta del usuario.

**Respuesta `204`**

Sin cuerpo.

**Errores**

| Código | Motivo |
|--------|--------|
| `404` | Ruta no encontrada |

---

### Paradas de ruta

#### `GET /routes/:routeId/stops`

Lista las paradas de una ruta.

**Respuesta `200`**

Array de `RouteStopRow`.

**Errores**

| Código | Motivo |
|--------|--------|
| `404` | Ruta no encontrada |

---

#### `POST /routes/:routeId/stops`

Añade una parada a la ruta.

**Cuerpo**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `establishment_id` | string | Sí | No vacío |
| `service_id` | string | No | |
| `sort_order` | number | Sí | Entero |
| `estimated_travel_minutes_from_prev` | number | No | Entero |
| `estimated_stay_minutes` | number | No | Entero |
| `latitude` | string \| number | Sí | |
| `longitude` | string \| number | Sí | |
| `note` | string | No | Máx. 500 caracteres |

**Respuesta `201`**

Objeto `RouteStopRow`.

**Errores**

| Código | Motivo |
|--------|--------|
| `400` | Cuerpo inválido |
| `404` | Ruta no encontrada |

---

#### `PATCH /routes/:routeId/stops/:stopId`

Actualiza parcialmente una parada.

| **Parámetros de ruta** | `routeId`, `stopId` — UUID |

**Cuerpo**

Mismos campos que `POST` de parada, todos opcionales.

**Respuesta `200`**

Objeto `RouteStopRow` actualizado.

**Errores**

| Código | Motivo |
|--------|--------|
| `400` | Cuerpo inválido |
| `404` | Ruta o parada no encontrada |

---

#### `DELETE /routes/:routeId/stops/:stopId`

Elimina una parada.

**Respuesta `204`**

Sin cuerpo.

**Errores**

| Código | Motivo |
|--------|--------|
| `404` | Ruta o parada no encontrada |

---

### Modelo `RouteRow`

| Campo | Tipo |
|-------|------|
| `id` | string |
| `user_id` | string |
| `name` | string |
| `description` | string \| null |
| `status` | `draft` \| `saved` \| `completed` \| `archived` |
| `total_estimated_minutes` | number \| null |
| `origin_latitude` | string \| null |
| `origin_longitude` | string \| null |
| `generation_context` | unknown |
| `created_at` | string (ISO fecha) |
| `updated_at` | string (ISO fecha) |

### Modelo `RouteStopRow`

| Campo | Tipo |
|-------|------|
| `id` | string |
| `route_id` | string |
| `establishment_id` | string |
| `service_id` | string \| null |
| `sort_order` | number |
| `estimated_travel_minutes_from_prev` | number |
| `estimated_stay_minutes` | number \| null |
| `latitude` | string |
| `longitude` | string |
| `note` | string \| null |

---

## Sincronización (seed)

### `POST /sync/seed`

Carga datos CSV en tablas staging y ejecuta el procedimiento `sp_populate_from_seed_staging`. Uso operativo / desarrollo, no para clientes finales.

| | |
|---|---|
| **Autenticación** | Header `x-seed-secret` (debe coincidir con `SEED_SYNC_SECRET` en `.env`) |

**Headers**

| Header | Requerido |
|--------|-----------|
| `x-seed-secret` | Sí |

**Respuesta `200`**

```json
{
  "ok": true,
  "message": "Staging cargado y sp_populate_from_seed_staging ejecutado"
}
```

**Errores**

| Código | Motivo |
|--------|--------|
| `403` | Secreto de sincronización inválido o ausente |

**Variables de entorno relacionadas**

- `SEED_SYNC_SECRET` — valor esperado del header.
- `SEED_CSV_DIR` — ruta absoluta a los CSV de `db-parchapp/seed/csv`.

---

## Resumen de endpoints

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/health` | No |
| `POST` | `/auth/login` | No |
| `GET` | `/interests` | No |
| `GET` | `/establishments` | No |
| `GET` | `/establishments/:id` | No |
| `POST` | `/establishments` | Bearer |
| `PATCH` | `/establishments/:id` | Bearer (propietario) |
| `DELETE` | `/establishments/:id` | Bearer (propietario) |
| `GET` | `/routes` | Bearer |
| `POST` | `/routes` | Bearer |
| `GET` | `/routes/:routeId` | Bearer |
| `PATCH` | `/routes/:routeId` | Bearer |
| `DELETE` | `/routes/:routeId` | Bearer |
| `GET` | `/routes/:routeId/stops` | Bearer |
| `POST` | `/routes/:routeId/stops` | Bearer |
| `PATCH` | `/routes/:routeId/stops/:stopId` | Bearer |
| `DELETE` | `/routes/:routeId/stops/:stopId` | Bearer |
| `POST` | `/sync/seed` | `x-seed-secret` |

*Prefijo común: `/api/v1`*
