# MEMORY.md — Retrospectiva del workstream (panel de administración LEAD UTP)

> Se actualiza al cerrar cada tarea y cada sprint (regla de `AGENTS.md`).
> Distinto de `CONTEXT.md` (estado del sitio público) y de `.sprints/BACKLOG.md` (plan).

## Estado del sistema

| Dimensión | Estado a 2026-09-10 |
|---|---|
| Rama | `cms-admin` (oficial, sin prefijo `feature/`). Nunca se commitea a `main`. |
| Paso de la metodología | Paso 3 (scaffolding SDD) **entregado**, esperando aprobación del PO. |
| Sprint en curso | Ninguno. Sprint 0 = `TODO`. |
| Sitio público | Intacto. `astro.config.mjs` aún sin adaptador (cambia en T0.1). |
| Supabase | Proyecto no creado todavía (T0.3). `database/schema.sql` listo para aplicar. |
| Cloudinary | Cuenta no creada todavía (T0.4). |
| Docs generados | `AGENTS.md`, `ARCHITECTURE.md`, `TECH_STACK.md`, `DOMAIN.md`, `DESIGN.md`, `database/schema.sql`, `.sprints/BACKLOG.md`, `docs/API_CONTRACTS.md`, `docs/REQUISITOS_ADMIN.md`, `docs/DISENO_TECNICO.md`. |
| Tests | Solo el preexistente (`events.utils.test.ts`). Sin tests nuevos aún (empiezan en Sprint 0). |
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

## Errores / correcciones

| # | Fecha | Qué pasó | Corrección |
|---|---|---|---|
| E1 | 2026-09-10 | En el Paso 1 se entregó `REQUISITOS_ADMIN.md` sin el resumen de los audios del VP (no se había pegado). | El PO lo pegó después; se incorporó en §3/§7 y se marcaron los puntos A/B como resueltos. |
| E2 | 2026-09-10 | Diseño inicial del Paso 2 modelaba una tabla `areas` propia. | P2 la reemplazó por `pillars` (slugs de los 6 pilares). Reflejado en `schema.sql` y `DOMAIN.md`. |
