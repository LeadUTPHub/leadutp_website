# Contexto del proyecto — LEAD UTP Website

> Última actualización: 2026-09-08

## Qué es esto

Sitio web oficial de **LEAD UTP**, construido con [Astro](https://astro.build) + Tailwind CSS v4. Repo: `LeadUTPHub/leadutp_website`.

## Stack

- **Astro 7** (SSG) con TypeScript
- **Tailwind CSS 4** (vía `@tailwindcss/vite`)
- **@lucide/astro** para iconos
- **@vercel/analytics** y **@vercel/speed-insights** — métricas de uso y performance
- **@astrojs/sitemap** — sitemap.xml automático
- **ESLint + Prettier** — `pnpm lint`, `pnpm format`, `pnpm format:check`
- **Vitest** — `pnpm test` (o `pnpm test:watch`); por ahora solo cubre `src/data/events/events.utils.ts`
- Gestor de paquetes: **pnpm** (ver `pnpm-lock.yaml`)
- Deploy en **Vercel** (`https://leadutp.vercel.app`)

## Estado actual

Páginas implementadas:

| Página         | Ruta                           | Estado                                                                                                                                        |
| -------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Home           | `/`                            | ✅ rediseñada, con secciones: hero, pilares, eventos, alianzas, vida del capítulo, red, reclutamiento, medios                                 |
| Eventos        | `/eventos`                     | 🟡 UI completa, pero `events.data.ts` sigue con 22 eventos de ejemplo (fechas y `registrationUrl` ficticios) — no reemplazar sin datos reales |
| Pilares        | `/pilares` y `/pilares/[slug]` | ✅ vista general + página por pilar; imágenes de los 6 pilares aún son placeholder (`imageIsTemporary: true`)                                 |
| Sobre nosotros | `/nosotros`                    | 🟡 misión, visión y valores reales; historia y junta directiva pendientes de la directiva — esas secciones se ocultan mientras tanto          |
| Proyectos      | `/proyectos`                   | 🟡 estructura y estado vacío listos; sin proyectos cargados aún (pendiente de la directiva)                                                   |
| Convocatorias  | `/convocatorias`               | ✅ convocatoria real abierta ("Voluntarios 2026 - 2"), con su Google Form embebido como iframe en la página                                   |
| Internacional  | `/internacional`               | ✅ galería por país (Uruguay, China, Suiza, Francia) con fotos reales de `public/images/internacional_leadutp/`                               |
| Vida LEAD      | `/vida-lead`                   | ✅ galería de 9 eventos locales (2025-2026) con fotos reales de `public/images/{2025,2026}/`                                                  |
| 404            | —                              | ✅ página de error personalizada                                                                                                              |

Los CTAs del home ("Conoce LEAD UTP", "Ver convocatorias", "Explorar proyectos") y el Navbar apuntan a `/nosotros`, `/proyectos` y `/convocatorias`. Las tres páginas ya tienen su diseño y estructura de datos definitivos (mismo patrón `.data.ts` que pilares/eventos). Mientras la directiva de LEAD UTP no confirme el contenido real (historia, junta directiva, proyectos, convocatoria), los `.data.ts` correspondientes quedan vacíos a propósito y cada página muestra un estado vacío cuidado en vez de marcadores `[Contenido pendiente]` — no hay que inventar contenido para "rellenar" mientras se espera.

SEO/infra ya cubierto:

- Meta tags Open Graph / Twitter Card + imagen social; `og-image.png` como fallback global, con override por página en `/pilares/[slug]` cuando el pilar ya tiene foto real (no placeholder)
- URL canónica por página
- `robots.txt` + sitemap
- Transiciones de página (`astro:transitions`); el crossfade está afinado a 300ms con `cubic-bezier(0.4, 0, 0.2, 1)` (la misma curva que usa Tailwind en el resto del sitio) en vez del corte seco que tenía antes

## Estructura de datos (contenido)

El contenido vive como datos tipados en `src/data/`, **no en un CMS todavía**:

- `src/data/pillars/pillars.data.ts` — los 6 pilares de LEAD UTP (`desarrollo-profesional`, `liderazgo`, `excelencia-femenina`, `desarrollo-del-capitulo`, `excelencia-academica`, `lead-academia`), cada uno con descripción, iniciativas, testimonios y métricas. En la home, `HomePillars.astro` los muestra como 6 cuadros grandes en grilla (3x2 en desktop), cada uno con degradé de color propio, el ícono del pilar y animación al pasar el mouse — inspirado en el mismo tratamiento de la página anterior de LEAD. Los colores son placeholders (`pillarGradients` dentro del componente, por slug) hasta que la directiva defina la paleta real por pilar — ver `PENDIENTES.md` punto 4.
- `src/data/events/events.data.ts` — eventos (fecha, hora, ubicación, categoría, imagen, link de registro, pilares relacionados). **Los 22 eventos actuales son de ejemplo**, ver `PENDIENTES.md` punto 1 antes de tocar este archivo.
- `src/data/home/home.data.ts` — contenido específico de la home; `homeCommunityMoments` y `homeHeroSlides` ya usan fotos reales (`src/assets/home/` y `public/images/`), y `homeAlliances` tiene las 7 alianzas reales con logo. `HomeAlliances.astro` las anima en un marquee infinito (lista duplicada + `translateX(-50%)`), con tamaño de logo y ritmo (25s) ajustados para sentirse igual de fluido que en la página anterior de LEAD UTP. `homeHeroMedia` (el marco de foto fija del hero) sigue vacío.
- `src/data/about/about.data.ts` — misión, visión y valores reales; `history` queda sin definir y `team` vacío hasta que la directiva confirme esos datos (la página oculta esas secciones en ese caso).
- `src/data/projects/projects.data.ts` — lista de proyectos de `/proyectos`; vacío hasta que la directiva confirme los proyectos reales (la página ya maneja ese estado vacío).
- `src/data/openings/openings.data.ts` — convocatorias abiertas de `/convocatorias`; array vacío = "no hay convocatorias abiertas". Hoy tiene una convocatoria real ("Voluntariado 2026 - 2") con `embedForm: true`: cuando ese flag está activo, `/convocatorias` embebe el Google Form de `applyUrl` como iframe en la página (`getEmbeddedFormUrl()` en `openings.utils.ts` le agrega `embedded=true`), además del link para abrirlo en una pestaña nueva. Solo funciona con Google Forms — para otro tipo de link, dejar `embedForm` sin definir y se muestra el botón "Postular" de siempre.
- `src/data/international/international.data.ts` — experiencias internacionales de `/internacional` (país, evento, fotos). Las fotos apuntan a `public/images/internacional_leadutp/`, no a `src/assets` (por eso se renderizan con `<img>` plano en `InternationalExperienceCard.astro`, no con `astro:assets`). Falta agregar la carpeta `16_aI_hackaton_lizbeth` (país sin confirmar).
- `src/data/life/life.data.ts` — los 9 eventos locales de `/vida-lead` (año, nombre, fotos), mismo patrón de `<img>` plano apuntando a `public/images/2025/` y `public/images/2026/`. Las fechas exactas de cada evento no están confirmadas, por eso solo se muestra el año.

Para **editar contenido** (textos, eventos, pilares), se trabaja directamente en esos archivos `.data.ts` — no hace falta tocar los componentes visuales.

## Componentes reutilizables

- `src/components/ui/` — primitivas (Button, Badge, Container, SectionHeader)
- `src/components/layout/` — Navbar (sticky; al hacer scroll se encoge y además pasa de navy sólido a un cristal traslúcido con blur, para que el color de la sección que queda debajo se mezcle con él en vez de cortar en seco), Footer
- `src/components/home/`, `events/`, `pillars/`, `international/`, `life/` — bloques específicos de cada sección

## Cómo correr el proyecto localmente

```bash
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # build de producción
pnpm preview   # preview del build
```

## Pendientes / ideas abiertas

Ver [`PENDIENTES.md`](./PENDIENTES.md) para la lista detallada y priorizada.

## Dónde preguntar

Este archivo se actualiza a medida que avanza el proyecto — si algo acá quedó desactualizado, revisar el historial de commits (`git log`) o preguntar en el canal del equipo.
