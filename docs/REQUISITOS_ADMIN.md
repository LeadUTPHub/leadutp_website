# REQUISITOS — Panel de Administración + Integración Luma (LEAD UTP)

> Paso 1 de 6 (Entendimiento). Documento de **requisitos**, no de diseño técnico.
> Fuente: `CONTEXT.md`, `PENDIENTES.md`, `docs/GUIA_METODOLOGIA_ADMIN.md` y el
> encargo del Vicepresidente (VP). No introduce stack ni requisitos nuevos.
> Última actualización: 2026-09-10.

---

## 1. Problema central

| | |
|---|---|
| **En una frase** | Hoy todo el contenido del sitio (eventos, galerías, "Nosotros", proyectos) solo se puede cambiar editando archivos `.data.ts` a mano en el repo; se necesita que directores y subdirectores carguen y editen **su propio** contenido desde un panel privado, y que los eventos se centralicen en Luma, sin romper ninguna página pública ya en producción. |

---

## 2. Qué NO se puede romper

| Elemento | Estado actual que debe preservarse |
|---|---|
| Home `/` | Rediseñada y en producción. No se toca fuera de un sprint que la nombre. |
| Pilares `/pilares` y `/pilares/[slug]` | Vista general + página por pilar, con OG override por pilar con foto real. |
| Sobre nosotros `/nosotros` | Misión/visión/valores reales; Historia y Junta se **ocultan** si están vacías. |
| Proyectos `/proyectos` | Estado vacío cuidado (sin lista vacía ni marcadores). |
| Convocatorias `/convocatorias` | Convocatoria real + Google Form embebido (`embedForm: true`). |
| Internacional `/internacional` | Galería por país con fotos de `public/images/internacional_leadutp/`. |
| Vida LEAD `/vida-lead` | Galería de 9 eventos locales con fotos de `public/images/{2025,2026}/`. |
| Eventos `/eventos` | UI completa. (Los 22 eventos son de ejemplo — ver §4 y §7.) |
| 404 | Página de error personalizada. |
| `pnpm build` | Debe pasar **limpio en cada commit**. |
| `pnpm preview` | Debe seguir sirviendo el build sin error. |
| Deploy Vercel desde `main` | `leadutp.vercel.app` sirve `main`; nada llega a producción hasta el merge. |
| Prerender de todas las rutas actuales | Siguen 100% estáticas (SSG). Solo rutas nuevas pasan a servidor. |
| Suite Vitest actual | `src/data/events/events.utils.test.ts` debe seguir en verde. |
| Infra SEO | Canónica por página, `robots.txt`, sitemap, OG/Twitter tags + `og-image.png`. |
| Tratamiento visual | Crossfade de View Transitions 300 ms `cubic-bezier(0.4,0,0.2,1)`; Navbar sticky que se encoge y pasa a cristal translúcido con blur al hacer scroll. |

---

## 3. Funcionalidades pedidas por el VP

### 3.a — Sección de Eventos con embed/link a Luma

| Aspecto | Requisito |
|---|---|
| Objetivo | `/eventos` (público) muestra los eventos **desde Luma** vía iframe embebido o botón de redirección. |
| Fuente de verdad | **Luma, y solo Luma.** Nada de sincronizar/duplicar datos de eventos vía API. |
| Origen de los datos | Luma es el calendario donde el equipo ya centraliza toda la info de eventos (coordinado también con Carlos). La web "jala" la info de ahí, **nunca se carga a mano**. _(Audio 1)_ |
| Sin datos propios de evento | La web no almacena fecha/hora/cupos/estado del evento; eso vive en Luma. |
| Sin área de inscripción en la web | La inscripción se hace **100 % en Luma**. La web **no** construye ningún formulario ni "un área donde se inscribe el evento" — solo muestra o enlaza. _(Audio 1)_ |
| Forma de presentación | Dos opciones sobre la mesa: (1) botón que redirige a Luma, o (2) iframe embebido de Luma en la página. Se elige en el Paso 2. _(Audio 1)_ |
| Degradación elegante | Si Luma no responde, `/eventos` sigue renderizando (mensaje + link directo a Luma), nunca un error 500. |
| Impacto en `events.data.ts` | A resolver: reemplazar el array de 22 ejemplos por el modelo Luma, o vaciarlo con estado vacío. No se decide en este paso. |
| Alcance de sprint | Sprint 1 (piloto), **sin auth ni Supabase**. |

