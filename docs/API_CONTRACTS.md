# API_CONTRACTS.md — Endpoints propios del panel

> Solo los endpoints que **no** son Supabase/Cloudinary directo desde el cliente.
> Todos viven bajo `/administrator/api/**`, con `export const prerender = false`, y **requieren sesión** (cookie de Supabase validada por el middleware) salvo que se indique.
> La autorización de datos la aplica **RLS en Postgres** — los endpoints validan sesión y forma, no re-implementan el scope por rol.
> Formato: JSON. Fechas ISO 8601. Errores con el sobre común de §0.

## 0. Convenciones

### Sobre de error

```json
{ "error": { "code": "forbidden", "message": "No puedes editar este recurso." } }
```

| `code` | HTTP | Cuándo |
|---|---|---|
| `unauthenticated` | 401 | Sin sesión válida. |
| `forbidden` | 403 | Sesión válida pero la RLS/regla rechaza (o rol insuficiente). |
| `not_found` | 404 | El recurso no existe o no es visible para el actor. |
| `validation` | 422 | Body mal formado. `message` describe el campo. |
| `upstream_unavailable` | 503 | Supabase o Cloudinary no responden. |
| `rate_limited` | 429 | Demasiadas peticiones. |

### Autenticación (no hay endpoint propio de login)

El login lo hace el **cliente** en `/administrator/login` con `supabase.auth.signInWithPassword()` a través del cliente `@supabase/ssr`, que fija las cookies. El middleware valida en cada request. Logout: `supabase.auth.signOut()` (cliente) — el endpoint `POST /administrator/api/logout` existe solo para limpiar cookies server-side si se prefiere.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/administrator/api/logout` | sesión | Borra las cookies de sesión. `204` sin body. |

---

## 1. Usuarios y roles — `super_admin`

### `GET /administrator/api/users`
Lista perfiles visibles para el actor (RLS: super_admin todos; director los de su área).

**200**
```json
{ "users": [
  { "id": "uuid", "fullName": "Ana Pérez", "role": "director", "areaSlug": "liderazgo", "isActive": true }
] }
```

### `POST /administrator/api/users` — solo `super_admin`
Crea un usuario en Supabase Auth (vía `SUPABASE_SECRET_KEY`, solo servidor — reemplaza a la `service_role key` legacy) y su `profile`.

**Request**
```json
{ "email": "ana@utp.edu.pe", "fullName": "Ana Pérez", "role": "director", "areaSlug": "liderazgo" }
```
| Campo | Regla |
|---|---|
| `email` | requerido, email válido |
| `role` | `director` \| `subdirector` \| `super_admin` |
| `areaSlug` | requerido salvo `role = super_admin`; debe existir en `pillars` |

**201**
```json
{ "user": { "id": "uuid", "email": "ana@utp.edu.pe", "role": "director", "areaSlug": "liderazgo" },
  "invited": true }
```
**Errores:** `403` si no es super_admin · `422` email/rol/área inválidos · `409` `{ "error": { "code": "validation", "message": "El email ya tiene cuenta." } }`

### `PATCH /administrator/api/users/:id` — solo `super_admin`
```json
{ "role": "subdirector", "areaSlug": "liderazgo", "isActive": false }
```
**200** perfil actualizado. **403** si no es super_admin.

### `DELETE /administrator/api/users/:id` — solo `super_admin`
Desactiva (`is_active = false`); no borra `auth.users` por defecto. **204**.

---

## 2. Punteros a eventos de Luma — `luma_event_pointers`

### `GET /administrator/api/event-pointers`
**200**
```json
{ "pointers": [
  { "id": "uuid", "title": "Talent Room", "lumaUrl": "https://luma.com/xxxx",
    "pillarSlug": "liderazgo", "areaSlug": "liderazgo", "ownerId": "uuid",
    "featured": true, "sortHint": "2026-05-10T00:00:00Z", "published": false }
] }
```

### `POST /administrator/api/event-pointers`
**Request**
```json
{ "title": "Talent Room", "lumaUrl": "https://luma.com/xxxx",
  "pillarSlug": "liderazgo", "featured": true, "sortHint": "2026-05-10", "published": false }
```
| Campo | Regla |
|---|---|
| `title` | requerido, 3–120 chars |
| `lumaUrl` | requerido, debe matchear `^https://(lu\.ma\|luma\.com)/` |
| `pillarSlug` | opcional, debe existir en `pillars` |
| `areaSlug` | **no se acepta del cliente** — el server lo fija a `auth_area()` (o lo pide si super_admin) |
| `featured`, `published` | booleanos, default `false` |

**201** el puntero creado. **403** si la RLS rechaza el `insert`. **422** `lumaUrl` no es de Luma.

### `PATCH /administrator/api/event-pointers/:id`
Campos parciales de los de arriba (menos `areaSlug`/`ownerId`). **200** / **403** (RLS `update`) / **404**.

### `DELETE /administrator/api/event-pointers/:id`
**204** / **403** (RLS `delete`) / **404**.

---

## 3. Galerías "así se vivió el evento" — `event_galleries`

