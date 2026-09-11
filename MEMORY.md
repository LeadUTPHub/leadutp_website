# MEMORY.md — Retrospectiva del workstream (panel de administración LEAD UTP)

> Se actualiza al cerrar cada tarea y cada sprint (regla de `AGENTS.md`).
> Distinto de `CONTEXT.md` (estado del sitio público) y de `.sprints/BACKLOG.md` (plan).

## Estado del sistema

| Dimensión | Estado a 2026-09-10 |
|---|---|
| Rama | `cms-admin` (oficial, sin prefijo `feature/`). Nunca se commitea a `main`. |
| Paso de la metodología | Paso 5 (desarrollo sprint por sprint) en curso; **Sprint 0 (6/6) y Sprint 1 (6/6 + 1 extra) cerrados por el agente**, reportados, esperando aprobación explícita del PO. |
| Sprint en curso | **Ninguno abierto.** Sprint 1 completo (piloto: Eventos + embed Luma). Sprint 2 **no arranca** hasta confirmación explícita del PO. |
| Sitio público | `/eventos` ahora muestra Luma (botón siempre + iframe opcional) en vez de los 22 eventos ficticios; Home muestra un CTA simple a Luma mientras no haya `featuredEvent` local (`HomeEventsCta`, T1.7). `astro.config.mjs` con adaptador de Vercel; build sigue generando 15 páginas HTML, 0 funciones. |
| Supabase | Proyecto creado por el PO, 6 env vars en `.env` (nomenclatura nueva). **`database/schema.sql` aplicado y verificado** (T0.3) — tablas y políticas RLS confirmadas por el PO en el dashboard; corroborado por el agente con lectura de solo lectura de `pillars` (6 filas). |
| Cloudinary | Cuenta creada y **verificada end-to-end** (T0.4): firma, sube y borra correctamente; confirmado además con una segunda llamada de solo lectura al Admin API. |
| Docs generados | `AGENTS.md`, `ARCHITECTURE.md`, `TECH_STACK.md`, `DOMAIN.md`, `DESIGN.md`, `database/schema.sql`, `.sprints/BACKLOG.md`, `docs/API_CONTRACTS.md`, `docs/REQUISITOS_ADMIN.md`, `docs/DISENO_TECNICO.md`. |
| Tests | 33 tests, 4 archivos: `events.utils.test.ts` (22) + `src/domain/purity.test.ts` (5, ahora cubre también `lumaLinks.ts`) + `src/domain/lumaLinks.test.ts` (3) + `src/infra/build-boundary.test.ts` (2). Todos en verde. |
| Código Sprint 0 | `src/env.d.ts`, `src/domain/{types.ts, ports/*, purity.test.ts}`, `src/infra/{container.ts, noop/*, build-boundary.test.ts}`, `scripts/verify-cloudinary-upload.mjs`. |
| Código Sprint 1 | `src/domain/lumaLinks.ts` (+ test) · `src/components/events/EventsLuma.astro` · `src/components/home/HomeEventsCta.astro` (extra) · `Button.astro` extendido (`target`/`rel` opcionales) · `events.data.ts` vaciado · `eventos.astro` y `index.astro` reescritos en las partes de eventos. |
| Vercel | **No conectado todavía.** Validación de cada sprint es 100% local (`pnpm build && pnpm preview` + `pnpm dev`). `git push origin cms-admin` es solo respaldo remoto, no genera preview. Se conecta más adelante, antes del merge final (ver D-P7). |

## Lecciones aprendidas