### 3.b — Panel de administración privado

| Aspecto | Requisito |
|---|---|
| Acceso | Ruta oculta `/administrator` (nombre según reglas: `/administrator/*`). **Sin botón de login** en el sitio público ni en el Navbar. |
| URL de acceso | Ejemplo dado por el VP: `leadutp.org/administrator` — se entra escribiendo la URL directa, que lleva a una pantalla de **usuario y contraseña**. (Hoy el sitio vive en `leadutp.vercel.app`; el dominio propio es `PENDIENTES.md` §11.) _(Audio 2)_ |
| Autenticación | Login contra **Supabase Auth**. |
| Sesión | Una vez autenticado, el usuario "entra como administrador". _(Audio 2)_ |
| 2FA | "Posible 2FA" — el VP lo menciona como un **código OTP** de seguridad extra. Se **evalúa en el Paso 2** si aporta para el tamaño del equipo o es sobre-ingeniería en esta fase. No es requisito firme todavía. |
| Roles | `director`, `subdirector` y `super-admin`, gestionados en Supabase con Row Level Security (RLS). |
| Bloqueo por rol | Un rol que entra a una zona que no le corresponde recibe un bloqueo correcto (no un 500, no contenido ajeno). |
| Consistencia visual | Login, dashboard y formularios usan los **mismos tokens y componentes** del sitio público (ver §6). Nada de sistema de diseño nuevo. |
| Alcance de sprint | Sprint 2 (auth + roles + RLS), sin funcionalidad de contenido todavía. |

### 3.c — Cada rol sube/edita SOLO su contenido

El VP detalló **tres zonas administrables** desde el panel _(Audio 2)_:

| Zona administrable | Qué incluye | Fuente de los datos |
|---|---|---|
| Subpáginas del sitio en general | Texto y fotos de las secciones ya existentes (p. ej. Nosotros, Proyectos) | Supabase (texto) + Cloudinary (fotos) |
| Eventos **próximos** | Sección de próximos eventos, conectada a Luma | Luma (embed/link) |
| Eventos **realizados** | Sección **separada** tipo "así se vivió el Talent Room del sábado pasado" — fotos + texto, al estilo de `/vida-lead` | Supabase (texto) + Cloudinary (fotos) |

Objetivo declarado: que **cada director o subdirector de área** suba su propio contenido (texto + fotos) sin depender de un dev.

| Tipo de contenido | Dónde vive | Regla de propiedad |
|---|---|---|
| Eventos propios (referencia a Luma + metadatos mínimos) | Supabase (Postgres) | Cada director/subdirector crea/edita/borra **solo los suyos** (RLS). |
| Fotos "así se vivió el evento" | **Cloudinary** (archivo) + referencia (URL) en Supabase | Asociadas a un evento propio; solo su autor las gestiona. |
| Texto (descripciones, "Nosotros", proyectos) | Supabase (Postgres) | Editable solo por el rol propietario / con permiso. |
| Definición de "propio" | — | **A definir en Paso 2**. Los audios dicen "director o subdirector **de área**" → la propiedad probablemente se scopea por **área/dirección**, no solo por `owner_id` individual. Es una de las 3 decisiones críticas (ver §7 · D2). |
| Degradación elegante | — | Si Supabase o Cloudinary fallan, la página pública renderiza con el último contenido disponible / estado vacío cuidado, nunca error. |
| Alcance de sprint | — | Sprint 3 (CRUD eventos propios), Sprint 4 (galería Cloudinary), Sprint 5 (Nosotros + Proyectos). |

