# DISEÑO TÉCNICO — Panel de Administración + Integración Luma (LEAD UTP)

> Paso 2 de 6. **Cómo** se implementa el stack ya decidido — no evalúa alternativas de stack.
> Stack cerrado: **Supabase** (Auth + Postgres) · **Cloudinary** (fotos) · **Luma** (embed/link, sin API) · **Astro `static` + adaptador, rutas on-demand solo en `/administrator/*`**.
> Precede a: `docs/DISENO_TECNICO.md` aprobado → Paso 3 (scaffolding, `database/schema.sql`, `API_CONTRACTS.md`).
> Base: `docs/REQUISITOS_ADMIN.md`. Última actualización: 2026-09-10.

---

## 0. Arquitectura hexagonal — cómo encaja sobre el repo actual

El dominio es **puro** (regla inquebrantable 3): no importa `@supabase/*`, `cloudinary`, ni `astro`. Las dependencias apuntan hacia adentro.

| Capa | Carpeta (nueva salvo nota) | Contenido | Puede importar |
|---|---|---|---|
| **Dominio** | `src/domain/` | Tipos + reglas puras: `Role`, `Area`, `EventPointer`, `Gallery`, `GalleryPhoto`, `PageBlock`, y funciones como `canEdit(actor, resource)`, `resolveContent(db, fallback, static)`. Reutiliza `src/data/events/events.utils.ts` (ya es puro). | Nada externo. |
| **Puertos** | `src/domain/ports/` | Interfaces: `ContentRepository`, `PhotoStorage`, `AuthGateway`. | Solo dominio. |
| **Adaptadores** | `src/infra/` | `SupabaseContentRepository`, `FallbackContentRepository`, `CloudinaryPhotoStorage`, `SupabaseAuthGateway`. **Únicos** archivos que tocan los SDK. | Puertos + dominio + SDK. |
| **Composición** | `src/infra/container.ts` | Cablea puertos ↔ adaptadores según entorno (build vs runtime). | Todo `infra`. |
| **UI pública** | `src/pages/*.astro`, `src/components/**` (existentes) | En build-time llaman a `ContentRepository` vía el contenedor. | Puertos + contenedor. Nunca un adaptador directo. |
| **UI panel** | `src/pages/administrator/**`, `src/components/admin/**` (nuevo) | Pantallas del panel. | Puertos + contenedor. |

> Regla de oro: si mañana se cambiara Supabase por otra cosa (no está en plan), solo `src/infra/` cambiaría. El dominio y la UI no.

---

## 1. Autenticación y roles en Supabase

### 1.1 Modelo de datos de identidad

| Tabla | Propósito | Campos clave |
|---|---|---|
| `auth.users` | Gestionada por Supabase Auth. Login por **email + contraseña**. | `id uuid`, `email`, `encrypted_password`, `email_confirmed_at` |
| `public.areas` | Las "áreas / direcciones" de LEAD UTP a las que pertenece cada director/subdirector. | `id uuid pk`, `slug text unique`, `name text`, `pillar_slug text null` (link opcional al pilar), `created_at` |
| `public.profiles` | 1:1 con `auth.users`. Rol y área de cada persona del staff. | `id uuid pk references auth.users(id) on delete cascade`, `full_name text`, `role app_role not null`, `area_id uuid references areas(id)`, `is_active bool default true`, `created_at`, `updated_at` |

```sql
create type app_role as enum ('director', 'subdirector', 'super_admin');
```

- `super_admin`: `area_id` puede ser `null` (actúa sobre todas las áreas).
- Un `profile` se crea **solo** por un `super_admin` (ver 1.4). No hay auto-registro.

### 1.2 Claims en el JWT (para que RLS sea barato)

Un **Auth Hook** de Supabase (`custom_access_token_hook`, SQL) inyecta `role` y `area_id` del `profile` dentro del `app_metadata` del JWT en cada login/refresh. Así las políticas RLS leen `auth.jwt()` sin subconsultas por fila.

Helpers `SECURITY DEFINER` (esquema `public`), usados por las políticas:

| Función | Devuelve |
|---|---|
| `auth_role()` | `app_role` del usuario actual (de `auth.jwt() -> 'app_metadata' ->> 'role'`) |
| `auth_area()` | `uuid` del área del usuario actual, o `null` |
| `is_super_admin()` | `boolean` |

### 1.3 Row Level Security — "cada uno solo edita lo suyo"

**Toda** tabla de contenido lleva dos columnas de autoría + trazabilidad:

| Columna | Tipo | Significado |
|---|---|---|
| `owner_id` | `uuid references profiles(id)` | Quién creó/es dueño de la fila. |
| `area_id` | `uuid references areas(id)` | A qué área pertenece el contenido. |
| `source` | `content_source` enum (`supabase` / `cloudinary` / `static`) default `supabase` | Procedencia (regla inquebrantable 5). |
| `published` | `bool default false` | Si la web pública lo muestra. |

**Matriz de permisos (recomendación a validar por el PO — decisión D2):**

| Acción | `anon` (web pública) | `subdirector` | `director` | `super_admin` |
|---|---|---|---|---|
| **SELECT** | Solo filas `published = true` | Todo (para revisar) | Todo | Todo |
| **INSERT** | — | Sí, forzando `owner_id = auth.uid()` y `area_id = auth_area()` | Igual | Sí, cualquier `area_id` |
| **UPDATE / DELETE** | — | **Solo** filas con `owner_id = auth.uid()` | Cualquier fila de **su** área (`area_id = auth_area()`) | Cualquier fila |

Patrón de política (ejemplo para `event_galleries`):

```sql
alter table event_galleries enable row level security;

-- Lectura pública: solo publicado
create policy "public reads published"
  on event_galleries for select
  to anon
  using (published = true);

-- Lectura staff: todo
create policy "staff reads all"
  on event_galleries for select
  to authenticated
  using (true);

-- Alta: dueño = yo, área = la mía (o super_admin libre)
create policy "staff inserts own-area"
  on event_galleries for insert
  to authenticated
  with check (
    is_super_admin()
    or (owner_id = auth.uid() and area_id = auth_area())
  );

-- Edición / borrado: subdirector solo lo suyo, director toda su área
create policy "staff updates by scope"
  on event_galleries for update
  to authenticated
  using (
    is_super_admin()
    or (auth_role() = 'director' and area_id = auth_area())
    or (auth_role() = 'subdirector' and owner_id = auth.uid())
  )
  with check ( /* mismas condiciones */ );

create policy "staff deletes by scope"
  on event_galleries for delete
  to authenticated
  using ( /* mismas condiciones que update.using */ );
```

- Mismo juego de 4 políticas se replica en `luma_event_pointers`, `page_blocks`, `gallery_photos` (esta última hereda el scope de su `gallery_id` vía join a `event_galleries`).
- `gallery_photos` no lleva `area_id` propio; su política hace `exists (select 1 from event_galleries g where g.id = gallery_id and <mismo predicado de scope>)`.
- Tabla `profiles`: solo `super_admin` hace INSERT/UPDATE/DELETE; cada quien puede SELECT su propia fila; `director` puede SELECT perfiles de su área.

### 1.4 Alta de usuarios (sin auto-registro)

| Paso | Cómo |
|---|---|
| Deshabilitar registro público | Supabase Dashboard → Auth → *Allow new users to sign up* = **OFF**. |
| Crear un director/subdirector | Pantalla `/administrator/usuarios` (solo `super_admin`) → endpoint server `POST /administrator/api/users` → usa `SUPABASE_SECRET_KEY` (solo servidor; reemplaza a la `service_role key` legacy, mismo privilegio elevado) con `supabase.auth.admin.inviteUserByEmail()` o `createUser()` + inserta su `profile` (rol + área). |
| Primer `super_admin` | Se crea a mano una vez desde el Dashboard de Supabase + `insert into profiles`. Documentado en `MEMORY.md` en Sprint 2. |

### 1.5 Acceso por URL oculta `/administrator` (sin botón de login público)

| Mecanismo | Detalle |
|---|---|
| Sin enlaces | `/administrator` **no** aparece en `Navbar.astro`, `Footer.astro`, ni ningún componente público. Sin CTA, sin link en 404. |
| Fuera del sitemap | `sitemap()` recibe `filter: (page) => !page.includes('/administrator')`. |
| `robots.txt` | Se añade `Disallow: /administrator` (es **orientativo**, no es seguridad — la seguridad real es la sesión). |
| Ruta on-demand | `/administrator/**` con `prerender = false` (ver §4). No existe HTML prerenderizado que un crawler encuentre. |
| Middleware guard | `src/middleware.ts` intercepta toda petición a `/administrator/**` **excepto** `/administrator/login`. Sin sesión válida → se **renderiza directamente la pantalla de login** (no un redirect 302 que revele estructura), con `status 200`. |
| Validación de sesión | `@supabase/ssr` lee las cookies; `supabase.auth.getUser()` **valida el JWT contra Supabase** (no solo lo decodifica). Resultado en `Astro.locals.user` + `Astro.locals.profile`. |
| Cookies | `httpOnly`, `secure`, `sameSite=lax`, `path=/administrator`. Gestionadas por `@supabase/ssr`. |
| "Entrar como administrador" | Tras login, todos los roles aterrizan en el mismo `/administrator` (dashboard); lo que cambia es qué acciones habilita el rol (RLS + chequeos en UI). |

