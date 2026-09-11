# BACKLOG — Panel de administración + integración Luma (LEAD UTP)

> Secuencia **fija** de 7 sprints (0–6), decidida en `docs/GUIA_METODOLOGIA_ADMIN.md`. No se reordena ni se fusiona.
> Ningún sprint arranca sin la DoD del anterior cumplida y validada — **hoy 100% en local** (`pnpm build` + `pnpm dev`; `pnpm preview` no es compatible con `@astrojs/vercel`, ver MEMORY.md L20); Vercel aún no está conectado (ver nota de fase en `docs/GUIA_METODOLOGIA_ADMIN.md`, sección "Flujo de trabajo con git y Vercel").
> Ciclo por tarea: Rojo (test que falla) → Verde (código mínimo) → `pnpm build` completo → `MEMORY.md`.
> Estados: `TODO` · `WIP` · `BLOCKED` · `DONE`.

| Sprint | Épica | Estado | Piloto |
|---|---|---|---|
| 0 | Infraestructura base | ✅ DONE | — |
| 1 | Eventos + embed Luma | ✅ DONE (6/6 + 1 extra) | ✅ **piloto** |
| 2 | Autenticación y roles | ✅ DONE (8/8) | — |
| 3 | CRUD de eventos propios | ✅ DONE (6/6) | — |
| 4 | Galería "así se vivió el evento" | TODO | — |
| 5 | Extensión a Nosotros y Proyectos | TODO | — |
| 6 | Pulido UX/UI | TODO | — |

Regla de secuencia: el Sprint 2 (auth) no arranca hasta que el Sprint 1 esté validado en local — así, si Supabase se complica, Eventos ya quedó entregado de forma independiente.

---

## Sprint 0 · Infraestructura base

**Meta / DoD:** proyecto Supabase creado y con `schema.sql` aplicado, cuenta Cloudinary lista, variables de entorno configuradas, `astro.config.mjs` con adaptador, capa hexagonal vacía compilando. **Sin UI.** `pnpm build` produce las mismas 10 páginas públicas estáticas y **cero** funciones de servidor. Validado localmente con `pnpm build && pnpm preview`.

> **Estado real (2026-09-10):** ✅ **6/6 — Sprint 0 completo.** T0.1/T0.2/T0.4/T0.5/T0.6 verificados por el agente (código, tests, build). **T0.3 verificado por el PO directamente en el dashboard de Supabase** (Table Editor + Authentication → Policies), no por código ni por test automatizado — ver detalle en `MEMORY.md`. Corroborado además con una lectura de solo lectura (`select slug, name from pillars` vía `PUBLIC_SUPABASE_PUBLISHABLE_KEY`) → las 6 filas sembradas.

| ID | Tarea | Given / When / Then | Estado |
|---|---|---|---|
| T0.1 | Adaptador Vercel + config | **Given** `astro.config.mjs` sin `output` ni adaptador · **When** se añade `output: 'static'`, `adapter: vercel()` y `sitemap({ filter })` · **Then** `pnpm build` pasa y `dist/` tiene los 10 HTML públicos; ninguna función generada | ✅ DONE |
| T0.2 | Variables de entorno | **Given** cuentas Supabase/Cloudinary · **When** se cargan en Vercel (+ `.env` local gitignored + `src/env.d.ts` tipado) · **Then** el build compila y `git grep` no encuentra ninguna key | ✅ DONE |
| T0.3 | Aplicar `database/schema.sql` | **Given** proyecto Supabase nuevo · **When** se corre el schema · **Then** existen las tablas/enums, RLS habilitado en todas, `pillars` tiene 6 filas, el Auth Hook está registrado | ✅ DONE — **verificado manualmente por el PO** en el dashboard de Supabase (Table Editor: `profiles`, `pillars`, `luma_event_pointers`, `event_galleries`, `gallery_photos`, `page_blocks` creadas; Authentication → Policies: RLS creada sin errores/warnings). Corroborado por el agente con una lectura de solo lectura de `pillars` (6 filas) |
| T0.4 | Cloudinary + firma de prueba | **Given** cuenta Cloudinary · **When** se define el `cloud_name` y un script local firma y sube 1 imagen de test · **Then** la imagen aparece en la carpeta `lead-utp/` y se borra | ✅ DONE — subida y borrado confirmados; verificado además con una segunda llamada de solo lectura al Admin API (`resources?prefix=lead-utp/_test` → `[]`) |
| T0.5 | Esqueleto hexagonal | **Given** repo sin `src/domain` · **When** se crean `src/domain/`, `src/domain/ports/` (interfaces `ContentRepository`, `PhotoStorage`, `AuthGateway`), `src/infra/` (adaptador no-op) y `src/infra/container.ts` · **Then** `pnpm test` y `pnpm build` pasan; un test verifica que `src/domain/**` no importa `astro`/`@supabase`/`cloudinary` | ✅ DONE — Rojo→Verde con `src/domain/purity.test.ts` |
| T0.6 | Test de frontera de build | **Given** el build actual · **When** se añade un test que inspecciona `dist/` (+ manifest Vercel) · **Then** afirma: 10 HTML públicos prerenderizados y funciones solo bajo `/administrator` (hoy: 0 funciones) | ✅ DONE — `src/infra/build-boundary.test.ts`, 15 HTML / 0 funciones confirmado contra build real |

