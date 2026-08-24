# Contexto del proyecto — LEAD UTP Website

> Última actualización: 2026-08-23

## Qué es esto

Sitio web oficial de **LEAD UTP**, construido con [Astro](https://astro.build) + Tailwind CSS v4. Repo: `LeadUTPHub/leadutp_website`.

## Stack

- **Astro 7** (SSG) con TypeScript
- **Tailwind CSS 4** (vía `@tailwindcss/vite`)
- **@lucide/astro** para iconos
- **@vercel/analytics** y **@vercel/speed-insights** — métricas de uso y performance
- **@astrojs/sitemap** — sitemap.xml automático
- Deploy en **Vercel** (`https://leadutp.vercel.app`)

## Estado actual

Páginas implementadas:

| Página | Ruta | Estado |
|---|---|---|
| Home | `/` | ✅ rediseñada, con secciones: hero, pilares, eventos, alianzas, vida del capítulo, red, reclutamiento, medios |
| Eventos | `/eventos` | ✅ agenda con eventos destacados, próximos y pasados |
| Pilares | `/pilares` y `/pilares/[slug]` | ✅ vista general + página por pilar |

SEO/infra ya cubierto:
- Meta tags Open Graph / Twitter Card + imagen social (`og-image.png`)
- URL canónica por página
- `robots.txt` + sitemap
- Transiciones de página (`astro:transitions`)

## Estructura de datos (contenido)

El contenido vive como datos tipados en `src/data/`, **no en un CMS todavía**:

- `src/data/pillars/pillars.data.ts` — los 6 pilares de LEAD UTP (`desarrollo-profesional`, `liderazgo`, `excelencia-femenina`, `desarrollo-del-capitulo`, `excelencia-academica`, `lead-academia`), cada uno con descripción, iniciativas, testimonios y métricas.
- `src/data/events/events.data.ts` — eventos (fecha, hora, ubicación, categoría, imagen, link de registro, pilares relacionados).
- `src/data/home/home.data.ts` — contenido específico de la home.

Para **editar contenido** (textos, eventos, pilares), se trabaja directamente en esos archivos `.data.ts` — no hace falta tocar los componentes visuales.

## Componentes reutilizables

- `src/components/ui/` — primitivas (Button, Badge, Container, SectionHeader)
- `src/components/layout/` — Navbar, Footer
- `src/components/home/`, `events/`, `pillars/` — bloques específicos de cada sección

## Cómo correr el proyecto localmente

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # build de producción
npm run preview   # preview del build
```

## Pendientes / ideas abiertas

- Imágenes placeholder en pilares y eventos (`imageIsTemporary: true`) — reemplazar con fotos reales.
- Evaluar si el contenido pasa a un CMS/marketplace integration en vez de archivos `.data.ts` a medida que crezca.
- Definir dominio propio (actualmente `leadutp.vercel.app`).

## Dónde preguntar

Este archivo se actualiza a medida que avanza el proyecto — si algo acá quedó desactualizado, revisar el historial de commits (`git log`) o preguntar en el canal del equipo.