### `GET /administrator/api/galleries`
**200** `{ "galleries": [ { "id", "title", "slug", "body", "happenedOn", "pillarSlug", "areaSlug", "ownerId", "published", "photoCount": 12 } ] }`

### `POST /administrator/api/galleries`
```json
{ "title": "Así se vivió el Talent Room", "slug": "talent-room-2026-05",
  "body": "Texto en **markdown**", "happenedOn": "2026-05-10",
  "pillarSlug": "liderazgo", "published": false }
```
| Campo | Regla |
|---|---|
| `title` | requerido 3–140 |
| `slug` | requerido, `^[a-z0-9-]+$`, único |
| `happenedOn` | opcional, fecha |
| `areaSlug`/`ownerId` | fijados por el server |

**201** la galería. **409** slug duplicado. **403** RLS.

### `PATCH /administrator/api/galleries/:id` — parcial. **200/403/404**
### `DELETE /administrator/api/galleries/:id` — borra galería + fotos (cascade en DB) + **borra los assets en Cloudinary** (best-effort; si Cloudinary no responde, se registra y se sigue). **204/403/404**

---

## 4. Fotos de galería — `gallery_photos`

### `POST /administrator/api/uploads/sign`
Devuelve una firma para subir **directo a Cloudinary** desde el navegador.

**Request** `{ "galleryId": "uuid" }`

**200**
```json
{ "timestamp": 1757500000, "signature": "sha1hex...", "apiKey": "1234567890",
  "cloudName": "leadutp", "folder": "lead-utp/liderazgo/talent-room-2026-05" }
```
- El server valida `can_edit_gallery(galleryId)` antes de firmar.
- `folder`, `tags` (`area:<slug>`), `allowed_formats`, `max_file_size` los fija el server y entran en la firma (el cliente no los puede cambiar sin invalidarla).

**403** si el actor no puede editar la galería. **404** galería inexistente. **503** falta config de Cloudinary.

**Luego, el cliente** hace `POST https://api.cloudinary.com/v1_1/<cloudName>/image/upload` (multipart: `file`, `api_key`, `timestamp`, `signature`, `folder`, …) y recibe de Cloudinary `{ public_id, secure_url, width, height, format, bytes }`.

### `POST /administrator/api/galleries/:id/photos`
Registra en Supabase la foto ya subida a Cloudinary.

**Request**
```json
{ "cloudinaryPublicId": "lead-utp/liderazgo/talent-room-2026-05/abc123",
  "secureUrl": "https://res.cloudinary.com/leadutp/image/upload/v17.../abc123.jpg",
  "width": 1600, "height": 1067, "alt": "Ponencia durante Talent Room" }
```
**201** `{ "photo": { "id": "uuid", "position": 3, ... } }` — el server re-valida `can_edit_gallery` y calcula `position` (último + 1).
**403** RLS. **422** falta `cloudinaryPublicId`/`secureUrl`.

### `PATCH /administrator/api/galleries/:id/photos/:photoId`
```json
{ "alt": "nuevo alt", "position": 0 }
```
Reordenar y editar `alt`. **200/403/404**.

### `DELETE /administrator/api/galleries/:id/photos/:photoId`
Borra la fila y el asset en Cloudinary (best-effort). **204/403/404**.

---

## 5. Bloques de subpáginas — `page_blocks`

### `GET /administrator/api/pages/:key`
`:key` ∈ `nosotros.history` \| `nosotros.team` \| `proyectos.list` (lista cerrada).

**200**
```json
{ "block": { "key": "proyectos.list", "data": [ /* forma = Project[] */ ],
  "areaSlug": "desarrollo-del-capitulo", "published": false, "updatedAt": "..." } }
```
**404** si aún no existe (la web pública cae a `.data.ts`).

### `PUT /administrator/api/pages/:key`
```json
{ "data": [ { "slug": "cv-matcher", "name": "CV Matcher", "description": "…", "status": "activo" } ],
  "published": true }
```
| Campo | Regla |
|---|---|
| `data` | requerido; validado contra el tipo de `src/data/**/*.types.ts` según `:key`. Forma inválida → `422` con la ruta del campo |
| `areaSlug`/`ownerId` | fijados por el server en el primer `PUT` (crea la fila); no cambian después salvo super_admin |

**200** el bloque. **403** RLS por área. **422** forma inválida.

---

## 6. Notas de implementación

| Tema | Regla |
|---|---|
| Cliente Supabase en endpoints | Se crea **por request** con el JWT del usuario (`@supabase/ssr`), para que RLS aplique. La `SUPABASE_SECRET_KEY` (reemplaza a `service_role`) solo en `/users`. |
| Idempotencia | `POST` de creación no es idempotente; el cliente deshabilita el botón mientras espera. |
| Rate limiting | Se confía en el de Supabase Auth para login; los endpoints de escritura no añaden límite propio en esta fase. |
| CORS | Todos los endpoints son same-origin (`/administrator/api/**`); no se habilita CORS. |
| Degradación | Si Supabase responde `5xx`/timeout → `503 upstream_unavailable`; la UI del panel muestra "reintenta en unos minutos". La web pública no usa estos endpoints. |