| # | Fecha | Lección | Origen |
|---|---|---|---|
| L1 | 2026-09-10 | En Astro 7 **no existe `output: 'hybrid'`**. El equivalente es `output: 'static'` + adaptador + `export const prerender = false` por ruta. La guía usa "hybrid" en sentido conceptual. | Paso 1–2 |
| L2 | 2026-09-10 | Tailwind 4 en este repo **no tiene `tailwind.config.js`**: los tokens viven en `@theme` dentro de `src/styles/global.css`. Cualquier búsqueda de "config de Tailwind" va ahí + a `pillarGradients` en `HomePillars.astro`. | Paso 1 |
| L3 | 2026-09-10 | El iframe de Google Forms en `/convocatorias` ya demostró que un embed cross-origin **siempre** se ve con fondo blanco y no hereda el tema. Se asume lo mismo para el embed de Luma → estrategia "enlace-first + iframe opcional". | Paso 2 |
| L4 | 2026-09-10 | `docs/GUIA_METODOLOGIA_ADMIN.md` contenía 12 menciones a `feature/cms-admin` en su cuerpo (flujo git, regla 10, Pasos 4–6) pese a que el PO indicó haberlo corregido. **RESUELTO (2026-09-10):** el reemplazo `feature/cms-admin` → `cms-admin` (+ la URL de preview `leadutp-git-feature-cms-admin-…` → `leadutp-git-cms-admin-…`) se aplicó directamente sobre el archivo del repo por el agente, no por reemplazo manual del PO. Verificado con grep: 0 ocurrencias de `feature/cms-admin` ni `feature-cms-admin`. | Paso 2 |
| L5 | 2026-09-10 | Los 22 eventos de `events.data.ts` son ficticios. En Sprint 1 se **vacía** el array (no se borra el archivo ni `events.utils.ts`, que lo usa `/pilares/[slug]`). | Paso 1 |
| L6 | 2026-09-10 | El repo **todavía no está conectado a Vercel** (más allá del deploy ya existente del sitio público desde `main`) — `git push origin cms-admin` hoy es solo respaldo en GitHub, no genera preview. Todo texto que asumía "validar en preview de Vercel" como gate de cada sprint (`AGENTS.md`, `.sprints/BACKLOG.md`) se corrigió a "validar en local" (`pnpm build && pnpm preview` + `pnpm dev`). Ver D-P7. | Corrección del PO tras el Paso 3 |
| L7 | 2026-09-10 | Este repo **no tiene `argsIgnorePattern: '^_'`** configurado en `@typescript-eslint/no-unused-vars` — prefijar un parámetro no usado con `_` (convención común en otros proyectos) sigue marcando error aquí. Patrón adoptado: referenciar el parámetro con `void nombre;` dentro del cuerpo de la función (ver `src/infra/noop/*.ts`). | Sprint 0, T0.5 (`pnpm lint`) |
| L8 | 2026-09-10 | Agregar `adapter: vercel()` crea `.vercel/output/` como nuevo artefacto de build (en paralelo a `dist/`). Hay que ignorarlo en **dos lugares independientes**: `.gitignore` (para no commitearlo) **y** `eslint.config.mjs` → `ignores` (si no, ESLint lintea el JS minificado de `.vercel/output/static/_astro/*.js` y produce decenas de falsos positivos `no-unused-expressions`). `dist/` ya estaba cubierto en ambos; `.vercel/` no lo estaba en ninguno hasta Sprint 0. | Sprint 0, T0.1/T0.5 |
| L9 | 2026-09-10 | Sin Supabase CLI instalado, el agente **no puede aplicar `database/schema.sql`** de forma autónoma — requiere pegarlo en el SQL Editor del dashboard de Supabase (acción del PO) o instalar y enlazar el CLI. Se trató como acción externa que requiere confirmación explícita, igual que la subida de prueba a Cloudinary (T0.4). | Sprint 0, T0.3 |
| L10 | 2026-09-10 | La viabilidad de un iframe cross-origin **se puede verificar sin acceso al dashboard**: `curl -I` a la URL y revisar `X-Frame-Options`/`Content-Security-Policy: frame-ancestors` (y opcionalmente buscar JS anti-framing tipo `self !== top` en el HTML). Así se confirmó que `luma.com/leadutp_` bloquea el framing pero `luma.com/embed/calendar/<slug>/events` no — y que ese path de embed funciona **directo con el slug público**, sin necesitar el `cal-id` privado que se asumía en el Paso 2. | Sprint 1, T1.2 |
| L11 | 2026-09-10 | `Button.astro` no tenía forma de abrir en pestaña nueva. Se extendió con `target`/`rel` **opcionales, sin default más que `undefined`** — Astro omite un atributo `undefined` al renderizar, así que las 10 invocaciones preexistentes (7 archivos) quedan byte-idénticas. Patrón a seguir: extender un componente `ui/` con props opcionales antes que crear una variante nueva o un `<a>` suelto. | Sprint 1, T1.2 |
| L12 | 2026-09-10 | Vaciar `events.data.ts` tiene un efecto en cascada ya contemplado por el propio código: `index.astro` (Home) también lee `events` para su sección `HomeEvents`, y ya estaba guardada con `{featuredEvent && ...}` — se omite sola, sin romper nada. Al detectarlo se le avisó al PO antes de decidir qué hacer (ver D-05). | Sprint 1, T1.4 |

