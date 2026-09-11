# DOMAIN.md — Glosario del dominio (panel de administración LEAD UTP)

> Lenguaje ubicuo. Todo código, SPEC, commit y reporte usa estos términos con este significado.
> Tipos y reglas viven en `src/domain/`. Modelo de datos: [`database/schema.sql`](./database/schema.sql).

## Personas y roles

| Término | Definición |
|---|---|
| **Staff** | Cualquier persona con cuenta en el panel. Tiene un `profile` en Supabase. No hay auto-registro. |
| **Rol** (`app_role`) | Uno de: `director`, `subdirector`, `super_admin`. Vive en `profiles.role` y se inyecta en el JWT. |
| **Director** | Staff responsable de un **área**. Puede crear/editar/borrar **todo el contenido de su área**, sin importar quién lo creó. |
| **Subdirector** | Staff de un área. Puede crear contenido en su área y editar/borrar **solo el que él mismo creó** (`owner_id = él`). |
| **Super-admin** | Staff sin restricción de área. Gestiona usuarios y edita cualquier contenido. `area_slug` puede ser `null`. |
| **Actor** | En una regla de dominio (`canEdit(actor, resource)`), el staff que intenta la acción. |

## Áreas

| Término | Definición |
|---|---|
| **Área** | Unidad organizativa a la que pertenece cada staff y cada pieza de contenido. **Mapea 1:1 a los 6 pilares** de `src/data/pillars/pillars.data.ts`. |
| **`area_slug`** | El identificador del área = el `slug` del pilar. Valores válidos: `desarrollo-profesional`, `liderazgo`, `excelencia-femenina`, `desarrollo-del-capitulo`, `excelencia-academica`, `lead-academia`. |
| **Pilar** | Concepto de contenido del sitio público (ya existente). Como "área" es su faceta organizativa. La tabla `pillars` es la referencia sembrada (`source = 'static'`). |

## Eventos

| Término | Definición |
|---|---|
| **Evento** | Una actividad de LEAD UTP. La **inscripción** ocurre en Luma; el **cupo** lo gestiona Luma. La web no sincroniza estos datos vía API (se descartó por costo) — quien cura el **Puntero a Luma** carga a mano la fecha/ubicación que quiere mostrar. |
| **Evento próximo** | Evento que aún no ocurre. Se muestra en `/eventos` **vía embed/link a Luma** (calendario general) y, opcionalmente, como una o más **tarjetas de Puntero a Luma** curadas por un director. |
| **Evento realizado** | Evento que ya ocurrió y del que se publica un recuerdo ("así se vivió…"). Se modela como **Galería** en Supabase + Cloudinary. No es un registro de Luma. |
| **Puntero a Luma** (`luma_event_pointers`) | Tarjeta de evento curada por un director/subdirector: `title`, `luma_url` (URL de registro, único lugar donde se inscribe), `event_date`, `location`, `image_url`, `short_description` (+ `pillar_slug`, `featured`). Todos estos datos —salvo `luma_url`— los carga el staff a mano; no se sincronizan desde Luma. Opcional; el embed del calendario ya cubre el caso general. |
| **Inscripción** | Se hace **100 % en Luma**, a través del link de `luma_url`. La web **no** tiene ningún formulario ni área de inscripción. |
| **Calendario de Luma** | `https://luma.com/leadutp_`. Único origen. Se embebe (iframe, snippet del panel de Luma) o se enlaza (botón). |

## Contenido

| Término | Definición |
|---|---|
| **Galería** (`event_galleries`) | Un recuerdo de un evento realizado: `title`, `body` (markdown), `happened_on`, `pillar_slug`, y N **Fotos**. Estilo `/vida-lead`. |
| **Foto** (`gallery_photos`) | Una imagen de una galería, alojada en **Cloudinary**. Fuente de verdad = `cloudinary_public_id`. Guarda también `secure_url` (fallback), `width`, `height`, `alt`, `position`. |
| **PageBlock** (`page_blocks`) | Un bloque de contenido editable de una subpágina pública, identificado por `key` (p. ej. `nosotros.history`, `nosotros.team`, `proyectos.list`). `data` es `jsonb` con la **misma forma** que los tipos de `src/data/**/*.types.ts`. |
| **Publicado** (`published`) | Booleano. `true` = la web pública lo muestra. `false` = borrador, solo visible para el staff. La web pública (rol `anon`) solo lee filas `published = true`. |
| **Procedencia** (`source`) | `content_source`: `supabase` \| `cloudinary` \| `static`. Toda fila y toda foto lo llevan (regla de trazabilidad). |

## Resolución de contenido (build-time)

| Término | Definición |
|---|---|
| **`resolveContent` / CompositeContentRepository** | Estrategia de lectura en build: intenta **(1)** Supabase en vivo → **(2)** snapshot `*.fallback.json` → **(3)** `*.data.ts` estático → **(4)** estado vacío curado. Devuelve el primero disponible, conservando su `source`. |
| **Snapshot de fallback** (`*.fallback.json`) | Copia versionada del último contenido `published` leído con éxito de Supabase, con `fetchedAt`. La genera el script `prebuild`. Es el "último estado bueno conocido". |
| **Estado vacío curado** | El diseño que ya muestran hoy `/proyectos`, `/nosotros`, `/convocatorias` cuando no hay datos. No son marcadores `[Contenido pendiente]`. |

## Reglas de dominio (puras, en `src/domain/`)

| Función | Contrato |
|---|---|
| `canEdit(actor: Profile, resource: OwnedResource): boolean` | `true` si `actor` es `super_admin`; o `director` y `resource.areaSlug === actor.areaSlug`; o `subdirector` y `resource.ownerId === actor.id`. |
| `canCreateIn(actor: Profile, areaSlug: string): boolean` | `true` si `super_admin`; o `actor.areaSlug === areaSlug`. |
| `buildCloudinaryUrl(publicId, width): string` | `https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,w_<width>/<publicId>` |
| `buildLumaLinks(config): { calendarUrl: string; embedUrl: string \| null }` | `calendarUrl` siempre; `embedUrl` = `PUBLIC_LUMA_EMBED_URL` o `null`. |
| `resolveContent(sources): Resolved<T>` | Primer source no vacío, con su `source`. |

## Autenticación

| Término | Definición |
|---|---|
| **AAL** (Authentication Assurance Level) | `aal1` = solo contraseña; `aal2` = contraseña + segundo factor. El middleware **lee** el AAL desde el Sprint 2 pero **no exige** `aal2` (MFA-ready, TOTP diferido a post-piloto). |
| **Auth Hook** (`custom_access_token_hook`) | Función SQL que Supabase ejecuta al emitir un token: copia `role`, `area_slug`, `is_active` del `profile` al `app_metadata` del JWT. |
| **Ruta oculta** | `/administrator`. Sin enlace en ningún componente público, fuera del sitemap, `Disallow` en robots, sin HTML prerenderizado. La seguridad real es la sesión, no la ocultación. |