---

## Sprint 1 · Eventos + embed Luma  (PILOTO — sin auth, sin Supabase)

**Meta / DoD:** `/eventos` muestra en local (`pnpm preview`) el calendario de Luma (`https://luma.com/leadutp_`) como **botón siempre visible + iframe opcional**, con degradación elegante (si el iframe no carga o no hay `PUBLIC_LUMA_EMBED_URL`, queda solo el botón). El array de `events.data.ts` se vacía. `pnpm build` limpio, 10 páginas estáticas. Cero cambios en Supabase.

> **Estado real (2026-09-10): ✅ 6/6 + 1 tarea extra aprobada por el PO.** Verificado antes de implementar: `luma.com/leadutp_` tiene `X-Frame-Options: SAMEORIGIN` (bloquea iframe); `luma.com/embed/calendar/leadutp_/events` no tiene esa cabecera ni CSP `frame-ancestors` ni JS anti-framing → **sí es embebible**, funciona directo con el slug público (sin necesitar el `cal-id` privado del dashboard).

| ID | Tarea | Given / When / Then | Estado |
|---|---|---|---|
| T1.1 | (Rojo) `buildLumaLinks()` en dominio | **Given** `{ calendarUrl, embedUrl }` de env · **When** falta `embedUrl` · **Then** devuelve `{ calendarUrl, embedUrl: null }`; con ambos, los dos | ✅ DONE — `src/domain/lumaLinks.ts` + `lumaLinks.test.ts`, Rojo→Verde |
| T1.2 | (Verde) Componente `EventsLuma.astro` | **Given** `buildLumaLinks()` · **When** se renderiza · **Then** muestra `Button` (variant `primary`) "Ver eventos en Luma" → `calendarUrl` (target `_blank`, `rel`), y si hay `embedUrl` una tarjeta con `<iframe loading="lazy">` + estado "Cargando calendario…" | ✅ DONE — `src/components/events/EventsLuma.astro`; `Button.astro` extendido con `target`/`rel` opcionales (9 archivos auditados, 0 afectados) |
| T1.3 | Fallback del iframe (script) | **Given** el iframe · **When** no dispara `load` en 8 s o dispara `error` · **Then** la tarjeta se oculta (`el.hidden = true`); el botón permanece. Respeta `prefers-reduced-motion` | ✅ DONE — custom element `<events-luma-embed>` en el mismo archivo; verificado en build real: sin `PUBLIC_LUMA_EMBED_URL`, 0 iframes renderizados |
| T1.4 | Integrar en `/eventos` | **Given** `eventos.astro` con secciones Próximos/Pasados · **When** se coloca `EventsLuma` en "Próximos eventos" y se **vacía** `events` en `events.data.ts` (se conservan `events.utils.ts` y su test) · **Then** "Próximos" muestra Luma, "Pasados" muestra su estado vacío, `FeaturedEvent` no rompe | ✅ DONE — "Pasados" enlaza a `/vida-lead` en vez de placeholder genérico |
| T1.5 | Texto de contexto | **Given** la sección · **When** se redacta · **Then** explica que la inscripción se hace en Luma; sin prometer datos que la web no tiene | ✅ DONE |
| T1.6 | Build + validación local | **Given** todo lo anterior · **When** `pnpm build && pnpm preview` (y `git push origin cms-admin` como respaldo) · **Then** 10 HTML estáticos, `/eventos` funcional en local con y sin `PUBLIC_LUMA_EMBED_URL` | ✅ DONE — 15 HTML, 0 funciones, `build-boundary.test.ts` en verde contra build fresco |
| T1.7 *(extra, aprobada por el PO)* | CTA de Luma en `HomeEventsCta.astro` mientras no haya `featuredEvent` local | **Given** la Home sin eventos destacados locales (hasta Sprint 3) · **When** se reemplaza el hueco silencioso de `HomeEvents` por un CTA simple (mismo `buildLumaLinks()`, sin listar eventos) · **Then** la Home no pierde la sección antes de una demo a la junta directiva | ✅ DONE — `src/components/home/HomeEventsCta.astro`; swap a `HomeEvents` real trivial en Sprint 3 |