### 1.6 2FA — evaluación y recomendación

Supabase Auth soporta MFA con **factor TOTP** (app de autenticación, GA) y expone niveles de garantía (**AAL1** = solo contraseña, **AAL2** = contraseña + segundo factor). El VP lo mencionó como "código OTP".

| Opción | Qué implica | Fricción |
|---|---|---|
| TOTP obligatorio ya (Sprint 2) | Cada director/subdirector instala Google/Microsoft Authenticator, escanea QR en el primer login; middleware exige `aal2` para `/administrator/**`. | Alta: bloquea a quien no configure el authenticator; soporte a usuarios no técnicos. |
| TOTP opcional | Se puede activar por usuario; no se exige. | Baja, pero da falsa sensación (casi nadie lo activa). |
| **Diferir, dejando la base "MFA-ready"** | Sprint 2 usa `@supabase/ssr` y el middleware **ya lee el AAL** (sin exigir `aal2` todavía). El flujo de enrolar TOTP queda como fast-follow (Sprint 6 o post-merge). | Ninguna ahora; el switch a obligatorio es un cambio de una línea en el guard + una pantalla de enrolamiento. |

**Recomendación: diferir el 2FA obligatorio a post-piloto y construir Sprint 2 MFA-ready.** Razones:

1. **Tamaño y perfil del equipo**: un puñado de directores/subdirectores, varios no-devs; el objetivo del proyecto es **que suban contenido sin depender de un dev** — una barrera de TOTP en el primer login puede matar la adopción.
2. **Sensibilidad del dato**: el panel gestiona texto y fotos de eventos, no datos financieros ni PII de terceros. El impacto de una cuenta comprometida es "alguien edita una galería", reversible con historial.
3. **Ya hay defensas**: sin botón de login público, rutas no prerenderizadas, rate-limiting de Supabase Auth, contraseña fuerte obligatoria, `email_confirmed_at` requerido.
4. **Reversible barato**: al ser MFA-ready, activarlo cuando (a) el panel gestione algo más sensible, o (b) el VP lo pida explícitamente antes de lanzar, cuesta poco.

**Decisión que el PO debe tomar en este paso:** aprobar "diferir + MFA-ready", o exigir TOTP obligatorio desde Sprint 2.

---

## 2. Subida de fotos a Cloudinary

### 2.1 Método: unsigned vs. endpoint propio

| Opción | Cómo | Riesgo |
|---|---|---|
| (A) Unsigned upload preset, browser → Cloudinary | El nombre del preset + `cloud_name` viajan en el JS del cliente. | Cualquiera que lea el bundle puede subir a la cuenta LEAD (quema de cuota, defacement). El panel está auth-gated, pero el preset queda expuesto igual. |
| (B) **Firma en endpoint propio, luego browser → Cloudinary** | Un endpoint server (`/administrator/api/uploads/sign`) valida sesión + permiso, y devuelve una **firma** (`timestamp` + `signature` con `CLOUDINARY_API_SECRET`, que nunca sale del servidor) con `folder`/`allowed_formats` **fijados por el servidor y firmados** — `maxFileSize` también viaja en la respuesta pero **no** entra en la firma (ver §2.2, es un límite que hace cumplir el cliente, no Cloudinary). El browser sube directo a Cloudinary con esa firma. | Bajo. El secreto no se expone; los parámetros firmados no se pueden alterar sin invalidar la firma. |
| (C) Proxy: browser → endpoint propio → Cloudinary | El endpoint recibe los bytes y los reenvía. | Quema tiempo/memoria de función serverless en Vercel por cada MB; punto extra de fallo. |

**Recomendación: (B) firma en endpoint propio.** Es el patrón recomendado por Cloudinary, mantiene el secreto server-side, y no paga el coste de proxear archivos pesados. **No** se añade el SDK `cloudinary`: la firma es un `SHA-1` de ~10 líneas con el `crypto` de Node.

### 2.2 Flujo completo

