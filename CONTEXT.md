# Contexto del proyecto — LEAD UTP Website

> Última actualización: 2026-08-25

## Qué es esto

Sitio web oficial de **LEAD UTP**, construido con [Astro](https://astro.build) + Tailwind CSS v4. Repo: `LeadUTPHub/leadutp_website`.

## Stack

- **Astro 7** (SSG) con TypeScript
- **Tailwind CSS 4** (vía `@tailwindcss/vite`)
- **@lucide/astro** para iconos
- **@vercel/analytics** y **@vercel/speed-insights** — métricas de uso y performance
- **@astrojs/sitemap** — sitemap.xml automático
- **ESLint + Prettier** — `npm run lint`, `npm run format`, `npm run format:check`
- **Vitest** — `npm test` (o `npm run test:watch`); por ahora solo cubre `src/data/events/events.utils.ts`
- Deploy en **Vercel** (`https://leadutp.vercel.app`)

## Estado actual

Páginas implementadas:

| Página         | Ruta                           | Estado                                                                                                              |
| -------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Home           | `/`                            | ✅ rediseñada, con secciones: hero, pilares, eventos, alianzas, vida del capítulo, red, reclutamiento, medios       |
| Eventos        | `/eventos`                     | ✅ agenda con eventos destacados, próximos y pasados                                                                |
| Pilares        | `/pilares` y `/pilares/[slug]` | ✅ vista general + página por pilar                                                                                 |
| Sobre nosotros | `/nosotros`                    | 🟡 estructura real lista, textos y equipo con marcadores `[Contenido pendiente]` (ver `src/data/about/`)            |
| Proyectos      | `/proyectos`                   | 🟡 estructura real lista, lista de proyectos con marcadores `[Contenido pendiente]` (ver `src/data/projects/`)      |
| Convocatorias  | `/convocatorias`               | 🟡 estructura real lista, convocatoria con marcadores `[Contenido pendiente]` (ver `src/data/openings/`)            |
| Internacional  | `/internacional`               | ✅ galería por país (Uruguay, China, Suiza, Francia) con fotos reales de `public/imagestest/internacional_leadutp/` |
| Vida LEAD      | `/vida-lead`                   | ✅ galería de 9 eventos locales (2025-2026) con fotos reales de `public/imagestest/{2025,2026}/`                    |
| 404            | —                              | ✅ página de error personalizada                                                                                    |

Los CTAs del home ("Conoce LEAD UTP", "Ver convocatorias", "Explorar proyectos") y el Navbar apuntan a `/nosotros`, `/proyectos` y `/convocatorias`. Las tres páginas ya tienen su diseño y estructura de datos definitivos (mismo patrón `.data.ts` que pilares/eventos); solo falta que alguien del equipo reemplace los textos marcados `[Contenido pendiente]` por la información real. `src/components/ui/ComingSoon.astro` sigue disponible para futuras secciones en construcción, pero ya no se usa en estas tres rutas.

SEO/infra ya cubierto:

- Meta tags Open Graph / Twitter Card + imagen social (`og-image.png`)
- URL canónica por página
- `robots.txt` + sitemap
- Transiciones de página (`astro:transitions`)

## Estructura de datos (contenido)

El contenido vive como datos tipados en `src/data/`, **no en un CMS todavía**:

- `src/data/pillars/pillars.data.ts` — los 6 pilares de LEAD UTP (`desarrollo-profesional`, `liderazgo`, `excelencia-femenina`, `desarrollo-del-capitulo`, `excelencia-academica`, `lead-academia`), cada uno con descripción, iniciativas, testimonios y métricas.
- `src/data/events/events.data.ts` — eventos (fecha, hora, ubicación, categoría, imagen, link de registro, pilares relacionados).
- `src/data/home/home.data.ts` — contenido específico de la home; `homeCommunityMoments` ya usa 3 fotos reales (`src/assets/home/`), pero `homeHeroMedia` sigue vacío.
- `src/data/about/about.data.ts` — misión, visión, historia y junta directiva de `/nosotros` (marcadores `[Contenido pendiente]`).
- `src/data/projects/projects.data.ts` — lista de proyectos de `/proyectos` (marcadores `[Contenido pendiente]`).
- `src/data/openings/openings.data.ts` — convocatorias abiertas de `/convocatorias`; array vacío = "no hay convocatorias abiertas" (marcadores `[Contenido pendiente]`).
- `src/data/international/international.data.ts` — experiencias internacionales de `/internacional` (país, evento, fotos). Las fotos apuntan a `public/imagestest/internacional_leadutp/`, no a `src/assets` (por eso se renderizan con `<img>` plano en `InternationalExperienceCard.astro`, no con `astro:assets`). Falta agregar la carpeta `16_aI_hackaton_lizbeth` (país sin confirmar).
- `src/data/life/life.data.ts` — los 9 eventos locales de `/vida-lead` (año, nombre, fotos), mismo patrón de `<img>` plano apuntando a `public/imagestest/2025/` y `public/imagestest/2026/`. Las fechas exactas de cada evento no están confirmadas, por eso solo se muestra el año.

Para **editar contenido** (textos, eventos, pilares), se trabaja directamente en esos archivos `.data.ts` — no hace falta tocar los componentes visuales.

## Componentes reutilizables

- `src/components/ui/` — primitivas (Button, Badge, Container, SectionHeader)
- `src/components/layout/` — Navbar, Footer
- `src/components/home/`, `events/`, `pillars/`, `international/`, `life/` — bloques específicos de cada sección

## Cómo correr el proyecto localmente

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # build de producción
npm run preview   # preview del build
```

## Pendientes / ideas abiertas

Ver [`PENDIENTES.md`](./PENDIENTES.md) para la lista detallada y priorizada.

## Dónde preguntar

Este archivo se actualiza a medida que avanza el proyecto — si algo acá quedó desactualizado, revisar el historial de commits (`git log`) o preguntar en el canal del equipo.