**Nota Luma (P5) — resuelta:** `PUBLIC_LUMA_EMBED_URL` recomendada: `https://luma.com/embed/calendar/leadutp_/events`. Sin ella en `.env`, el sitio degrada a solo botón (comportamiento ya probado en el build).

---

## Sprint 2 · Autenticación y roles  (Supabase Auth + RLS)

**Meta / DoD:** `/administrator` accesible solo por URL directa (sin enlace público, fuera de sitemap/robots). Login usuario+contraseña contra Supabase Auth funcional en local (`pnpm preview`). Roles `director`/`subdirector`/`super_admin` con RLS verificada (bloqueo cruzado real, probado con 3 usuarios de prueba). Sin CRUD de contenido. Middleware **MFA-ready** (lee AAL, no exige). Build público intacto.

| ID | Tarea | Given / When / Then | Estado |
|---|---|---|---|
| T2.1 | (Rojo) Test del middleware | **Given** rutas `/`, `/administrator`, `/administrator/login`, `/administrator/eventos` · **When** sin sesión · **Then** `/` pasa sin tocar Supabase; `/administrator/login` pasa; el resto de `/administrator/**` renderiza login (200) | ✅ DONE — puesto en verde por T2.3 |
| T2.2 | `SupabaseAuthGateway` (adaptador) | **Given** `@supabase/ssr` · **When** se implementa el puerto `AuthGateway` (login, `getUser`, logout, `getAAL`) con cookies `httpOnly/secure/lax` · **Then** tests de contrato en verde | ✅ DONE — `src/infra/supabase/{cookieHeader,mapUserToProfile,SupabaseAuthGateway}.ts`; piezas puras con Rojo→Verde (11 tests); `container.ts` ya devuelve el adaptador real; `NoopAuthGateway` eliminado (superado) |
| T2.3 | `src/middleware.ts` | **Given** T2.1 en rojo · **When** se implementa el guard (prefijo `/administrator`, excepción `/administrator/login`, `Astro.locals.user`/`profile`, lectura de AAL sin exigir) · **Then** T2.1 en verde | ✅ DONE — verificado también en `pnpm dev` real (`/administrator` sin sesión → 200 con login; `/` público intacto) |
| T2.4 | `/administrator/login.astro` | **Given** `prerender = false` · **When** se construye el form (usuario+contraseña) con `Button`/inputs tokenizados (ver `DESIGN.md`) · **Then** login OK → redirige a `/administrator`; credenciales malas → error inline, sin filtrar detalle | ✅ DONE (código) — probado en `pnpm dev` que la pantalla renderiza; **falta que el PO pruebe el login con las 3 cuentas reales** (pendiente T2.8) |
| T2.5 | `/administrator/index.astro` (dashboard shell) | **Given** sesión válida · **When** entra · **Then** `AdminLayout` + saludo por rol + navegación del panel (placeholders); logout funciona | ✅ DONE (código) — `AdminShell.astro` (topbar + nav placeholders + logout) + `logout.astro`; verificado en `pnpm dev` que el guard también protege `/administrator/logout`; **login real con las 3 cuentas pendiente (T2.8)** |
| T2.6 | Verificación de RLS | **Given** seed de 1 `super_admin` + 1 `director(liderazgo)` + 1 `subdirector(liderazgo)` · **When** un test de integración inserta filas y consulta con cada JWT · **Then** se cumple la matriz de `DOMAIN.md` (`canEdit`) | ✅ DONE — `src/infra/supabase/rls.integration.test.ts`, 7/7 verde contra Supabase real (6 fronteras + creación por director), limpia sus filas de prueba solo. En el camino se encontró y corrigió un bug real: el Auth Hook necesitaba `SECURITY DEFINER` (ver `database/patches/001-fix-hook-security-definer.sql`, MEMORY.md L18) |
| T2.7 | sitemap / robots / sin enlaces | **Given** el sitio · **When** build · **Then** `sitemap-index.xml` no contiene `/administrator`; `robots.txt` tiene `Disallow: /administrator`; `grep` no encuentra enlaces a `/administrator` en componentes públicos | ✅ DONE — `robots.txt` con `Disallow: /administrator` (faltaba, agregado) + `src/infra/admin-route-hidden.test.ts` (nuevo, automatiza las 3 verificaciones en vez de hacerlas a mano una sola vez) |
| T2.8 | Build + validación local | **When** `pnpm build && pnpm preview` (y push como respaldo) · **Then** login real en local; bloqueo por rol correcto; 10 páginas públicas siguen estáticas | ✅ DONE — `pnpm build` limpio, 1 función esperada, 15 páginas públicas intactas, RLS verificada (T2.6), y **login/logout real confirmado por el PO en el navegador** con las 3 cuentas. En el camino se encontró y corrigió un 2º bug real: `SupabaseAuthGateway` leía `getUser()` en vez de `getClaims()` y perdía las claims del Auth Hook (ver `MEMORY.md` L19) |