| # | Actor | Acción |
|---|---|---|
| 1 | Panel (browser) | El director elige N imágenes en el formulario de una galería. |
| 2 | Browser → `POST /administrator/api/uploads/sign` | Body: `{ galleryId }`. El endpoint: valida `Astro.locals.profile`, comprueba (vía RPC `can_edit_gallery`, mismo predicado que la RLS) que ese perfil **puede editar** esa galería, y responde `{ timestamp, signature, apiKey, cloudName, folder: "lead-utp/<area-slug>/<gallery-slug>", allowedFormats: "jpg,png,webp", maxFileSize: 10485760 }`. |
| 3 | Browser → `POST https://api.cloudinary.com/v1_1/<cloud>/image/upload` | Antes de nada, el cliente compara `file.size` contra `maxFileSize` y rechaza localmente si excede (ver nota abajo). Si pasa, sube con los params firmados — **`allowed_formats` va en el form-data bajo ese nombre exacto (snake_case, el de Cloudinary), no `allowedFormats`** (ver docs/API_CONTRACTS.md §4); `max_file_size` **no se manda**. Cloudinary responde `{ public_id, secure_url, width, height, format, bytes }`. |
| 4 | Browser → `POST /administrator/api/galleries/:id/photos` | Body: `{ publicId, secureUrl, width, height, alt }`. El endpoint **re-valida** permiso y hace `insert into gallery_photos`. |
| 5 | Panel | Refresca la galería mostrando las fotos por `public_id`. |

- Validación de permiso ocurre **dos veces** (firma y registro) — nunca se confía en el cliente.
- `allowed_formats=jpg,png,webp` va **firmado** — no es solo una recomendación aplicada en la entrega, Cloudinary lo valida contra la firma al recibir la subida y la rechaza si el cliente intenta cambiarlo.
- **`max_file_size` NO va firmado, ni se manda a Cloudinary en absoluto** (bug real, corregido — ver MEMORY.md). Es un parámetro de *upload preset* (unsigned), no de un upload firmado ad-hoc: Cloudinary no lo incluye en su propio cálculo de firma (firmarlo invalida la firma para **toda** subida, sin importar formato ni tamaño) y lo ignora en silencio si se manda sin firmar (confirmado: un archivo de 10MB pasó con `max_file_size=1MB`). El límite de `maxFileSize` lo hace cumplir el **cliente** — compara `file.size` antes de intentar la subida y muestra un error claro si excede, sin gastar ancho de banda en un intento que Cloudinary no rechazaría de todos modos.
- `tags` queda fuera por ahora (sin uso definido). `auto-webp/avif` y `quality:auto` sí son solo de la **entrega** (ver `buildCloudinaryUrl`, no van en la firma de subida).

> **Limitación conocida y aceptada — el límite de 10 MB es de UX, no de seguridad dura.** Como `max_file_size` no existe para subidas firmadas (punto anterior), no hay forma de que Cloudinary imponga el límite del lado del servidor en este flujo. La única validación real es la que hace el propio navegador antes de subir — quien edite el JS del cliente (devtools) puede saltársela y subir un archivo más pesado igual; Cloudinary lo aceptaría (su único tope real y no configurable por nosotros es el de subida simple, 100 MB — por encima de eso exige el endpoint de subida en chunks, que no usamos). Se acepta este riesgo conscientemente porque quien sube fotos es **siempre staff autenticado con permiso de editar esa galería** (nunca un visitante público) — el peor caso es una cuenta de staff usando más cuota de Cloudinary de la esperada, no una brecha de seguridad. Si en el futuro esto importa más (ej. cuenta de staff comprometida, o cuota de Cloudinary ajustada), la mitigación real sería validar `bytes` en la respuesta de Cloudinary **antes** de aceptar el registro en `POST /administrator/api/galleries/:id/photos`, `destroy()`-eando el asset si excede — hoy no se implementa por no ser necesario para el riesgo real de este proyecto.

### 2.3 Referencia en Supabase

| Tabla | Campos |
|---|---|
| `event_galleries` | `id`, `title`, `slug`, `body text` (markdown), `happened_on date`, `pillar_slug text null`, `area_id`, `owner_id`, `source`, `published`, `created_at`, `updated_at` |
| `gallery_photos` | `id`, `gallery_id references event_galleries(id) on delete cascade`, `cloudinary_public_id text not null`, `secure_url text not null`, `width int`, `height int`, `alt text`, `position int default 0`, `source content_source default 'cloudinary'`, `created_at` |

- **Fuente de verdad = `cloudinary_public_id`**. Las URLs de entrega (con transformaciones responsive) se **derivan en render**: `https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,w_<w>/<public_id>`.
- `secure_url` se guarda además como **fallback** de degradación (ver §5) y para no reconstruir si cambia el esquema de transformaciones.
- `width`/`height` se guardan para reservar el espacio y evitar CLS (mismo cuidado que las galerías actuales con `<img>` plano).

---

## 3. Sección de Eventos en la web pública

### 3.1 Contexto — el problema del iframe

`/convocatorias` ya mostró que un iframe cross-origin (Google Forms) **siempre** se ve con fondo blanco, no hereda el tema oscuro, y hubo que acotarlo a ~380px y presentarlo como un inset intencional. El embed de Luma tiene exactamente la misma limitación.

### 3.2 Iframe embebido vs. botón de redirección — recomendación