---

## 4. Módulos candidatos a migrar de `.data.ts` estático al panel

| Módulo | Archivo(s) actual(es) | Patrón hoy | Qué migraría al panel | Notas / riesgo |
|---|---|---|---|---|
| **Eventos** | `src/data/events/{events.data.ts, events.types.ts, events.utils.ts}` | Array tipado `Event[]`, slug-keyed, `pillarSlugs` como cross-ref, utils **puros** (fecha/zona Lima, agrupación por mes) con test | Referencia a Luma + metadatos mínimos (autor, pilar, ¿destacado?) en Supabase; el listado/registro se ve desde Luma | Tensión Luma vs Supabase: no duplicar datos de evento. 22 eventos actuales son ficticios (`PENDIENTES.md` §1). |
| **Vida LEAD** | `src/data/life/{life.data.ts, life.types.ts}` | `LifeEvent[]` con `year`, `eventName`, `photos[{src,alt}]`; `<img>` plano apuntando a `public/images/{2025,2026}/` | Álbumes por evento: texto en Supabase, fotos en Cloudinary | Candidato natural para la galería "así se vivió el evento" del Sprint 4. Solo tiene año, no fecha exacta (`PENDIENTES.md` §7). |
| **Nosotros — Historia** | `src/data/about/{about.data.ts, about.types.ts}` (`history?`) | Campo opcional `history?: string`; la página oculta la sección si falta | Texto largo editable desde el panel | Hoy vacío esperando a la directiva (`PENDIENTES.md` §2). |
| **Nosotros — Junta directiva** | `src/data/about/about.data.ts` (`team: TeamMember[]`) | `TeamMember[] = { name, role }`; sección oculta si `[]` | Alta/edición de miembros; posible foto en Cloudinary | Hoy `team: []` a propósito. |
| **Proyectos** | `src/data/projects/{projects.data.ts, projects.types.ts}` | `Project[] = { slug, name, description, status, link? }`; estado vacío cuidado si `[]` | CRUD de proyectos desde el panel | Hoy `projects: []` esperando a la directiva. |

Fuera de alcance de migración (se quedan en `.data.ts`, salvo decisión posterior del PO):
`pillars`, `home`, `openings` (convocatorias), `international`.

---

## 5. Restricciones técnicas actuales

| Área | Restricción / estado real |
|---|---|
| Framework | **Astro 7** con TypeScript. `astro.config.mjs` **sin `output` explícito** ⇒ hoy es `static` (SSG puro). |
| Adaptador de servidor | **No hay** adaptador instalado. Pasar cualquier ruta a modo servidor exige agregar `@astrojs/vercel` + cambiar `output`. Punto de mayor riesgo de regresión (ver §7). |
| Terminología "hybrid" | La guía habla de `output: 'hybrid'`. En Astro 7 ese modo se fusionó: se usa `output: 'static'` + adaptador + `export const prerender = false` **solo** en `/administrator/*` y endpoints propios. A confirmar exactamente en Paso 2. |
| Estilos | **Tailwind CSS 4** vía `@tailwindcss/vite`. **No existe `tailwind.config.js`** — los tokens viven en `@theme { … }` dentro de `src/styles/global.css`. |
| Gestor de paquetes | **pnpm** (`pnpm-lock.yaml`). Node `>=22.12.0`. |
| Backend | **Ninguno previo.** No hay endpoints, no hay uso de variables de entorno, no hay `.env` en el repo. Todo es build-time estático. |
| Imágenes | Dos patrones ya en uso: (1) `astro:assets` / `ImageMetadata` para `src/assets/**`; (2) `<img>` plano para `public/images/**`. Cloudinary sería un tercer patrón (URLs remotas). |
| Datos | Contenido = arrays TS tipados en `src/data/<mod>/` con barril `index.ts`; algunos con `.utils.ts` puros + `.test.ts` (Vitest). Array vacío = estado vacío curado. |
| Trazabilidad | Hoy **implícita**: todo el contenido es "archivo estático". Con Supabase/Cloudinary hay que hacerla **explícita** (regla inquebrantable §5): cada dato debe declarar su procedencia. |
| Tests | **Vitest**; cobertura actual solo `events.utils.ts`. TDD obligatorio para lo nuevo. |
| Lint/format | ESLint + Prettier. `pnpm format:check` marca 7 archivos con desfase de versión de Prettier (preexistente, no bloqueante — `PENDIENTES.md` §12). |
| Deploy | Vercel, sirviendo desde `main`. Previews automáticas por PR de la rama. |
| Rama de trabajo | Oficial: **`cms-admin`** (sin prefijo `feature/`), confirmada por el PO. Nunca se trabaja sobre `main`. |
| Analytics | `@vercel/analytics` + `@vercel/speed-insights` ya integrados en `Layout.astro`. |