---

## Sprint 3 · CRUD de eventos propios  (punteros a Luma)

**Meta / DoD:** un `director`/`subdirector` logueado crea/edita/borra **solo** los `luma_event_pointers` que le permite la RLS, guardados en Supabase. `/eventos` (público) puede mostrar los punteros `featured` publicados, en build-time, con fallback.

> **Estado real (2026-09-11): ✅ 6/6 — Sprint 3 completo.** Antes de T3.1, el PO pidió revisar si `luma_event_pointers` alcanzaba para la tarjeta visual completa (no alcanzaba — ver `database/patches/002-event-pointers-full-card.sql` y MEMORY.md D-09/D-10). Todas las tareas verificadas por el agente (tests + build en verde) y con CRUD real de punta a punta contra Supabase con las 3 cuentas de prueba, confirmado por el PO. Detalle completo en MEMORY.md, sección "Sprint 3 · CRUD de eventos propios".

| ID | Tarea | Given / When / Then | Estado |
|---|---|---|---|
| T3.1 | (Rojo) `canEdit()` — matriz completa | **Given** actor × recurso (propio / misma área / otra área) × rol · **When** se evalúa · **Then** coincide con `DOMAIN.md` | ✅ DONE |
| T3.2 | `SupabaseContentRepository` — punteros | **Given** el puerto `ContentRepository` · **When** se implementan `listPointers`, `createPointer`, `updatePointer`, `deletePointer` · **Then** tests de contrato (con RLS) en verde | ✅ DONE |
| T3.3 | Endpoints `/administrator/api/event-pointers` | **Given** `docs/API_CONTRACTS.md` · **When** GET/POST/PATCH/DELETE · **Then** validan sesión + delegan la autorización a la RLS; errores tipados | ✅ DONE |
| T3.4 | UI `/administrator/eventos` | **Given** sesión · **When** el director abre la pantalla · **Then** ve solo lo editable por su rol; puede crear (título + URL de Luma + fecha + ubicación + imagen (URL) + descripción corta + pilar + `featured`), editar y borrar; validación de que `luma_url` sea de Luma, `imageUrl` sea `https://` y `shortDescription` ≤ 280 chars | ✅ DONE |
| T3.5 | Web pública: punteros destacados | **Given** punteros `published && featured` · **When** build de `/eventos` · **Then** se listan junto al embed; si Supabase falla → fallback → se omite la lista, el embed queda | ✅ DONE |
| T3.6 | Build + validación local | **When** `pnpm build` + `pnpm dev` (y push como respaldo; `pnpm preview` no aplica, ver MEMORY.md L20) · **Then** en local un director crea/edita/borra solo lo suyo; un subdirector no puede tocar lo de otro | ✅ DONE |