**Recomendación: enlace primero (siempre presente y fiable) + iframe de Luma opcional como mejora progresiva.**

| Capa | Qué es | Estado |
|---|---|---|
| **Primaria** | Sección `/eventos` nativa (componentes y tokens existentes) con: título, texto que explica que **la inscripción se hace en Luma**, y un `Button` (variant `primary`, ya existe) "Ver todos los eventos en Luma" → abre `PUBLIC_LUMA_CALENDAR_URL` en pestaña nueva. | Siempre visible. No depende de que Luma cargue. |
| **Secundaria (opcional)** | Debajo del CTA, una tarjeta contenida (`max-w`, `rounded-2xl`, `hairline`) con el `<iframe>` del calendario de Luma, con estado "Cargando calendario…", `loading="lazy"`, y un **timeout de ~8s + `onerror`**: si no carga, la tarjeta se oculta y queda solo el CTA. | Progresiva. Su ausencia no rompe nada. |

**Por qué no iframe-only:** repite el choque de tema del que ya se sufrió, `/eventos` es sección de alto tráfico, y un iframe que falla en silencio dejaría la página "rota". El enlace degrada a "simplemente funciona".

**Por qué no botón-only:** el VP pidió explícitamente considerar el embed; la mejora progresiva da lo mejor de ambos sin acoplar la página a Luma.

### 3.3 Sin sincronización

- La `src` del iframe y la URL del botón son **constantes de build** (`PUBLIC_LUMA_CALENDAR_URL`). **Cero llamadas a la API de Luma**, cero scraping. Luma sigue siendo la única fuente de verdad.
- `/eventos` permanece **100% estática** (prerender).

### 3.4 Estructura de `/eventos` resultante

| Sección de la página | Fuente | Sprint |
|---|---|---|
| Hero + "Próximos eventos" | Luma (CTA + iframe opcional) | Sprint 1 (piloto) |
| "Eventos realizados" (galerías: fotos + texto, estilo `/vida-lead`) | Supabase (`event_galleries` + `gallery_photos`) en build-time, con fallback | Sprint 4 |
| Eventos destacados por un director (opcional, puntero curado a Luma) | Supabase (`luma_event_pointers`: solo `title` + `luma_url` + `pillar_slug`, **nunca** fecha/lugar/cupos autoritativos) | Sprint 3 |

> `src/data/events/events.data.ts` (22 ejemplos ficticios): en Sprint 1 se **vacía** el array y `/eventos` cae a su estado vacío + el CTA de Luma. Los `events.utils.ts` puros se conservan (los usa `/pilares/[slug]` y quedarán para `luma_event_pointers` si se necesita ordenar).

---

## 4. `astro.config.mjs` — qué pasa a servidor y qué sigue estático

> Nota (ya señalada en `REQUISITOS_ADMIN.md` §5): en Astro 7 no existe `output: 'hybrid'`. El equivalente es **`output: 'static'` (sin cambio) + un adaptador + `export const prerender = false` solo en las rutas nuevas**. El resultado es idéntico a lo que la guía llama "hybrid".

### 4.1 Diff de `astro.config.mjs`

```diff
  // @ts-check
  import { defineConfig } from 'astro/config';
  import tailwindcss from '@tailwindcss/vite';
  import sitemap from '@astrojs/sitemap';
+ import vercel from '@astrojs/vercel';

  export default defineConfig({
    site: 'https://leadutp.vercel.app',
+   output: 'static',
+   adapter: vercel(),
-   integrations: [sitemap()],
+   integrations: [
+     sitemap({ filter: (page) => !page.includes('/administrator') }),
+   ],
    vite: {
      plugins: [tailwindcss()],
    },
  });
```

- `output: 'static'` es explícito pero **no cambia el comportamiento** (ya era el default). Se escribe para dejar la intención clara.
- `adapter: vercel()` es lo único que habilita rutas on-demand. Sin `prerender = false` en ningún lado, el build sigue siendo 100% estático.

### 4.2 Tabla de rutas