## Decisiones tomadas (con su porqué)

| # | Fecha | Decisión | Porqué |
|---|---|---|---|
| D-P1 | 2026-09-10 | RLS: `super_admin` = todo · `director` = toda su área · `subdirector` = solo `owner_id = él`. | Regla de negocio del VP ("cada rol edita solo lo suyo"); aprobada por el PO. |
| D-P2 | 2026-09-10 | "Áreas" = los 6 pilares, **usando sus mismos slugs**. Se elimina una tabla `areas` separada; `pillars` es la referencia sembrada (`source='static'`). | El PO confirmó el mapeo 1:1. Evita inventar nombres. |
| D-P3 | 2026-09-10 | 2FA (TOTP) **diferido a post-piloto**; Sprint 2 queda "MFA-ready" (middleware lee AAL, no lo exige). | Equipo pequeño y no-dev; dato de bajo riesgo; el objetivo es adopción. Activarlo luego cuesta poco. |
| D-P4 | 2026-09-10 | `/eventos`: botón a Luma siempre visible + iframe opcional con timeout 8s/onerror. | Ver L3. Evita acoplar una sección de alto tráfico a que Luma cargue. |
| D-P5 | 2026-09-10 | Calendario de Luma verificado: `https://luma.com/leadutp_` (público, activo). El iframe usa el snippet de embed del panel de Luma (`cal-id`), no la URL de vanidad. Sin snippet → solo botón. | Verificación propia + docs de Luma (Calendar → Settings → Embed). |
| D-P6 | 2026-09-10 | Dominio propio `leadutp.org` → **después** del merge del panel. Fuera de alcance. | Decisión del PO. El panel funciona igual en `*.vercel.app`. |
| D-01 | 2026-09-10 | Subida a Cloudinary con **firma en endpoint propio** (no unsigned preset, no proxy). Sin SDK `cloudinary`. | Secreto server-side; no proxear MB por función serverless; firma = ~10 líneas con `crypto`. |
| D-02 | 2026-09-10 | Degradación por **snapshot `*.fallback.json`** versionado + cadena Supabase→JSON→`.data.ts`→estado vacío en build. | `pnpm build` nunca puede romper por Supabase caído; el deploy anterior sigue vivo. |
| D-03 | 2026-09-10 | Claims de rol/área en el JWT vía **Auth Hook** (`custom_access_token_hook`) para que RLS no haga subconsultas por fila. | Rendimiento de las políticas. |
| D-04 | 2026-09-10 | Nomenclatura de env vars de Supabase actualizada a las **API keys nuevas**: `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (reemplaza `PUBLIC_SUPABASE_ANON_KEY`) y `SUPABASE_SECRET_KEY` (reemplaza `SUPABASE_SERVICE_ROLE_KEY`) en `TECH_STACK.md`, `docs/DISENO_TECNICO.md`, `docs/API_CONTRACTS.md`, `ARCHITECTURE.md`. Sin cambio de comportamiento (mismo privilegio, misma RLS) ni de versión mínima de `@supabase/supabase-js` (cualquier ^2 las acepta, son strings opacos a `createClient`). | Supabase migró su sistema de keys; los proyectos creados después de noviembre de 2025 (el nuestro) ya no exponen `anon`/`service_role`. Nota: `docs/GUIA_METODOLOGIA_ADMIN.md` (línea del Paso 4.1, escrita por el PO) todavía dice `SUPABASE_ANON_KEY` — señalado, no editado (fuera del alcance de "donde el agente lo mencionó"). Los roles de Postgres `anon`/`authenticated` usados en `database/schema.sql` y en las políticas RLS **no cambian de nombre** — son un concepto distinto de las API keys. |
| D-P7 | 2026-09-10 | La validación de DoD de cada sprint es **100% local** hasta que el PO conecte Vercel (`pnpm dev` para el PO; `pnpm build && pnpm preview` corrido y reportado por el agente al cerrar cada sprint). `git push origin cms-admin` sigue siendo obligatorio, pero solo como respaldo remoto. Cuando Vercel se conecte, este mismo rol se traslada a la preview URL del PR. | El proyecto aún no está conectado a Vercel; se trabaja primero 100% en local, Vercel se conecta más adelante, antes del merge final. Decisión del PO, aplicada en `docs/GUIA_METODOLOGIA_ADMIN.md`, `AGENTS.md` y `.sprints/BACKLOG.md`. |
| D-05 | 2026-09-10 | `HomeEventsCta.astro`: CTA simple (texto corto + `Button` a Luma, reutilizando `buildLumaLinks()`) reemplaza a `HomeEvents` en la Home mientras no exista un `featuredEvent` local. Deliberadamente **sin listar eventos individuales** — eso es exactamente el trabajo de Sprint 3. | El PO va a mostrar la rama `cms-admin` a la junta directiva pronto y ya hay eventos reales en Luma; prefirió no dejar la Home con un hueco silencioso durante esa ventana. Tarea extra dentro de Sprint 1 (T1.7), no alcance nuevo — el swap a `HomeEvents` real en Sprint 3 es trivial (un solo `if/else` en `index.astro`). |
| D-06 | 2026-09-10 | **Reintroducción temporal y explícitamente marcada** de 1 evento ficticio ("Study Abroad Fest 2026") en `events.data.ts`, con `FeaturedEvent`/`UpcomingEventList` restaurados en `/eventos` — `EventsLuma` queda como **complemento** ("nuestro calendario completo vive en Luma"), no como reemplazo. `registrationUrl` apunta al calendario general de Luma, no a una URL de evento inventada. **Revertido el mismo día** (2026-09-10), tras la demo: `events.data.ts` vacío de nuevo, `/eventos.astro` de vuelta a la versión de cierre de Sprint 1 (solo `EventsLuma`). Nada de esto llegó a commitearse en ningún momento. | Demo puntual a la junta directiva; el formato de tarjeta pre-Sprint-1 comunica mejor en esa reunión que el embed de Luma solo. Cambio de alcance puntual del PO, no reabrió Sprint 1. |

## Retrospectiva de sprints

### Sprint 0 · Infraestructura base — cierre 2026-09-10

**Qué se construyó:**

| Área | Detalle |
|---|---|
| Adaptador de servidor (T0.1) | `astro.config.mjs`: `output: 'static'` explícito + `adapter: vercel()` + `sitemap({ filter: page => !page.includes('/administrator') })`. Sin ningún `prerender = false` todavía (no hay rutas `/administrator/**`). |
| Env vars tipadas (T0.2) | `src/env.d.ts` con las 6 vars de Supabase/Cloudinary (nomenclatura nueva) + 2 de Luma (opcional). |
| Esqueleto hexagonal (T0.5) | `src/domain/types.ts` (Role, AreaSlug, ContentSource, Profile, OwnedResource) + 3 puertos (`ContentRepository`, `PhotoStorage`, `AuthGateway`) + `src/infra/container.ts` (composition root) + 3 adaptadores no-op. |
| Tests nuevos | `src/domain/purity.test.ts` (Rojo→Verde: garantiza que `src/domain/**` no importa Astro/Supabase/Cloudinary/otras capas) + `src/infra/build-boundary.test.ts` (verifica 15 HTML públicos / 0 funciones serverless, se salta sin build previo). |
| Script de verificación (T0.4) | `scripts/verify-cloudinary-upload.mjs` — manual, no en CI. |

**Verificación de Cloudinary (T0.4) — resultado:**
```
✓ Subida OK: lead-utp/_test/htktah0uias9odayconu
✓ Borrado OK. Cloudinary configurado correctamente.
```
Verificado además con una **segunda llamada independiente**, de solo lectura, al Admin API (`GET /resources/image?prefix=lead-utp/_test` → `{ "resources": [] }`) — no se confió únicamente en el "Borrado OK" del propio script. Sin huérfanos.

**Decisiones/hallazgos nuevos de este sprint:** ver L7 (patrón `void nombre;` en vez de `_prefijo` para parámetros no usados), L8 (`.vercel/` debe ignorarse en `.gitignore` **y** `eslint.config.mjs`), L9 (aplicar `schema.sql` requiere acción manual del PO, sin CLI instalado).

**Estado de cierre — primera pasada (registrado, luego corregido):** el PO aprobó Sprint 0 dando por válida la parte de código (T0.1, T0.2, T0.4, T0.5, T0.6 — las 5 verificadas por el agente con tests/build en verde y validadas en local con `pnpm dev` + `pnpm build && pnpm preview`). Al preguntarle explícitamente por **T0.3** (aplicar `schema.sql` + registrar el Auth Hook), el PO confirmó en ese momento que **todavía no lo había hecho**. Sprint 0 se marcó **🟡 5/6** y se commiteó así (`412f3e9`).

**T0.3 — cierre real (2026-09-10, mismo día):** el PO corrió `database/schema.sql` completo en el SQL Editor de Supabase, sin errores ni warnings, y verificó dos cosas **a mano en el dashboard**:
1. **Table Editor** — las 6 tablas esperadas existen: `profiles`, `pillars`, `luma_event_pointers`, `event_galleries`, `gallery_photos`, `page_blocks`.
2. **Authentication → Policies** — las políticas RLS se crearon correctamente.

Esta verificación **es manual, del PO, en el dashboard de Supabase — no por código ni por test automatizado del agente** (a diferencia de T0.1/T0.2/T0.4/T0.5/T0.6, que sí tienen test o build en verde como evidencia). Queda documentado así explícitamente porque este tipo de tarea (aplicar DDL en un proyecto Supabase real, sin CLI instalado) se valida de forma distinta al resto del sprint: es responsabilidad exclusiva del PO, el agente no tiene medio para ejecutarla ni para inspeccionar el dashboard directamente.

El agente sí pudo dar una **corroboración independiente de solo lectura** después de la confirmación del PO: `GET /rest/v1/pillars?select=slug,name` con `PUBLIC_SUPABASE_PUBLISHABLE_KEY` → HTTP 200, las 6 filas sembradas (`desarrollo-profesional`, `liderazgo`, `excelencia-femenina`, `desarrollo-del-capitulo`, `excelencia-academica`, `lead-academia`). Esto confirma que el schema y al menos la política "pillars: world readable" quedaron activos — no reemplaza la verificación del PO sobre las políticas de las demás tablas (esas no son legibles por `anon`, así que no hay forma de corroborarlas sin credenciales de más privilegio; eso es justamente lo que valida Sprint 2, T2.6).

**Sprint 0: ✅ DONE, 6/6.** Sprint 1 sigue sin arrancar — requiere confirmación explícita del PO.

### Sprint 1 · Eventos + embed Luma (piloto) — cierre 2026-09-10

**Qué se construyó:**

| Área | Detalle |
|---|---|
| Verificación de Luma (previa a implementar) | `curl -I` a `luma.com/leadutp_` (bloquea framing) y a `luma.com/embed/calendar/leadutp_/events` (no bloquea, sin CSP frame-ancestors, sin JS anti-framing, contenido confirmado). Ver L10. |
| Dominio (T1.1) | `src/domain/lumaLinks.ts` + `buildLumaLinks()`, Rojo→Verde con `lumaLinks.test.ts` (3 tests). |
| Componente (T1.2/T1.3) | `src/components/events/EventsLuma.astro`: botón siempre visible (Button primary/lg) + `<events-luma-embed>` (custom element) con fallback timeout 8s + `load`/`error`. `Button.astro` extendido con `target`/`rel` opcionales (L11). |
| `/eventos` (T1.4/T1.5) | `events.data.ts` vaciado (22 eventos ficticios fuera, comentario explicando por qué). Sección "Próximos" = `EventsLuma`; "Pasados" = estado vacío curado con link real a `/vida-lead`. |
| Extra aprobado por el PO (T1.7) | `src/components/home/HomeEventsCta.astro`: CTA simple en la Home mientras no haya `featuredEvent` local (ver D-05 y L12). Reutiliza `buildLumaLinks()`, sin listar eventos. |

**Verificación:** `astro check` 0 errores (86 archivos) · `pnpm test` 33/33 · `pnpm lint` limpio · `pnpm build` 15 páginas / 0 funciones (`build-boundary.test.ts` contra build fresco) · HTML del build inspeccionado a mano: botón apunta a `https://luma.com/leadutp_`, 0 iframes sin `PUBLIC_LUMA_EMBED_URL` configurada.

**Recomendación pendiente de aplicar por el PO:** agregar `PUBLIC_LUMA_EMBED_URL=https://luma.com/embed/calendar/leadutp_/events` al `.env` para activar el iframe (opcional — sin ella, el sitio funciona igual solo con el botón).

**Verificación visual:** no se pudo tomar una captura real (el PO declinó instalar la extensión de Chrome en esta sesión y no hay `chromium-cli`/Playwright configurado). Se verificó por HTML servido por el propio `pnpm dev` del PO — clases idénticas a las de componentes `Button`/`Container` ya probados visualmente en producción. **El PO revisó `pnpm dev` directamente antes de aprobar el cierre.**

**Efecto en cascada encontrado y resuelto:** vaciar `events.data.ts` apagaba silenciosamente la sección de eventos de la Home (código preexistente, `{featuredEvent && ...}`). Se le avisó al PO antes de decidir — eligió agregar el CTA (D-05, T1.7) en vez de dejarlo así, por una demo próxima a la junta directiva.

**Sprint 1: ✅ DONE, 6/6 + 1 extra (T1.7).** Reportado, esperando aprobación explícita del PO antes de cualquier commit. Sprint 2 no arranca sin esa confirmación.

## Errores / correcciones

| # | Fecha | Qué pasó | Corrección |
|---|---|---|---|
| E1 | 2026-09-10 | En el Paso 1 se entregó `REQUISITOS_ADMIN.md` sin el resumen de los audios del VP (no se había pegado). | El PO lo pegó después; se incorporó en §3/§7 y se marcaron los puntos A/B como resueltos. |
| E2 | 2026-09-10 | Diseño inicial del Paso 2 modelaba una tabla `areas` propia. | P2 la reemplazó por `pillars` (slugs de los 6 pilares). Reflejado en `schema.sql` y `DOMAIN.md`. |
