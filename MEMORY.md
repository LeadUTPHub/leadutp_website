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

## Lecciones aprendidas

| # | Fecha | Lección | Origen |
|---|---|---|---|
| L1 | 2026-09-10 | En Astro 7 **no existe `output: 'hybrid'`**. El equivalente es `output: 'static'` + adaptador + `export const prerender = false` por ruta. La guía usa "hybrid" en sentido conceptual. | Paso 1–2 |
| L2 | 2026-09-10 | Tailwind 4 en este repo **no tiene `tailwind.config.js`**: los tokens viven en `@theme` dentro de `src/styles/global.css`. Cualquier búsqueda de "config de Tailwind" va ahí + a `pillarGradients` en `HomePillars.astro`. | Paso 1 |
| L3 | 2026-09-10 | El iframe de Google Forms en `/convocatorias` ya demostró que un embed cross-origin **siempre** se ve con fondo blanco y no hereda el tema. Se asume lo mismo para el embed de Luma → estrategia "enlace-first + iframe opcional". | Paso 2 |
| L4 | 2026-09-10 | `docs/GUIA_METODOLOGIA_ADMIN.md` contenía 12 menciones a `feature/cms-admin` en su cuerpo (flujo git, regla 10, Pasos 4–6) pese a que el PO indicó haberlo corregido. **RESUELTO (2026-09-10):** el reemplazo `feature/cms-admin` → `cms-admin` (+ la URL de preview `leadutp-git-feature-cms-admin-…` → `leadutp-git-cms-admin-…`) se aplicó directamente sobre el archivo del repo por el agente, no por reemplazo manual del PO. Verificado con grep: 0 ocurrencias de `feature/cms-admin` ni `feature-cms-admin`. | Paso 2 |
| L5 | 2026-09-10 | Los 22 eventos de `events.data.ts` son ficticios. En Sprint 1 se **vacía** el array (no se borra el archivo ni `events.utils.ts`, que lo usa `/pilares/[slug]`). | Paso 1 |

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

## Errores / correcciones

| # | Fecha | Qué pasó | Corrección |
|---|---|---|---|
| E1 | 2026-09-10 | En el Paso 1 se entregó `REQUISITOS_ADMIN.md` sin el resumen de los audios del VP (no se había pegado). | El PO lo pegó después; se incorporó en §3/§7 y se marcaron los puntos A/B como resueltos. |
| E2 | 2026-09-10 | Diseño inicial del Paso 2 modelaba una tabla `areas` propia. | P2 la reemplazó por `pillars` (slugs de los 6 pilares). Reflejado en `schema.sql` y `DOMAIN.md`. |