---

## Sprint 4 · Galería "así se vivió el evento"  (Cloudinary)

**Meta / DoD:** desde el panel se crea una galería (texto + fecha + pilar) y se suben fotos **directo a Cloudinary** (firma en endpoint propio), asociadas a la galería en Supabase, visibles en una página pública tipo `/vida-lead`. Degradación de imágenes probada.

| ID | Tarea | Given / When / Then | Estado |
|---|---|---|---|
| T4.1 | (Rojo) `buildSignature(params, secret)` | **Given** params ordenados + secret · **When** se firma · **Then** SHA-1 coincide con el esperado por Cloudinary (vector de prueba) | TODO |
| T4.2 | Endpoint `POST /administrator/api/uploads/sign` | **Given** sesión + `galleryId` · **When** el actor puede editar esa galería · **Then** devuelve `{ timestamp, signature, apiKey, cloudName, folder }`; si no, 403 | TODO |
| T4.3 | `CloudinaryPhotoStorage` (adaptador) | **Given** el puerto `PhotoStorage` · **When** se implementa `sign()` y `deliveryUrl(publicId, w)` · **Then** tests en verde; sin SDK | TODO |
| T4.4 | Endpoints de galería | **Given** contrato · **When** `POST/PATCH/DELETE /administrator/api/galleries` y `POST/PATCH/DELETE /administrator/api/galleries/:id/photos` · **Then** RLS aplica; re-valida permiso antes de insertar foto | TODO |
| T4.5 | UI `/administrator/galerias` | **Given** sesión · **When** el director crea galería y sube N fotos · **Then** subida directa a Cloudinary con barra de progreso; reordenar (`position`); borrar; editar texto/alt | TODO |
| T4.6 | Web pública: "Eventos realizados" | **Given** galerías `published` · **When** build de `/eventos` (sección realizados) · **Then** render con `buildCloudinaryUrl`, `width/height` reservados, `onerror` → placeholder local; texto visible aunque Cloudinary caiga | TODO |
| T4.7 | Build + validación local | **When** `pnpm build && pnpm preview` (y push como respaldo) · **Then** flujo completo demostrable en local | TODO |

---

## Sprint 5 · Extensión a Nosotros y Proyectos

**Meta / DoD:** `page_blocks` para `nosotros.history`, `nosotros.team`, `proyectos.list`. Editables desde el panel por el director de área. `/nosotros` y `/proyectos` leen de Supabase en build-time → fallback `.data.ts` → estado vacío, **sin tocar** los `.astro` de layout (solo el data-loader). Snapshot `.fallback.json` probado.

