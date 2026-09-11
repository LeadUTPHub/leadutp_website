# TECH_STACK.md — Panel de administración LEAD UTP

> Qué se añade sobre el stack ya existente del sitio, y qué queda vetado.
> El stack base del sitio público está en [`CONTEXT.md`](./CONTEXT.md) y no cambia.

## 1. Base existente (no se toca)

| Área | Tecnología | Nota |
|---|---|---|
| Framework | Astro 7 (7.3.x) + TypeScript (`astro/tsconfigs/strict`) | `output` era implícito `static` |
| Estilos | Tailwind CSS 4 vía `@tailwindcss/vite` | Sin `tailwind.config.js`; tokens en `@theme` de `src/styles/global.css` |
| Iconos | `@lucide/astro` | Único set |
| Métricas | `@vercel/analytics`, `@vercel/speed-insights` | Ya en `Layout.astro` |
| SEO | `@astrojs/sitemap` | Se le añade un `filter` |
| Tests | Vitest | Cobertura previa: `src/data/events/events.utils.ts` |
| Lint/format | ESLint + Prettier | — |
| Gestor | pnpm · Node ≥ 22.12 | — |
| Deploy | Vercel (desde `main`) | Previews por PR de rama |

## 2. Dependencias que se añaden

| Paquete | Versión objetivo | Para qué | Capa que lo usa |
|---|---|---|---|
| `@astrojs/vercel` | ^8 (compatible Astro 7) | Adaptador que habilita rutas on-demand | `astro.config.mjs` |
| `@supabase/supabase-js` | ^2 | Cliente de Postgres + Auth | Solo `src/infra/` |
| `@supabase/ssr` | ^0.6 | Sesión con cookies en Astro SSR (middleware + endpoints) | `src/infra/` + `src/middleware.ts` |

**Cloudinary: sin paquete.** La firma de subida se hace con el módulo `crypto` nativo de Node (SHA-1 de los parámetros + `api_secret`) y `fetch`. La subida la hace el navegador directamente contra `https://api.cloudinary.com/v1_1/<cloud>/image/upload`. Las URLs de entrega se construyen como strings (`res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,w_<w>/<public_id>`).

## 3. Servicios externos

| Servicio | Plan | Qué guarda | Qué NO |
|---|---|---|---|
| **Supabase** | Free tier | Auth (email+contraseña, MFA-ready), Postgres (perfiles, roles, punteros a Luma, galerías, `page_blocks`) | Archivos pesados / imágenes |
| **Cloudinary** | Free tier (25 GB) | Todas las fotos (galerías "así se vivió el evento", fotos de subpáginas) | Datos estructurados |
| **Luma** | — | La verdad única de eventos (fecha, hora, cupos, inscripción) | — |

## 4. Variables de entorno

| Variable | Ámbito | ¿Cliente? |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | build + runtime + cliente | Sí |
| `PUBLIC_SUPABASE_ANON_KEY` | cliente (login) + lectura en build | Sí (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | solo endpoints server (`/administrator/api/users`) | **NO** |
| `PUBLIC_CLOUDINARY_CLOUD_NAME` | render de URLs + firma | Sí |
| `CLOUDINARY_API_KEY` | firma (server) | No |
| `CLOUDINARY_API_SECRET` | firma (server) | **NO** |
| `PUBLIC_LUMA_CALENDAR_URL` | botón + build | Sí — valor: `https://luma.com/leadutp_` |
| `PUBLIC_LUMA_EMBED_URL` | `src` del iframe (snippet del panel de Luma) | Sí — opcional; sin él, solo botón |

Local: `.env` (en `.gitignore`). Producción/preview: Vercel Environment Variables. Tipado en `src/env.d.ts`. **Nunca** hardcodeadas.

## 5. Vetado explícitamente

| Prohibido | Por qué |
|---|---|
| Cualquier CMS headless de terceros (Payload, Directus, Sanity, Strapi…) | Decisión de Fase 0: backend custom con Supabase |
| Sincronizar / duplicar / cachear datos de eventos vía API de Luma | Luma es la única fuente de verdad; la web solo muestra o enlaza |
| Supabase Storage para imágenes | Cloudinary es el almacén de imágenes |
| Pasar el sitio a `output: 'server'` | Rompería el prerender de las páginas públicas |
| Construir páginas de cursos / Study Fest / programas de Pilar en este repo | Se alojan aparte, solo se enlazan |
| Nueva paleta / tipografía / design system | Se reutiliza el existente (ver `DESIGN.md`) |
| Añadir el SDK `cloudinary` | Innecesario; la firma son ~10 líneas con `crypto` |