| Ruta | Modo | Mecanismo | Datos |
|---|---|---|---|
| `/` | **Estática** | default | build-time desde `home.data.ts` (+ Supabase si Sprint 5 lo toca) |
| `/nosotros` | **Estática** | default | build-time: Supabase `page_blocks` → fallback `about.data.ts` → estado vacío |
| `/proyectos` | **Estática** | default | build-time: Supabase → fallback `projects.data.ts` → estado vacío |
| `/eventos` | **Estática** | default | Luma (constante) + build-time Supabase para "realizados" |
| `/pilares`, `/pilares/[slug]` | **Estática** | `getStaticPaths` (sin cambios) | `pillars.data.ts` |
| `/vida-lead` | **Estática** | default | build-time Supabase → fallback `life.data.ts` |
| `/internacional` | **Estática** | default | `international.data.ts` (sin cambios) |
| `/convocatorias` | **Estática** | default | `openings.data.ts` (sin cambios) |
| `/404` | **Estática** | default | — |
| `/administrator` (dashboard) | **On-demand** | `export const prerender = false` | sesión + Supabase en runtime |
| `/administrator/login` | **On-demand** | `prerender = false` (única ruta abierta del prefijo) | — |
| `/administrator/eventos`, `/administrator/galerias`, `/administrator/paginas`, `/administrator/usuarios`, … | **On-demand** | `prerender = false` por archivo | sesión + RLS |
| `/administrator/api/**` (endpoints `.ts`: `uploads/sign`, `galleries/*`, `users`, …) | **On-demand** | `prerender = false` | sesión + `SUPABASE_SECRET_KEY` donde aplique |

### 4.3 Cómo se garantiza que las públicas NO se vuelvan dinámicas

| Salvaguarda | Detalle |
|---|---|
| `prerender = false` solo por archivo | Nunca en un layout compartido con páginas públicas. El panel usa su propio `AdminLayout.astro`. |
| Middleware acotado | `src/middleware.ts` hace `if (!context.url.pathname.startsWith('/administrator')) return next();` en la primera línea. |
| Test de build | Un test (Vitest + inspección de `dist/`) asegura que tras `pnpm build` existen los 10 HTML públicos prerenderizados y que `dist/_functions` (o equivalente Vercel) contiene **solo** rutas `/administrator`. Se corre en cada cierre de sprint (DoD). |
| `@astrojs/sitemap` | El `filter` mantiene el panel fuera del sitemap aunque alguien lo prerenderice por error. |

---

## 5. Plan de degradación (regla inquebrantable 4)

### 5.1 Mecanismo base: snapshot de fallback en cada build

| Paso | Qué |
|---|---|
| `prebuild` (script npm, antes de `astro build`) | `src/infra/` consulta a Supabase el contenido `published` y escribe `src/data/<mod>/<mod>.fallback.json` con `{ fetchedAt, source: 'supabase', data: … }`. Si Supabase no responde → **no escribe nada** y el build usa el `.fallback.json` anterior (commiteado) o el `.data.ts`. Nunca falla. |
| `ContentRepository` en build | Orden de resolución: **(1)** Supabase en vivo → **(2)** `<mod>.fallback.json` → **(3)** `<mod>.data.ts` actual → **(4)** estado vacío curado que ya existe. Cada resultado conserva su `source`. |
| Commit del `.fallback.json` | Se versiona: es el "último estado bueno conocido" y da trazabilidad de qué se publicó en cada deploy. |

### 5.2 Qué ve el visitante / el admin ante cada fallo

| Dependencia | Momento | Página pública | Panel |
|---|---|---|---|
| **Supabase** | En **build** | Fallback JSON → `.data.ts` → estado vacío. `pnpm build` pasa igual (try/catch + valor por defecto). El deploy anterior sigue sirviendo hasta que un build nuevo tenga éxito. | — |
| **Supabase** | En **runtime** | **No se entera** (las páginas ya son HTML estático). | Pantalla clara: "No podemos conectar con el servidor, reintenta en unos minutos". Middleware: si no puede validar la sesión → trata como no autenticado → login con aviso. Nunca 500. |
| **Cloudinary** | Entrega de imágenes | `<img>` con `width`/`height` reservados + `onerror` → placeholder local (`src/assets/events/event-placeholder.svg`, ya existe). El **texto** de la galería sí se ve. | Subida: "La subida de fotos no está disponible ahora; tu texto sí se guardó". El CRUD de texto no depende de Cloudinary. |
| **Cloudinary** | Firma (endpoint) | — | El botón de subir queda deshabilitado con tooltip; el resto del formulario funciona. |
| **Luma** | iframe no carga / bloquea embedding | Timeout ~8s + `onerror` → la tarjeta del iframe se **oculta**; queda el `Button` "Ver eventos en Luma" (link directo, siempre presente). Nunca 500, nunca sección vacía. | — |
| **Adaptador / función Vercel** | Caída | **Público intacto** (todo estático). | `/administrator/*` responde 503 de Vercel. Riesgo aceptado: el panel no es crítico para el visitante. |

### 5.3 Trazabilidad (regla 5)

Cada fila de contenido y cada foto llevan `source` (`supabase` / `cloudinary` / `static`). En build-time, `ContentRepository` propaga ese valor y — en modo debug — puede emitir un `data-source` en el DOM para auditar de dónde salió cada bloque. El `.fallback.json` registra `fetchedAt`.