---

## 6. Tokens de diseño existentes a reutilizar (lista concreta)

### 6.1 Color — `@theme` en `src/styles/global.css`

| Token | Valor | Uso observado |
|---|---|---|
| `--color-primary` | `#020c3e` | Navy base; fondo del Navbar sin scroll. |
| `--color-secondary` | `#d93340` | Rojo de marca; badges secundarios, subrayado de link activo, `::selection`. |
| `--color-optional-1` | `#a6249d` | Magenta; badge "optional". |
| `--color-optional-2` | `#cb2f4a` | Rojo-rosa (uso puntual). |
| `--color-optional-3` | `#7856ee` | Violeta de acción: botón primario, CTA "Convocatorias", **color de foco** global. |
| `--color-canvas` | `#060b24` | Fondo de página. |
| `--color-canvas-navy` | `#020c3e` | Variante navy. |
| `--color-canvas-deep` | `#050814` | Fondo más profundo; menú móvil, skip-link. |
| `--color-surface` | `rgb(255 255 255 / 0.045)` | Superficie sutil sobre el fondo oscuro. |
| `--color-surface-raised` | `rgb(255 255 255 / 0.075)` | Superficie elevada. |
| `--color-border-subtle` | `rgb(255 255 255 / 0.1)` | Bordes tenues. |
| `--color-foreground` | `#ffffff` | Texto principal. |
| `--color-foreground-secondary` | `rgb(255 255 255 / 0.8)` | Texto secundario. |
| `--color-foreground-muted` | `rgb(255 255 255 / 0.52)` | Texto atenuado. |
| `--gradient-site` | glow violeta radial + degradé navy→canvas→deep | Fondo global del `body`. |
| `pillarGradients` (en `HomePillars.astro`, por slug) | 6 degradés `from-[…] to-[…]` | Diferenciación de pilares. **Placeholders** hasta paleta real (`PENDIENTES.md` §4) — usar con cautela. |

### 6.2 Tipografía

| Token / clase | Valor | Uso |
|---|---|---|
| `--font-sans` / `font-sans` | `Inter` (300–900, Google Fonts) + system fallback | Texto de interfaz (body ya la aplica). |
| `--font-display` / `font-display` | `Geoform` → `Inter` → system | Títulos (`h2`/`h3`), `SectionHeader`. |
| Escala de títulos | `text-2xl md:text-3xl` (SectionHeader), `text-3xl sm:text-4xl` (hero de sección) | — |
| Tracking de títulos | `tracking-[-0.045em]` / `tracking-[-0.05em]` / `tracking-[-0.03em]` | Negativo, consistente. |
| Etiquetas / eyebrow | `text-[0.7rem] font-bold tracking-[0.18em] uppercase` | Rótulos sobre títulos. |
| Badge | `text-[0.6875rem] font-bold tracking-[0.08em] uppercase` | — |

### 6.3 Componentes `src/components/ui/` — **reutilizar, no recrear**

