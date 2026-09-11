# MEMORY.md — Retrospectiva del workstream (panel de administración LEAD UTP)

> Se actualiza al cerrar cada tarea y cada sprint (regla de `AGENTS.md`).
> Distinto de `CONTEXT.md` (estado del sitio público) y de `.sprints/BACKLOG.md` (plan).

## Estado del sistema

| Dimensión | Estado a 2026-09-10 |
|---|---|
| Rama | `cms-admin` (oficial, sin prefijo `feature/`). Nunca se commitea a `main`. |
| Paso de la metodología | Paso 5 (desarrollo sprint por sprint) en curso; **Sprints 0, 1 y 2 cerrados (6/6, 6/6+1, 8/8).** |
| Sprint en curso | **Ninguno abierto.** Sprint 2 completo: login/roles funcionando de punta a punta, confirmado por el PO en el navegador. Sprint 3 **no arranca** hasta confirmación explícita del PO. |
| Sitio público | `/eventos` ahora muestra Luma (botón siempre + iframe opcional) en vez de los 22 eventos ficticios; Home muestra un CTA simple a Luma mientras no haya `featuredEvent` local (`HomeEventsCta`, T1.7). `astro.config.mjs` con adaptador de Vercel; build genera 15 páginas HTML + **1 función** (`/administrator/**`, Sprint 2). |
| `/administrator` | **Funcional de punta a punta.** Login (usuario+contraseña) contra Supabase Auth, dashboard shell con saludo por rol, logout. Middleware protege todo excepto `/administrator/login`. Oculta (sin enlaces, fuera de sitemap, `robots.txt` con `Disallow`). MFA-ready, TOTP no exigido (D-P3). |
| Supabase | Proyecto creado por el PO, 6 env vars en `.env` (nomenclatura nueva). **`database/schema.sql` aplicado y verificado** (T0.3) — tablas y políticas RLS confirmadas por el PO en el dashboard; corroborado por el agente con lectura de solo lectura de `pillars` (6 filas). |
| Cloudinary | Cuenta creada y **verificada end-to-end** (T0.4): firma, sube y borra correctamente; confirmado además con una segunda llamada de solo lectura al Admin API. |
| Docs generados | `AGENTS.md`, `ARCHITECTURE.md`, `TECH_STACK.md`, `DOMAIN.md`, `DESIGN.md`, `database/schema.sql`, `.sprints/BACKLOG.md`, `docs/API_CONTRACTS.md`, `docs/REQUISITOS_ADMIN.md`, `docs/DISENO_TECNICO.md`. |
| Tests | 100 tests, 9 archivos — incluye `rls.integration.test.ts` (7, contra Supabase real, se saltan sin credenciales de test). Todos en verde. |
| Código Sprint 0 | `src/env.d.ts`, `src/domain/{types.ts, ports/*, purity.test.ts}`, `src/infra/{container.ts, noop/*, build-boundary.test.ts}`, `scripts/verify-cloudinary-upload.mjs`. |
| Código Sprint 1 | `src/domain/lumaLinks.ts` (+ test) · `src/components/events/EventsLuma.astro` · `src/components/home/HomeEventsCta.astro` (extra) · `Button.astro` extendido (`target`/`rel` opcionales) · `events.data.ts` vaciado · `eventos.astro` y `index.astro` reescritos en las partes de eventos. |
| Código Sprint 2 | `src/middleware.ts` (+ test) · `src/infra/supabase/{cookieHeader,mapUserToProfile,createCookieAdapter,SupabaseAuthGateway}.ts` (+ tests) · `src/infra/supabase/rls.integration.test.ts` · `src/pages/administrator/{login,index,logout}.astro` · `src/components/admin/{Field,AdminShell}.astro` · `src/layouts/AdminLayout.astro` · `src/infra/admin-route-hidden.test.ts` · `database/patches/001-fix-hook-security-definer.sql`. |
| Vercel | Validación de cada sprint sigue siendo 100% local en `cms-admin` (`pnpm build && pnpm preview` + `pnpm dev`); no hay preview de PR (ver D-P7). **Aparte de eso**, `main` sí se despliega de verdad en `leadutp.vercel.app` — el PO mergeó `cms-admin`→`main` (PR #8) y `feature/pruebas`→`main` (PR #9) directamente en GitHub, antes de lo previsto por el Paso 6, para que la comunidad vaya viendo la página. No existe un ambiente de staging separado: "no tengo vercel, todo es real" (PO). Ver D-08. |

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
| L13 | 2026-09-11 | `astro:middleware` (el helper `defineMiddleware`) es un módulo virtual que solo resuelve el plugin de Vite de Astro — Vitest en aislamiento no puede importarlo. `onRequest` se exporta como función `async` normal, tipada con `APIContext`/`MiddlewareNext` de `astro` (import de tipos, sí resuelve), sin el wrapper. Es puramente un helper de tipos; el runtime de Astro no lo exige. | Sprint 2, T2.1/T2.3 |
| L14 | 2026-09-11 | Crear `src/middleware.ts` (o cualquier archivo de convención especial de Astro) **con el dev server ya corriendo no lo registra en caliente** — dio 404 en `/administrator` hasta reiniciar (`astro dev stop` + `astro dev --background`). Después de eso, funcionó. Revisar esto primero ante un 404 inesperado en una ruta que debería estar protegida. | Sprint 2, T2.3 |
| L15 | 2026-09-11 | En Windows sin **Developer Mode** activado, `pnpm build` con el adaptador de Vercel falla con `EPERM: symlink` al empaquetar la primera función serverless real (necesita symlinkear `sharp` como dependencia nativa; pnpm evita esto con junctions, pero `@vercel/nft` usa symlinks de archivo, que exigen el privilegio `SeCreateSymbolicLinkPrivilege`). No es un bug del código — en Vercel (Linux) no pasa. Fix: activar Developer Mode (Configuración → Privacidad y seguridad → Para desarrolladores) o correr el build como Administrador. Confirmado que persiste incluso sin usar `<Image>` de `astro:assets` en la página nueva — Astro registra el endpoint `/_image` en cuanto hay adaptador, sin importar si esa página SSR específica usa `<Image>`. **RESUELTO (2026-09-11):** el PO activó Developer Mode; `pnpm build` corre limpio en terminal normal, sin admin. | Sprint 2, T2.4 (primer build con una ruta server-rendered real) |
| L16 | 2026-09-11 | `@astrojs/vercel` sin `functionPerRoute` empaqueta **todas** las rutas `prerender=false` en una sola función (`_render.func`), no una por ruta. `EXPECTED_FUNCTION_COUNT` en `build-boundary.test.ts` es 1 aunque `/administrator`, `/administrator/login` y `/administrator/logout` sean 3 páginas distintas — hay que tenerlo en cuenta si en algún sprint se activa `functionPerRoute` (el número esperado subiría). | Sprint 2, T2.8 |
| L17 | 2026-09-11 | **Bug:** `loading="lazy"` en un `<iframe>` dentro de un contenedor `hidden` (`EventsLuma.astro`) nunca dispara `load` ni `error` — el navegador no puede calcular "cerca del viewport" para un elemento sin layout (`display:none` vía `hidden`), así que la carga lazy nunca arranca. Síntoma exacto: cero peticiones de red, cero errores de consola, atascado en "Cargando…" para siempre — parecía un bug del timeout/listener, pero el candado era la combinación `hidden` + `loading="lazy"` sobre el mismo elemento. Regla general: si el JS propio decide cuándo revelar un elemento tras su `load`, **no** le sumes `loading="lazy"` encima — son dos mecanismos de "cuándo cargar/mostrar" que se pisan. | Sprint 2 (post-Sprint 1), bug en `EventsLuma.astro` |
| L18 | 2026-09-11 | **Bug:** `custom_access_token_hook` (Sprint 0) se escribió sin `SECURITY DEFINER`. Mientras el hook no estaba registrado en Authentication → Hooks no se notaba (la función simplemente no corría). Al activarlo, el login empezó a fallar con "Error running hook... permission denied for table profiles": el hook lo ejecuta el rol `supabase_auth_admin`, que no tiene grant sobre `profiles`, y en pleno login todavía no hay `auth.uid()` válido para que la RLS deje pasar la lectura igual. **Regla general para Auth Hooks de Supabase que leen tablas con RLS:** casi siempre necesitan `SECURITY DEFINER` — si no, dependen de que el rol interno de Auth tenga acceso, cosa que no tiene por defecto ni debería tener. Fix en `database/patches/001-fix-hook-security-definer.sql`, ya incorporado a `database/schema.sql` para proyectos nuevos. **Nota de diagnóstico:** `data.user.app_metadata` del response de `signInWithPassword` es el `raw_app_meta_data` crudo de `auth.users`, no las claims que el hook inyecta — para ver esas hay que decodificar el JWT (`data.session.access_token`, payload en base64url) manualmente. | Sprint 2, T2.6 |
| L19 | 2026-09-11 | **Bug (mío, T2.2):** `SupabaseAuthGateway.buildSession()` armaba el `Profile` a partir de `data.user` (de `signInWithPassword()`/`getUser()`) — el mismo error de L18: ese `user.app_metadata` es el crudo de `auth.users`, sin las claims del hook, así que `mapUserToProfile()` siempre devolvía `null` → `signInWithPassword()` tiraba "Este usuario no tiene un perfil asignado" → `login.astro` lo mostraba como el genérico "Usuario o contraseña incorrectos" (regla de no filtrar detalle, D2), ocultando que la causa real no tenía nada que ver con la contraseña. El test de integración de RLS (T2.6) no lo detectó porque usa `createClient` + queries directas, nunca pasa por `SupabaseAuthGateway`. **Fix:** usar `supabase.auth.getClaims()` en vez de `getUser()`/`data.user` — es la API pensada para esto (la propia doc de auth-js dice "the returned claims can be customized... using the Custom Access Token Hook"), y de paso ya trae el `aal` directo, así que se pudo borrar `readAssuranceLevel()`/`getAuthenticatorAssuranceLevel()` por completo. **Regla general:** con un Auth Hook activo, siempre leer claims con `getClaims()`, nunca con `user.app_metadata` de `getUser()`/`signInWithPassword()`/`signUp()`. | Sprint 2, T2.8 (diagnóstico pedido por el PO: login manual fallaba con las mismas credenciales que sí funcionaban en T2.6) |

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
| D-07 | 2026-09-11 | Leer rol/área/AAL siempre con `supabase.auth.getClaims()`, nunca con `data.user.app_metadata` de `getUser()`/`signInWithPassword()`. Es la API que Supabase documenta como compatible con Auth Hooks personalizados, valida el JWT (JWKS o red) y de paso trae el `aal` sin llamada aparte. | Fix de L19. Se deja como regla explícita para que ningún código futuro (Sprint 3+) repita el error de leer `user.app_metadata` pensando que trae las claims del hook. |
| D-08 | 2026-09-11 | El merge de `cms-admin` → `main` (PR #8) y de `feature/pruebas` → `main` (PR #9, renombra `public/imagestest/` a `public/images/`) fueron **intencionales**, hechos directamente por el PO en GitHub, **antes** de lo que marca el Paso 6 de la metodología (que espera al cierre de todos los sprints). No hay ambiente de staging separado en Vercel: el PO confirmó "no tengo vercel, todo es real" — lo que está desplegado en `leadutp.vercel.app` es el único ambiente real, sin red de seguridad de un preview intermedio. `cms-admin` se sincronizó trayendo esos 2 commits desde `main` (ver sección de restauración de `CONTEXT.md`/`PENDIENTES.md` más abajo). El trabajo continúa en `cms-admin`; Sprint 3 sigue sin abrir hasta aprobación explícita del PO. | Decisión del PO: "para que puedan ir viendo la pagina" (mostrar avance real a la comunidad/junta antes del merge final formal). Aclarado explícitamente para que el estado de `Vercel` en la tabla de arriba y el D-P7 no se lean como contradictorios con el hecho de que `main` ya tiene código de `cms-admin` en producción. |

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

### Sprint 2 · Autenticación y roles — cierre 2026-09-11

**Qué se construyó:**

| Área | Detalle |
|---|---|
| Middleware (T2.1/T2.3) | `src/middleware.ts`: guard sobre `/administrator/**` excepto `/administrator/login`; sin sesión → `context.rewrite()` (200, no redirect); con sesión → `Astro.locals.profile`. Rojo→Verde con `middleware.test.ts` (mockea el `AuthGateway`, no toca Supabase). |
| Adaptador de Auth (T2.2) | `src/infra/supabase/{cookieHeader, mapUserToProfile, createCookieAdapter, SupabaseAuthGateway}.ts` — piezas puras con TDD completo; `container.ts` expone `getAuthGatewayForRequest(context)`. `NoopAuthGateway` eliminado (superado). |
| Panel (T2.4/T2.5) | `/administrator/login.astro` (form usuario+contraseña, error genérico) · `/administrator/index.astro` (dashboard shell, saludo por rol) · `/administrator/logout.astro` (solo POST) · `AdminShell.astro`/`Field.astro`/`AdminLayout.astro` (DESIGN.md §5-6, sin Navbar/Footer públicos). |
| RLS real (T2.6) | `src/infra/supabase/rls.integration.test.ts` — 7/7 verde contra Supabase real, las 6 fronteras de la matriz de `DOMAIN.md` + creación por director. Limpia sus filas de prueba solo. |
| Ruta oculta (T2.7) | `robots.txt` con `Disallow: /administrator` (faltaba) + `src/infra/admin-route-hidden.test.ts` (automatiza sitemap/robots/sin-enlaces). |
| Build (T2.8) | `astro.config.mjs` ya tenía el adaptador (Sprint 0); primera vez con una ruta real `prerender=false` → 1 función (`_render.func`, agrupa las 3 rutas de `/administrator`). `build-boundary.test.ts` actualizado a `EXPECTED_FUNCTION_COUNT = 1`. |

**2 bugs reales encontrados y corregidos en el camino (no en el código feliz, en la integración real):**

1. **L18** — `custom_access_token_hook` (Sprint 0) sin `SECURITY DEFINER`: al activar el hook, el login se rompía con "permission denied for table profiles". Fix: `database/patches/001-fix-hook-security-definer.sql`.
2. **L19** — `SupabaseAuthGateway` leía `data.user.app_metadata` (de `getUser()`/`signInWithPassword()`) en vez de `getClaims()`: el perfil nunca se armaba, y el login manual fallaba con "usuario o contraseña incorrectos" aunque las credenciales fueran correctas (el test de RLS no lo detectó porque no pasa por esta clase). Fix + regla general en D-07.

Ambos bugs se encontraron **porque el PO insistió en probar el flujo real** (RLS con Supabase de verdad, login manual en el navegador) en vez de conformarse con los tests unitarios/mockeados — ninguno de los dos se hubiera visto solo con `pnpm test`.

**Verificación final:** `tsc --noEmit` 0 errores · `pnpm test` 100/100 (incluye las 7 de RLS contra Supabase real) · `pnpm lint` limpio · `pnpm build` 15 páginas públicas + 1 función · **login y logout confirmados por el PO en el navegador con los 3 usuarios reales**.

**Sprint 2: ✅ DONE, 8/8.** Commits: `2938fe7` (feat, con la versión con bug de `SupabaseAuthGateway` para reflejar la historia real) → `22a6679` (fix) → cierre de docs (este commit). Sprint 3 no arranca sin confirmación explícita del PO.

## Errores / correcciones

| # | Fecha | Qué pasó | Corrección |
|---|---|---|---|
| E1 | 2026-09-10 | En el Paso 1 se entregó `REQUISITOS_ADMIN.md` sin el resumen de los audios del VP (no se había pegado). | El PO lo pegó después; se incorporó en §3/§7 y se marcaron los puntos A/B como resueltos. |
| E2 | 2026-09-10 | Diseño inicial del Paso 2 modelaba una tabla `areas` propia. | P2 la reemplazó por `pillars` (slugs de los 6 pilares). Reflejado en `schema.sql` y `DOMAIN.md`. |