---

## 6. Variables de entorno y librerías

### 6.1 Env vars (Vercel + `.env` local gitignored, tipadas en `env.d.ts`, nunca hardcodeadas)

| Variable | Uso | ¿Llega al cliente? |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | build + runtime + login del cliente | Sí (`PUBLIC_`) |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | login del cliente + lectura en build — reemplaza a la `anon key` legacy | Sí (protegida por RLS) |
| `SUPABASE_SECRET_KEY` | **solo** endpoints server (crear usuarios) — reemplaza a `service_role` | **NO — nunca** |
| `PUBLIC_CLOUDINARY_CLOUD_NAME` | derivar URLs de entrega en render | Sí |
| `CLOUDINARY_API_KEY` | firma (endpoint server) | No |
| `CLOUDINARY_API_SECRET` | firma (endpoint server) | **NO — nunca** |
| `PUBLIC_LUMA_CALENDAR_URL` | `src` del iframe + href del botón | Sí |

### 6.2 Dependencias a añadir

| Paquete | Para qué | Capa |
|---|---|---|
| `@supabase/supabase-js` | Cliente Supabase (compatible con las keys `publishable`/`secret` en cualquier versión ^2, sin cambios de código — son strings opacos que se pasan igual a `createClient(url, key)`) | Solo `src/infra/` |
| `@supabase/ssr` | Sesión con cookies en Astro SSR (middleware + endpoints) | Solo `src/infra/` + `src/middleware.ts` |
| `@astrojs/vercel` | Adaptador para rutas on-demand | `astro.config.mjs` |
| — Cloudinary | **Ninguna.** Firma con `crypto` nativo + `fetch`; subida directa del browser. | — |

---

## 7. Alcance de tests (TDD) que este diseño habilita

| Test (Rojo → Verde) | Capa |
|---|---|
| `canEdit(actor, resource)` — matriz `super_admin` / `director` / `subdirector` × `propio` / `misma área` / `otra área` | Dominio (puro) |
| `resolveContent()` — cadena Supabase → JSON → static → vacío, simulando cada fallo | Dominio (puro) |
| Constructor de URL de entrega de Cloudinary desde `public_id` + ancho | Dominio (puro) |
| Lógica de fallback del iframe de Luma (timeout / onerror → ocultar, botón persiste) | Dominio + componente |
| Middleware: sin sesión → login; con sesión → pasa; `/administrator/login` siempre abierto; ruta pública → `next()` inmediato | Infra |
| Test de build: 10 HTML públicos prerenderizados; funciones solo bajo `/administrator` | Infra / CI |

---

## 8. Preguntas abiertas para el PO (a resolver antes o durante Paso 3)

| # | Pregunta | Bloquea | Mi recomendación |
|---|---|---|---|
| P1 | **D2 — modelo de propiedad**: ¿`super_admin` = todo, `director` = toda su área, `subdirector` = solo lo suyo? | Esquema RLS (Paso 3 `schema.sql`) | Sí, adoptarlo tal cual (§1.3). |
| P2 | **Lista real de "áreas"**: ¿coinciden con los 6 pilares o son direcciones aparte? ¿quién es director/subdirector de cada una? | Seed de `areas` + `profiles` en Sprint 2 (no bloquea el diseño) | Input del VP. Modelar `areas` como tabla propia con `pillar_slug` opcional. |
| P3 | **2FA**: ¿se aprueba diferir el TOTP obligatorio a post-piloto, con Sprint 2 MFA-ready? | Alcance de Sprint 2 | Diferir + MFA-ready (§1.6). |
| P4 | **`/eventos` Sprint 1**: ¿enlace-first + iframe opcional (§3.2), o solo botón? | Alcance de Sprint 1 | Enlace-first + iframe opcional. |
| P5 | **Luma**: ¿ya existe el calendario público y su URL de embed? ¿es un *calendar embed* o eventos sueltos? | Implementación de Sprint 1 | Necesito la URL para Sprint 1. |
| P6 | **Dominio propio** (`leadutp.org`, `PENDIENTES.md` §11): ¿se conecta antes o después del merge del panel? | URL final del panel (cosmético) | Después; el panel funciona igual en `*.vercel.app`. |

---

## 9. Resumen para aprobación del PO