| Componente | API | Notas |
|---|---|---|
| `Button.astro` | `variant: primary \| secondary \| outline \| ghost`, `size: sm \| md \| lg`, `href?`, `type?`, `disabled?` | `rounded-md`, `font-semibold`, `min-h-10/11/12`, foco `outline-optional-3`. |
| `Badge.astro` | `tone: primary \| secondary \| optional` | `rounded-md`, uppercase, `ring-1`. |
| `Container.astro` | `class?` | `mx-auto w-full max-w-7xl px-5 md:px-8 lg:px-10`. |
| `SectionHeader.astro` | `id`, `title`, `description?`, slot `action` | `font-display`, layout título + acción. |

### 6.4 Utilidades y tratamiento visual

| Recurso | Definición | Uso |
|---|---|---|
| `@utility hairline-b / hairline-t / hairline-y` | Borde 1px que se desvanece a los lados | Separar secciones sin "cajas". |
| `@utility glow-heading` | Radial-gradient violeta tenue | Detrás de encabezados. |
| `.card-lift` | `hover`: borde `white/0.25` + `translateY(-2px)`; respeta `prefers-reduced-motion` | Hover unificado de tarjetas. |
| Radios | `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-2xl` / `rounded-3xl` | Escala ya en uso. |
| Superficie tipo tarjeta | `bg-white/[0.06]` + `ring-1 ring-white/12` (o `border border-white/10`) | Patrón repetido (Badge, tarjetas). |
| Foco global | `outline: 3px solid var(--color-optional-3); outline-offset: 3px` | Accesibilidad — mantener. |
| View Transitions | `0.3s` `cubic-bezier(0.4, 0, 0.2, 1)` | Crossfade entre páginas. |
| Navbar scroll | `5rem → 4rem`; `--color-primary` → `rgb(2 12 62 / 0.62)` + `blur(16px) saturate(150%)`; fallback opaco `0.92` sin `backdrop-filter` | Comportamiento a no romper. |
| Iconos | `@lucide/astro` | Único set de iconos. |
| `prefers-reduced-motion` | Bloque global que anula animaciones | Toda UI nueva debe respetarlo. |

---

## 7. Las 3 decisiones donde más se juega el éxito

| # | Decisión | Por qué es crítica | Dónde se resuelve |
|---|---|---|---|
| **D1** | **Frontera Luma ↔ Supabase para "Eventos".** Qué dato es de Luma (verdad única: listado, fecha, hora, cupos, registro, estado) y qué mínimo vive en Supabase. Los audios la precisan: **inscripción y "eventos próximos" = Luma** (la web no crea ningún área de inscripción); **"eventos realizados" (galería fotos + texto) = Supabase + Cloudinary**, no Luma. El registro en Supabase para eventos es sobre todo la galería de realizados + un puntero curado a Luma, no una copia del evento próximo. | Si la frontera se difumina, se termina replicando Luma en Postgres y se viola la decisión de Fase 0 (Luma = única fuente de verdad). El Sprint 3 dice "CRUD de eventos propios en Supabase" y hay que definir qué es exactamente ese registro sin que sea una copia de Luma. | Paso 2 (Diseño técnico) + `database/schema.sql` en Paso 3. |
| **D2** | **Modelo de autoría + RLS: qué significa "su propio contenido".** ¿Propiedad por `owner_id` del usuario, por **área/dirección**, o por pilar? Los audios dicen "director o subdirector **de área**", lo que apunta a un scope por área además de (o en vez de) `owner_id` individual. ¿`subdirector` hereda lo del `director` de su área? ¿`super-admin` edita todo? | Es la regla de negocio central del panel (VP: "cada rol sube/edita SOLO lo suyo"). Un RLS mal planteado o expone contenido ajeno, o bloquea a quien sí debería editar. Define el esquema de tablas y todas las políticas. | Paso 2 (RLS) — el PO valida explícitamente este punto. |
| **D3** | **Render híbrido sin romper el SSG.** Exactamente qué rutas pasan a on-demand (`/administrator/*` + endpoints propios) y **cómo las páginas públicas consumen datos de Supabase** manteniéndose prerenderizadas: ¿fetch en build-time? ¿revalidación? ¿fallback a `.data.ts` / último snapshot si Supabase no responde? | Agregar adaptador + cambiar `output` es el cambio con mayor riesgo de regresión sobre 8 páginas en producción. La regla inquebrantable §9 exige que las públicas sigan prerenderizadas y la §4 exige degradación elegante. | Paso 2 (punto 4: `astro.config.mjs` + plan de degradación) + Paso 4 (diff exacto). |

