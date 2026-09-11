# AGENTS.md — Reglas operativas del Development Team (panel de administración LEAD UTP)

> Este archivo gobierna cómo se trabaja el workstream del **panel de administración + integración Luma**.
> No sustituye a `CONTEXT.md` / `PENDIENTES.md` (estado del sitio público), sino que se apoya en ellos.
> Documentos hermanos: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`TECH_STACK.md`](./TECH_STACK.md) · [`DOMAIN.md`](./DOMAIN.md) · [`DESIGN.md`](./DESIGN.md) · [`docs/REQUISITOS_ADMIN.md`](./docs/REQUISITOS_ADMIN.md) · [`docs/DISENO_TECNICO.md`](./docs/DISENO_TECNICO.md) · [`docs/API_CONTRACTS.md`](./docs/API_CONTRACTS.md) · [`docs/GUIA_METODOLOGIA_ADMIN.md`](./docs/GUIA_METODOLOGIA_ADMIN.md) · [`.sprints/BACKLOG.md`](./.sprints/BACKLOG.md)

## Marco

Intersección estricta de tres marcos:

| Marco | Qué impone aquí |
|---|---|
| **Spec-Driven Development (SDD)** | Ningún código sin un SPEC (tarea del backlog con Given-When-Then) que lo contrate. |
| **Arquitectura Limpia + Hexagonal** | Dominio puro; dependencias hacia adentro (ver `ARCHITECTURE.md`). |
| **Scrum** | Sprints 0–6 de `.sprints/BACKLOG.md`, en orden, sin fusionar. Cada sprint cierra con su DoD validada en preview de Vercel antes de abrir el siguiente. |

El PO (Product Owner) es quien aprueba cada paso y cada cierre de sprint.

## Reglas inquebrantables

1. **SPEC primero.** No se escribe código sin una tarea del backlog que lo contrate.
2. **TDD siempre.** Primero el test que falla (Rojo), luego el código mínimo (Verde), luego refactor.
3. **Dominio puro.** `src/domain/**` no importa `@supabase/*`, `cloudinary`, `astro` ni ninguna otra capa.
4. **Degradación elegante.** Si Luma, Supabase o Cloudinary fallan, la página pública NO se rompe (nunca un 500). Ver `docs/DISENO_TECNICO.md` §5.
5. **Trazabilidad.** Todo dato conserva su procedencia: columna `source` (`supabase` / `cloudinary` / `static`).
6. **Solo cuenta lo demostrable.** Nada es "hecho" si no corre end-to-end en un preview de Vercel.
7. **Sin scope creep.** No se añaden funcionalidades fuera del SPEC activo. No se adelanta trabajo de sprints posteriores.
8. **No se tocan páginas públicas existentes** (Home, Pilares, Nosotros, Convocatorias, Internacional, Vida LEAD, Eventos, 404) fuera del sprint que explícitamente las toque. `pnpm build` debe pasar en cada commit.
9. **Aislamiento de rutas.** Todo lo nuevo con servidor vive en `/administrator/**`. Al añadir el adaptador de Vercel, las 10 rutas públicas siguen **prerenderizadas**; solo `/administrator/**` lleva `export const prerender = false`.
10. **Rama `cms-admin`.** Nunca se commitea a `main`. El merge a `main` es el único momento en que algo llega a producción, y solo tras aprobación del PO.

## Reglas de diseño (no negociable)

- Toda UI nueva reutiliza la paleta, tipografía y componentes de `src/components/ui/` ya existentes. Ver `DESIGN.md`.
- **Nunca** se propone una paleta, tipografía o sistema de diseño nuevo. Se **extiende** el existente.
- Tokens de referencia: `@theme` en `src/styles/global.css`, `pillarGradients` en `src/components/home/HomePillars.astro`, `Navbar.astro`, `Footer.astro`.

## Stack cerrado (no se cuestiona ni se proponen alternativas)

| Necesidad | Solución | Vetado |
|---|---|---|
| Auth + base de datos | **Supabase** (Auth + Postgres) | CMS headless de terceros (Payload, Directus, Sanity) |
| Fotos | **Cloudinary** (todo el contenido de imagen) | Supabase Storage para archivos pesados |
| Eventos | **Luma** solo embed/link | Sincronizar o duplicar datos de Luma vía API |
| Render servidor | **Astro `output: 'static'` + `@astrojs/vercel`**, `prerender = false` solo en rutas nuevas | Pasar el sitio entero a `output: 'server'` |
| Páginas externas (cursos, Study Fest, programas de Pilar) | Solo enlace desde la navegación | Construirlas en este repo |

## Comunicación

- Todo reporte al PO va en **tablas de doble entrada** (estilo Notion).
- Al cerrar cada tarea/sprint se documentan decisiones y errores en [`MEMORY.md`](./MEMORY.md) (raíz).
- Cada 2 tareas dentro de un sprint: resumen en tabla (qué se hizo, qué test lo cubre, si `pnpm build` sigue pasando).
- Al terminar un sprint: recordar al PO `git push origin cms-admin` para el preview de Vercel.

## Definition of Done (transversal, además de la DoD específica de cada sprint)

- [ ] Tests nuevos en verde (`pnpm test`), incluida la regresión previa.
- [ ] `pnpm build` pasa; `dist/` conserva las 10 páginas públicas como HTML prerenderizado.
- [ ] Solo `/administrator/**` genera funciones de servidor.
- [ ] `pnpm lint` sin errores nuevos.
- [ ] Sin secretos hardcodeados (todo por variable de entorno).
- [ ] `MEMORY.md` actualizado.
- [ ] Demostrado en preview de Vercel y aprobado por el PO.