| Punto del encargo (Paso 2) | Resuelto en | Recomendación |
|---|---|---|
| 1 · Tabla de usuarios/roles | §1.1–§1.2 | `profiles` (1:1 con `auth.users`) + `areas` + enum `app_role`; claims en JWT vía Auth Hook |
| 1 · RLS "solo edita lo suyo" | §1.3 | Matriz D2: super_admin todo / director su área / subdirector solo lo propio; 4 políticas por tabla |
| 1 · Acceso por URL oculta sin botón de login | §1.5 | Sin enlaces + fuera de sitemap/robots + `prerender=false` + middleware que renderiza login sin redirect |
| 1 · 2FA | §1.6 | **Diferir TOTP obligatorio, Sprint 2 MFA-ready** — decisión del PO |
| 2 · Upload Cloudinary: unsigned vs endpoint | §2.1 | **Firma en endpoint propio** (secreto server-side, sin proxear bytes, sin SDK) |
| 2 · Referencia en Supabase | §2.3 | `event_galleries` + `gallery_photos`; fuente de verdad = `cloudinary_public_id`, `secure_url` como fallback |
| 3 · Iframe vs botón para Luma | §3.2 | **Enlace-first + iframe opcional con fallback**; sin API, `/eventos` sigue estática |
| 4 · `astro.config.mjs` | §4.1–§4.2 | `output:'static'` + `adapter: vercel()` + `prerender=false` solo en `/administrator/**`; 10 públicas intactas |
| 5 · Plan de degradación | §5 | Snapshot `.fallback.json` en cada build + cadena Supabase→JSON→static→vacío; público estático nunca ve 500 |

**No se escribió código. No se propuso stack alternativo.**

---

## 10. Decisiones del PO (aprobado 2026-09-10)

| # | Decisión | Efecto en el diseño |
|---|---|---|
| **P1** | RLS aprobado tal cual. | La matriz de §1.3 (super_admin todo / director su área / subdirector `owner_id`) es definitiva. |
| **P2** | Las "áreas" **mapean 1:1 a los 6 pilares** de `src/data/pillars/pillars.data.ts`. Se usan **esos mismos slugs** (`desarrollo-profesional`, `liderazgo`, `excelencia-femenina`, `desarrollo-del-capitulo`, `excelencia-academica`, `lead-academia`) como valor del campo área. Nombres de directores/subdirectores → seed en Sprint 2. | **Se elimina la tabla `areas`.** `profiles.area_slug` y `<contenido>.area_slug` son `text` con FK a una tabla de referencia `pillars` (id = slug), sembrada desde los datos estáticos (`source = 'static'`). `auth_area()` devuelve `text` (el slug). |
| **P3** | Diferir TOTP obligatorio; Sprint 2 "MFA-ready". | §1.6 confirmado. El middleware lee AAL desde Sprint 2 pero no exige `aal2`. |
| **P4** | Eventos Sprint 1: enlace-first + iframe opcional con timeout/onerror. | §3.2 confirmado. |
| **P5** | Calendario de Luma: **`https://luma.com/leadutp_`** — verificado, público, activo (org "LEAD UTP", eventos visibles p. ej. "Study Abroad Fest UTP 2026"). Ver §3.5. | `PUBLIC_LUMA_CALENDAR_URL = https://luma.com/leadutp_`. El iframe usa el **snippet de embed del panel de Luma** (Calendar → Settings → Embed), no la URL pública directa. |
| **P6** | Dominio propio `leadutp.org`: **después** del merge del panel. Fuera de alcance. | El panel opera en `*.vercel.app`. Sin cambios de dominio en ningún sprint de este backlog. |

### 3.5 Verificación del embed de Luma (P5)

| Comprobación | Resultado |
|---|---|
| ¿La página pública carga? | **Sí.** `https://luma.com/leadutp_` responde, es el calendario de "LEAD UTP", lista eventos (visto: "Study Abroad Fest UTP 2026"). |
| ¿Luma permite embeber un calendario? | **Sí.** Luma documenta el embed de calendario en *Calendar → Settings → Embed*, que genera un `<iframe>` (formato `lu.ma/embed/calendar/<cal-id>/events`). El `<cal-id>` **no** es el slug de vanidad `leadutp_`; hay que copiarlo del panel de Luma del equipo. |
| ¿Se puede iframear `luma.com/leadutp_` directamente? | **No es la vía soportada.** Las páginas públicas de Luma normalmente bloquean el framing (`frame-ancestors`); el path `/embed/` es el pensado para insertar. |
| Plan | Sprint 1: el equipo pega el **snippet de embed** desde su panel de Luma → se guarda el `cal-id` en `PUBLIC_LUMA_EMBED_URL`. Si el equipo no puede/quiere generar el snippet → **solo botón** hacia `https://luma.com/leadutp_`, sin iframe (degradación ya prevista en §3.2). |

Fuentes consultadas: [luma.com/leadutp_](https://luma.com/leadutp_) · [Embed Luma on Your Website](https://help.luma.com/p/embed-luma-on-your-website)

**Esperando aprobación de este paso queda superado — se procede al Paso 3.**