**Efecto de los audios del VP sobre estas 3 decisiones:** D1 y D2 quedan **más afiladas** (frontera de eventos próximos/realizados; scope de propiedad por área), no cambian de naturaleza. **D3 no cambia**; la única señal nueva —"administrar las subpáginas del sitio en general"— amplía la superficie de páginas públicas que leerán de Supabase, lo que **refuerza** la necesidad de resolver bien el render híbrido con degradación elegante.

---

## 8. Puntos abiertos antes de continuar al Paso 2

| # | Punto | Detalle |
|---|---|---|
| A | ~~Resumen de las 2 notas de voz del VP no fue pegado~~ **RESUELTO (2026-09-10)** | El PO pegó el resumen de los dos audios. Incorporado a §3 en las filas marcadas _(Audio 1)_ / _(Audio 2)_ y reflejado en §7. |
| B | ~~Nombre de la rama~~ **RESUELTO (2026-09-10)** | Rama oficial: **`cms-admin`** (sin prefijo `feature/`), confirmado por el PO; el nombre ya es correcto en el repo, sin acción de git pendiente. **Nota:** `docs/GUIA_METODOLOGIA_ADMIN.md` todavía contiene menciones a `feature/cms-admin` en su cuerpo (flujo git, Pasos 4-6) pese a la corrección — señalado al PO para que lo revise. |
| C | **`docs/` sin trackear + `CONTEXT.md` modificado** | Estado presente al iniciar la sesión; no fue tocado en este paso salvo la creación de este archivo. |
| D | **2FA** | Marcado como "posible" (el VP lo describe como código OTP). Decisión diferida al Paso 2 (hacerlo ahora vs. dejarlo para después). |

---

## 9. Resumen para visto bueno del PO

| Punto del encargo (Paso 1) | Entregado en este doc | Sección |
|---|---|---|
| Problema central en una frase | Sí | §1 |
| Qué NO se puede romper | Sí — 8 páginas + build + preview + deploy + tests + SEO + tratamiento visual | §2 |
| VP (a) Eventos con embed/link a Luma, sin sync | Sí | §3.a |
| VP (b) Panel oculto por URL, login + posible 2FA, roles director/subdirector | Sí | §3.b |
| VP (c) Cada rol edita SOLO lo suyo (eventos, fotos Cloudinary, texto Supabase) | Sí | §3.c |
| Módulos candidatos a migrar (eventos, vida-lead, nosotros historia+junta, proyectos) | Sí — con archivo, patrón actual y riesgo | §4 |
| Tokens de diseño existentes a reutilizar | Sí — color, tipografía, `ui/`, utilidades, tratamiento visual | §6 |
| Restricciones técnicas (Astro SSG, pnpm, sin backend previo) | Sí — + Tailwind 4 sin config JS, sin adaptador, Node 22 | §5 |
| 3 decisiones donde se juega el éxito | Sí — D1 frontera Luma/Supabase · D2 autoría + RLS · D3 render híbrido sin romper SSG | §7 |
| Puntos abiertos | Audios incorporados y rama confirmada (§8 A/B resueltos); queda 2FA (a decidir en Paso 2) y una nota sobre la guía | §8 |

**No se escribió código. No se propuso stack alternativo. Esperando tu visto bueno para pasar al Paso 2 (Diseño técnico).**
