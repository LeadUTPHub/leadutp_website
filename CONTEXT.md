# Contexto del proyecto — LEAD UTP Website

> Última actualización: 2026-09-14

## Qué es esto

Sitio web oficial de **LEAD UTP**, construido con [Astro](https://astro.build) + Tailwind CSS v4. Repo: `LeadUTPHub/leadutp_website`.

## Stack

- **Astro 7** (SSG) con TypeScript
- **Tailwind CSS 4** (vía `@tailwindcss/vite`)
- **@lucide/astro** para iconos
- **@vercel/analytics** y **@vercel/speed-insights** — métricas de uso y performance
- **@astrojs/sitemap** — sitemap.xml automático
- **ESLint + Prettier** — `pnpm lint`, `pnpm format`, `pnpm format:check`
- **Vitest** — `pnpm test` (o `pnpm test:watch`); 393 tests en 37 archivos (dominio puro, endpoints del panel con el container mockeado, y una suite de integración contra Supabase real — se salta sin credenciales de test)
- Gestor de paquetes: **pnpm** (ver `pnpm-lock.yaml`)
- Deploy en **Vercel** (`https://leadutp.vercel.app`)

## Estado actual

Páginas implementadas:

| Página         | Ruta                           | Estado                                                                                                                                        |
| -------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Home           | `/`                            | ✅ rediseñada, con secciones: hero, pilares, eventos, alianzas, vida del capítulo, red, reclutamiento, medios                                 |
| Eventos        | `/eventos`                     | ✅ **resuelto** (Sprint 1 + Cambio de alcance 2026-09-14, ver más abajo). Los 22 eventos ficticios ya no existen — "Próximos eventos" muestra las tarjetas reales que carga cada director en el panel (`/administrator/eventos`), cada una con su propio link de inscripción a Luma. "Eventos pasados" muestra galerías reales de fotos, cargadas en `/administrator/eventos-pasados` |
| Pilares        | `/pilares` y `/pilares/[slug]` | ✅ vista general + página por pilar; imágenes de los 6 pilares aún son placeholder (`imageIsTemporary: true`)                                 |
| Sobre nosotros | `/nosotros`                    | 🟡 misión, visión y valores reales. Junta directiva editable desde el panel (`/administrator/paginas`, solo por la presidencia); historia **fija en código** por decisión explícita (`about.data.ts`, no editable desde el panel) — ambas secciones se ocultan mientras no tengan contenido |
| Proyectos      | `/proyectos`                   | 🟡 lista editable desde el panel (`/administrator/paginas`, solo por la presidencia); sin proyectos cargados aún (pendiente de la directiva) |
| Convocatorias  | `/convocatorias`               | ✅ convocatoria real abierta ("Voluntarios 2026 - 2"), con su Google Form embebido como iframe en la página                                   |
| Internacional  | `/internacional`               | ✅ galería por país (Uruguay, China, Suiza, Francia) con fotos reales de `public/images/internacional_leadutp/`                               |
| Vida LEAD      | `/vida-lead`                   | ✅ galería de 9 eventos locales (2025-2026) con fotos reales de `public/images/{2025,2026}/`                                                  |
| 404            | —                              | ✅ página de error personalizada                                                                                                              |

Los CTAs del home ("Conoce LEAD UTP", "Ver convocatorias", "Explorar proyectos") y el Navbar apuntan a `/nosotros`, `/proyectos` y `/convocatorias`. Mientras la directiva de LEAD UTP no confirme el contenido real, cada página muestra un estado vacío cuidado en vez de marcadores `[Contenido pendiente]` — no hay que inventar contenido para "rellenar" mientras se espera. La diferencia entre las tres: `/convocatorias` ya tiene una convocatoria real cargada a mano en `openings.data.ts`; `/nosotros` (junta directiva) y `/proyectos` esperan que la presidencia los publique desde `/administrator/paginas` (ver "Panel de administración" más arriba); la historia de `/nosotros` específicamente se edita solo en código, nunca desde un panel.

SEO/infra ya cubierto:

- Meta tags Open Graph / Twitter Card + imagen social; `og-image.png` como fallback global, con override por página en `/pilares/[slug]` cuando el pilar ya tiene foto real (no placeholder)
- URL canónica por página
- `robots.txt` + sitemap
- Transiciones de página (`astro:transitions`); el crossfade está afinado a 300ms con `cubic-bezier(0.4, 0, 0.2, 1)` (la misma curva que usa Tailwind en el resto del sitio) en vez del corte seco que tenía antes

## Panel de administración — cómo se administra el contenido ahora

El VP pidió que directores y subdirectores puedan cargar su propio contenido (eventos, fotos de "así se vivió el evento", y el contenido de Nosotros/Proyectos) sin depender de alguien que edite los `.data.ts` a mano. Ese panel (`/administrator`, ruta oculta — sin botón de login en el sitio público, fuera de sitemap y `robots.txt`) está **funcional de punta a punta** en la rama `cms-admin` (Sprints 0–6 del proceso documentado en [`docs/GUIA_METODOLOGIA_ADMIN.md`](./docs/GUIA_METODOLOGIA_ADMIN.md); detalle sprint a sprint en `MEMORY.md` y `.sprints/BACKLOG.md`). Todavía no se mergeó a `main` — eso es el último paso, después de que el PO apruebe el cierre completo del Sprint 6.

Stack real:

- **Supabase** — Auth (roles `director` / `subdirector` / `super_admin` con Row Level Security: cada uno edita solo lo suyo) + Postgres para eventos, galerías y el contenido de Nosotros/Proyectos
- **Cloudinary** — todas las fotos (subida firmada directo desde el navegador); Supabase no guarda archivos pesados
- **Luma** — cada evento apunta a su propio link de inscripción en Luma; **ya no hay ningún embed/iframe de Luma en el sitio** (se quitó de `/eventos` el 2026-09-14, ver "Cambios de alcance" más abajo) — el único link genérico que queda es un botón en la Home mientras no haya un evento propio destacado
- **Astro `output: 'static'` + adaptador de Vercel, `prerender = false` solo en `/administrator/**`** — el resto del sitio sigue 100% prerenderizado (SSG)

### Qué se administra desde ahí, y quién

| Pantalla | Qué carga | Quién |
|---|---|---|
| `/administrator/eventos` | Las tarjetas de "Próximos eventos" de `/eventos` (título, link de inscripción en Luma, fecha, ubicación, imagen, descripción) | Cualquier director/subdirector crea las suyas; solo edita/borra las de su propia área (o las suyas, si es subdirector) |
| `/administrator/eventos-pasados` | Las galerías de fotos de "Eventos pasados" en `/eventos` (antes se llamaba "Galerías" en el panel — mismo dato, mismo esquema, solo se le cambió el nombre a la pantalla el 2026-09-14 para que quede claro qué alimenta) | Igual que Eventos; la galería de fotos también sirve como repositorio de fotos para el equipo de marketing, no solo para lo que se ve en el sitio |
| `/administrator/paginas` | Junta directiva (`/nosotros`) y la lista de Proyectos (`/proyectos`) | **Solo la presidencia (`super_admin`)** — el resto del staff entra en modo lectura. La **historia** de `/nosotros` no está acá: se quitó el 2026-09-14 (ver más abajo) y se edita directo en `src/data/about/about.data.ts` |

Si Supabase o Cloudinary no responden, cada pantalla del sitio público degrada a su `.data.ts`/estado vacío en vez de romperse (nunca un error 500) — y el panel muestra un mensaje de error legible en vez de una pantalla en blanco.

### Cambios de alcance del 2026-09-14 (fuera del backlog original de 7 sprints)

Con el panel ya funcionando de punta a punta, el PO pidió 3 ajustes puntuales — detalle completo (por qué, verificación) en `MEMORY.md` D-16/D-17/D-18:

1. **Se quitó el embed/link genérico de Luma de `/eventos`.** Antes la sección mostraba un botón + iframe al calendario completo de Luma, además de las tarjetas curadas. Ahora "Próximos eventos" es solo esas tarjetas (cada una con su propio link de inscripción) — el calendario genérico ya no aportaba nada distinto.
2. **"Galerías" se renombró a "Eventos pasados"** en el panel (ruta, sidebar, textos) — puro cambio de nombre, el modelo de datos y la lógica no cambiaron. El nombre viejo generaba confusión sobre qué alimentaba esa pantalla.
3. **La historia de `/nosotros` se sacó del panel.** Queda fija en `about.data.ts`, editable solo por quien toque código — la key correspondiente ni siquiera existe ya en la lista de bloques editables del panel (no es solo que se escondió el botón).

### Pendientes sin fecha (registrados, no urgentes)

- **Rediseño visual de la tarjeta de "Eventos pasados"** (tanto en el panel como, potencialmente, en `/eventos` público) — el PO lo dejó anotado explícitamente como una mejora futura, sin fecha.
- **Contraste de `--color-secondary`** (rojo de error/borrar) por debajo del mínimo de WCAG AA para texto normal en fondos oscuros — ver `PENDIENTES.md` punto 15. Es un token compartido con todo el sitio, no algo puntual del panel.

## Estructura de datos (contenido)

El contenido vive como datos tipados en `src/data/`, **no en un CMS todavía**:

- `src/data/pillars/pillars.data.ts` — los 6 pilares de LEAD UTP (`desarrollo-profesional`, `liderazgo`, `excelencia-femenina`, `desarrollo-del-capitulo`, `excelencia-academica`, `lead-academia`), cada uno con descripción, iniciativas, testimonios y métricas. En la home, `HomePillars.astro` los muestra como 6 cuadros grandes en grilla (3x2 en desktop), cada uno con degradé de color propio, el ícono del pilar y animación al pasar el mouse — inspirado en el mismo tratamiento de la página anterior de LEAD. Los colores son placeholders (`pillarGradients` dentro del componente, por slug) hasta que la directiva defina la paleta real por pilar — ver `PENDIENTES.md` punto 4.
- `src/data/events/events.data.ts` — **resuelto, ya no tiene los 22 eventos de ejemplo** (array vacío a propósito desde Sprint 1; `events.utils.ts` se conserva porque lo sigue usando `/pilares/[slug]`). Los eventos reales de `/eventos` ya no viven en un `.data.ts`: se cargan desde Supabase vía el panel de administración (`/administrator/eventos` y `/administrator/eventos-pasados`) — ver la sección "Panel de administración" más arriba.
- `src/data/home/home.data.ts` — contenido específico de la home; `homeCommunityMoments` y `homeHeroSlides` ya usan fotos reales (`src/assets/home/` y `public/images/`), y `homeAlliances` tiene las 7 alianzas reales con logo. `HomeAlliances.astro` las anima en un marquee infinito (lista duplicada + `translateX(-50%)`), con tamaño de logo y ritmo (25s) ajustados para sentirse igual de fluido que en la página anterior de LEAD UTP. `homeHeroMedia` (el marco de foto fija del hero) sigue vacío.
- `src/data/about/about.data.ts` — misión, visión, valores y acrónimo reales, **estos 4 siempre vienen de acá**, nunca del panel. `history` queda sin definir a propósito (se edita directo en este archivo, por decisión explícita del 2026-09-14 — no hay UI de panel para esto) y `team` es el *fallback* que se usa solo si todavía no se publicó nada desde `/administrator/paginas` — la página oculta ambas secciones mientras estén vacías.
- `src/data/projects/projects.data.ts` — mismo patrón que `team`: es el *fallback* de la lista de proyectos, se usa solo si `/administrator/paginas` todavía no tiene nada publicado. Vacío hasta que la directiva confirme los proyectos reales.
- `src/data/openings/openings.data.ts` — convocatorias abiertas de `/convocatorias`; array vacío = "no hay convocatorias abiertas". Hoy tiene una convocatoria real ("Voluntarios 2026 - 2") con `embedForm: true`: cuando ese flag está activo, `/convocatorias` embebe el Google Form de `applyUrl` como iframe en la página (`getEmbeddedFormUrl()` en `openings.utils.ts` le agrega `embedded=true`), además del link para abrirlo en una pestaña nueva. Solo funciona con Google Forms — para otro tipo de link, dejar `embedForm` sin definir y se muestra el botón "Postular" de siempre.
- `src/data/international/international.data.ts` — experiencias internacionales de `/internacional` (país, evento, fotos). Las fotos apuntan a `public/images/internacional_leadutp/`, no a `src/assets` (por eso se renderizan con `<img>` plano en `InternationalExperienceCard.astro`, no con `astro:assets`). Falta agregar la carpeta `16_aI_hackaton_lizbeth` (país sin confirmar).
- `src/data/life/life.data.ts` — los 9 eventos locales de `/vida-lead` (año, nombre, fotos), mismo patrón de `<img>` plano apuntando a `public/images/2025/` y `public/images/2026/`. Las fechas exactas de cada evento no están confirmadas, por eso solo se muestra el año.

Para **editar contenido de pilares, home, convocatorias, internacional o vida LEAD**, se trabaja directamente en esos archivos `.data.ts` — no hace falta tocar los componentes visuales. **Eventos, junta directiva y proyectos ya no se editan así**: se cargan desde `/administrator` (ver "Panel de administración" más arriba); sus `.data.ts` solo quedan como *fallback* para cuando todavía no hay nada publicado.

## Componentes reutilizables

- `src/components/ui/` — primitivas (Button, Badge, Container, SectionHeader)
- `src/components/layout/` — Navbar (sticky; al hacer scroll se encoge y además pasa de navy sólido a un cristal traslúcido con blur, para que el color de la sección que queda debajo se mezcle con él en vez de cortar en seco), Footer
- `src/components/home/`, `events/`, `pillars/`, `international/`, `life/` — bloques específicos de cada sección

## Cómo correr el proyecto localmente

```bash
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # build de producción (incluye un script `prebuild` automático)
```

`pnpm preview` **no funciona** desde que se agregó el adaptador de Vercel (`@astrojs/vercel` no soporta el comando `preview`, es una limitación del propio paquete, no un bug de este repo). Para validar un build de producción en local, `pnpm build` + servir `dist/client` con cualquier servidor estático alcanza para el sitio público; el panel de administración (rutas server-rendered) se valida con `pnpm dev`.

## Pendientes / ideas abiertas

Ver [`PENDIENTES.md`](./PENDIENTES.md) para la lista detallada y priorizada.

## Dónde preguntar

Este archivo se actualiza a medida que avanza el proyecto — si algo acá quedó desactualizado, revisar el historial de commits (`git log`) o preguntar en el canal del equipo.