| ID | Tarea | Given / When / Then | Estado |
|---|---|---|---|
| T5.1 | Tipos compartidos dominio ↔ `page_blocks` | **Given** `src/data/about/about.types.ts` y `projects.types.ts` · **When** se define el validador de `data` jsonb por `key` · **Then** un `data` mal formado se rechaza en el endpoint | TODO |
| T5.2 | Repo + endpoints `/administrator/api/pages/:key` | **Given** contrato · **When** GET/PUT · **Then** RLS por `area_slug`; `PUT` valida forma | TODO |
| T5.3 | UI `/administrator/paginas` | **Given** sesión · **When** el director de su área edita historia / junta / proyectos · **Then** formularios tipados; preview del estado publicado/borrador | TODO |
| T5.4 | Loaders de `/nosotros` y `/proyectos` | **Given** `CompositeContentRepository` · **When** build · **Then** usan DB→fallback→`.data.ts`→vacío; los `.astro` de página no cambian su estructura | TODO |
| T5.5 | `prebuild` snapshot | **Given** script `prebuild` · **When** corre con Supabase OK · **Then** escribe `about.fallback.json` / `projects.fallback.json`; con Supabase caído, no borra el anterior y el build pasa | TODO |
| T5.6 | Build + validación local | **When** `pnpm build && pnpm preview` (y push como respaldo) · **Then** un director de área edita y se ve en local | TODO |

---

## Sprint 6 · Pulido UX/UI

**Meta / DoD:** panel consistente con `DESIGN.md` pantalla por pantalla, estados de carga/vacío/error en todo el panel, flujo "primera vez", accesibilidad básica, `CONTEXT.md`/`PENDIENTES.md` actualizados. Checklist final para el PR a `main`.

| ID | Tarea | Given / When / Then | Estado |
|---|---|---|---|
| T6.1 | Auditoría visual contra `DESIGN.md` | **Given** cada pantalla del panel · **When** se revisa · **Then** cero color/fuente fuera de los tokens documentados | TODO |
| T6.2 | Estados carga / vacío / error | **Given** cada vista y acción · **When** la dependencia tarda, no hay datos, o falla · **Then** hay un estado explícito (no spinner infinito, no pantalla en blanco, no 500) | TODO |
| T6.3 | Flujo "primera vez" | **Given** un director que nunca usó el panel · **When** entra · **Then** entiende sin ayuda dónde subir su evento y sus fotos | TODO |
| T6.4 | Accesibilidad | **Given** login y formularios de carga · **When** se navega con teclado · **Then** foco visible (`outline-optional-3`), labels asociados, contraste AA | TODO |
| T6.5 | Documentación | **Given** el panel funcional · **When** se actualizan `CONTEXT.md` y `PENDIENTES.md` (Luma + panel ya no pendientes) + guía "cómo se administra" · **Then** coherentes entre sí | TODO |
| T6.6 | Test de build final | **When** `pnpm build` · **Then** 10 HTML públicos estáticos; funciones solo `/administrator/**`; `pnpm test` y `pnpm lint` verdes | TODO |

---

## Registro de cierres (se completa sprint a sprint)

> Columna "Validación": hoy siempre `local` (`pnpm build` + `pnpm dev`; `pnpm preview` no aplica con `@astrojs/vercel`, ver MEMORY.md L20). Cuando se conecte Vercel (ver `docs/GUIA_METODOLOGIA_ADMIN.md`), pasa a llevar la URL de preview del PR.

| Sprint | Fecha cierre | Validación (local / preview URL) | Aprobado por PO | Notas en MEMORY.md |
|---|---|---|---|---|
| 0 | 2026-09-10 | local (`pnpm dev` + `pnpm build && pnpm preview`, por el PO) + T0.3 verificado en dashboard de Supabase por el PO | ✅ Sí — Sprint 0 completo (6/6) | Ver entrada de cierre de Sprint 0 |
| 1 | 2026-09-10 | local (`pnpm dev` + `pnpm build && pnpm preview`) | Pendiente — reportado, esperando aprobación explícita del PO | Ver entrada de cierre de Sprint 1 |
| 2 | 2026-09-11 | local (`pnpm dev` — login/logout real con las 3 cuentas) + RLS verificada con Supabase real (T2.6) | ✅ Sí — Sprint 2 completo (8/8) | Ver entrada de cierre de Sprint 2 |
| 3 | 2026-09-11 | local (`pnpm dev` — CRUD real de punteros con las 3 cuentas) + `pnpm build`/`pnpm lint` limpios (167/167 tests) | ✅ Sí — Sprint 3 completo (6/6) | Ver entrada de cierre de Sprint 3 |
| 4 | — | — | — | — |
| 5 | — | — | — | — |
| 6 | — | — | — | — |
