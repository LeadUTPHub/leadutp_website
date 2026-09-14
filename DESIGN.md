# DESIGN.md — El panel se ve como el sitio, no como una herramienta aparte

> **No hay paleta, tipografía ni sistema de diseño nuevo.** Este documento solo inventaría los tokens que **ya existen** en el repo y dice cómo se aplican a cada pantalla del panel.
> Extraído en el Paso 1 (`docs/REQUISITOS_ADMIN.md` §6). Fuentes reales: `src/styles/global.css` (`@theme`), `src/components/ui/`, `src/components/layout/Navbar.astro`, `Footer.astro`, `src/components/home/HomePillars.astro`.
> Regla: si un color, fuente o medida no está en las tablas de §1–§4, **no se usa**.

## 1. Tokens de color (de `@theme` en `src/styles/global.css`)

| Token | Valor | Uso en el panel |
|---|---|---|
| `--color-primary` | `#020c3e` | Fondo de la barra superior del panel (igual que el Navbar sin scroll) |
| `--color-secondary` | `#d93340` | Acciones destructivas (borrar), `::selection`, badges de error |
| `--color-optional-3` | `#7856ee` | **Acción primaria** (guardar, crear, login) y **color de foco** — igual que el CTA del sitio |
| `--color-optional-1` | `#a6249d` | Badge informativo puntual |
| `--color-canvas` | `#060b24` | Fondo de página del panel |
| `--color-canvas-navy` | `#020c3e` | Franjas / cabeceras de sección |
| `--color-canvas-deep` | `#050814` | Menú lateral del panel, overlays |
| `--color-surface` | `rgb(255 255 255 / 0.045)` | Superficie de tarjetas y filas de tabla |
| `--color-surface-raised` | `rgb(255 255 255 / 0.075)` | Inputs, tarjeta activa/hover |
| `--color-border-subtle` | `rgb(255 255 255 / 0.1)` | Bordes de inputs, tarjetas, tablas |
| `--color-foreground` | `#ffffff` | Texto principal |
| `--color-foreground-secondary` | `rgb(255 255 255 / 0.8)` | Texto secundario, labels |
| `--color-foreground-muted` | `rgb(255 255 255 / 0.52)` | Placeholder, ayudas, metadatos |
| `--gradient-site` | radial violeta + degradé navy→canvas→deep | Fondo global (heredado del `body`, no se redefine) |
| `pillarGradients` (en `HomePillars.astro`, por slug) | 6 degradés `from-[…] to-[…]` | **Solo** para el chip/acento del área en listados (identifica el pilar de un contenido). Son placeholders (ver `PENDIENTES.md` §4): usar con moderación, nunca como fondo de pantalla |

**Tema:** el sitio es `color-scheme: dark` fijo. El panel también. No hay modo claro.

## 2. Tipografía

| Recurso | Valor | Uso en el panel |
|---|---|---|
| `--font-sans` / `font-sans` | Inter 300–900 | Todo el texto de interfaz (el `body` ya lo aplica) |
| `--font-display` / `font-display` | Geoform → Inter → system | Títulos de pantalla y de sección |
| Título de pantalla | `font-display text-2xl md:text-3xl font-semibold tracking-[-0.045em]` | igual que `SectionHeader.astro` |
| Título de sección/card | `font-display text-xl font-bold tracking-[-0.03em]` | igual que las tarjetas de `HomePillars` |
| Eyebrow / rótulo | `text-[0.7rem] font-bold tracking-[0.18em] uppercase` | encima de títulos |
| Label de formulario | `text-sm font-semibold text-foreground-secondary` | — |
| Ayuda / error de campo | `text-xs` (`text-foreground-muted` / `text-secondary`) | — |
| Badge | `text-[0.6875rem] font-bold tracking-[0.08em] uppercase` | estados (Borrador, Publicado) |

## 3. Componentes existentes — se reutilizan tal cual

| Componente | Ruta | Uso en el panel |
|---|---|---|
| `Button.astro` | `src/components/ui/` | Todas las acciones. `variant="primary"` guardar/crear/login · `variant="secondary"` borrar · `variant="outline"` cancelar/secundario · `variant="ghost"` acciones de fila · `size` `sm`/`md`/`lg` |
| `Badge.astro` | `src/components/ui/` | `tone="primary"` Borrador · `tone="optional"` Publicado · `tone="secondary"` Error/Atención |
| `Container.astro` | `src/components/ui/` | Ancho y gutters de cada vista (`max-w-7xl px-5 md:px-8 lg:px-10`) |
| `SectionHeader.astro` | `src/components/ui/` | Cabecera de cada sección del panel, con slot `action` para el botón "Nuevo" |
| `@lucide/astro` | — | Único set de iconos |

## 4. Patrones visuales existentes que el panel adopta

| Patrón | Definición (ya en el repo) | Dónde se usa en el panel |
|---|---|---|
| Superficie tipo tarjeta | `bg-white/[0.06]` + `ring-1 ring-white/12` (o `border border-white/10`), radios `rounded-2xl`/`rounded-lg`/`rounded-md` | Tarjetas de contenido, filas de tabla, modales |
| `.card-lift` | hover: borde `white/0.25` + `translateY(-2px)`; respeta `prefers-reduced-motion` | Filas/tarjetas clicables |
| `hairline-b` / `hairline-t` / `hairline-y` | Borde 1px que se desvanece a los lados | Separadores entre secciones del panel |
| `glow-heading` | Radial violeta tenue | Detrás del título de la pantalla de login |
| Foco | `outline: 3px solid var(--color-optional-3); outline-offset: 3px` | Todos los controles (heredado de `:focus-visible` global) |
| Barra superior | navy `--color-primary`, altura `4–5rem`, en scroll → cristal `rgb(2 12 62 / 0.62)` + `blur(16px)` | Cabecera del `AdminLayout` (misma sensación que el Navbar) |
| Transición de página | `view-transition` 300ms `cubic-bezier(0.4,0,0.2,1)` | Navegación dentro del panel |
| `prefers-reduced-motion` | Bloque global que anula animaciones | Respetado por todo el panel |

## 5. Controles de formulario (nuevos, pero solo con tokens existentes)

No hay componente de input en `src/components/ui/` todavía. Se crea `src/components/admin/Field.astro` (input/textarea/select) construido **únicamente** con:

| Elemento | Clases (todas de tokens existentes) |
|---|---|
| `input` / `textarea` / `select` | `w-full rounded-md bg-white/[0.06] ring-1 ring-white/12 px-3 min-h-11 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-optional-3` |
| Estado inválido | `ring-secondary/50` + mensaje `text-xs text-secondary` |
| Label | `text-sm font-semibold text-foreground-secondary` |
| Checkbox/switch | acento `--color-optional-3` |

> `Field.astro` es un envoltorio de consistencia, **no** un nuevo sistema. Si el sitio público llegara a necesitar inputs, este componente sería el candidato a promover a `src/components/ui/`.

## 6. Pantalla por pantalla

### 6.1 `/administrator/login`
| Aspecto | Aplicación |
|---|---|
| Layout | Centrado, `Container` estrecho (`max-w-sm`), fondo `--gradient-site` heredado, `glow-heading` detrás del título |
| Contenido | Logo (`src/assets/brand/lead-utp-logo.png`, ya existe) · título `font-display` "Panel LEAD UTP" · `Field` usuario · `Field` contraseña · `Button variant="primary" size="lg"` "Entrar" |
| Errores | Un solo mensaje genérico `text-sm text-secondary` ("Usuario o contraseña incorrectos"), sin filtrar cuál falló |
| Sin | enlace a "olvidé contraseña" en esta fase (reset lo hace el super_admin); sin link de vuelta al sitio |

### 6.2 `/administrator` (dashboard)
| Aspecto | Aplicación |
|---|---|
| `AdminLayout` | Barra superior navy con logo + nombre del usuario + `Button ghost` "Salir". Navegación lateral (`--color-canvas-deep`) con iconos lucide: Eventos, Eventos pasados, Páginas, (Usuarios solo super_admin) |
| Cuerpo | `SectionHeader` "Hola, {nombre}" + `Badge` con el rol + área. Tarjetas de acceso rápido (`.card-lift`) a cada módulo con conteo |
| Vacío | Si el usuario no tiene nada creado: tarjeta guía "Empieza subiendo tu primer evento" (flujo primera vez, Sprint 6) |

### 6.3 `/administrator/eventos` (punteros a Luma)
| Aspecto | Aplicación |
|---|---|
| Cabecera | `SectionHeader` "Eventos" + slot `action`: `Button primary` "Nuevo evento" |
| Lista | Filas tipo tarjeta (`bg-white/[0.06] ring-1 ring-white/12 rounded-lg`): título, chip de área (color del pilar), `Badge` Borrador/Publicado, acciones `ghost` (Editar, Abrir en Luma, Borrar) |
| Form | `Field` título · `Field` URL de Luma (con validación visible) · `Field` fecha/hora · `Field` ubicación · `Field` imagen (URL) · `textarea` descripción corta (máx. 280) · `select` de pilar · switch `featured` · switch `published` · `Button primary` Guardar / `Button outline` Cancelar |
| Aviso | Nota fija: "La inscripción y el cupo se gestionan en Luma — el link de arriba lleva ahí. El resto de la tarjeta (fecha, ubicación, imagen, descripción) lo cargas tú." |

### 6.4 `/administrator/eventos-pasados` ("así se vivió el evento")
| Aspecto | Aplicación |
|---|---|
| Lista | Igual patrón que 6.3, con miniatura (primera foto, `buildCloudinaryUrl(publicId, 160)`) |
| Editor | `Field` título/slug · `textarea` cuerpo (markdown) · `Field` fecha · `select` pilar · zona de subida: drop de imágenes → barra de progreso (`--color-optional-3`) → grid de miniaturas reordenable (drag) con `alt` editable y botón borrar |
| Estados | Subiendo (progreso) · error de una foto (`ring-secondary/50` + reintentar) · Cloudinary caído (zona deshabilitada + "El texto sí se guarda") |

### 6.5 `/administrator/paginas` (Nosotros / Proyectos)
| Aspecto | Aplicación |
|---|---|
| Navegación | Tabs (`hairline-b`) por `key`: Junta directiva · Proyectos (Historia se sacó el 2026-09-14, D-18 — queda fija en `about.data.ts`, sin UI) |
| Junta | lista repetible de `{ name, role }` con `Field` × 2 y botón añadir/quitar fila |
| Proyectos | lista repetible de `{ name, description, status, link? }`; `status` = `select` (`activo`/`finalizado`/`planificado`) |
| Publicar | switch `published` por bloque + aviso "Borrador no se ve en la web" |

### 6.6 `/administrator/usuarios` (solo `super_admin`)
| Aspecto | Aplicación |
|---|---|
| Lista | Tabla: nombre, email, `Badge` rol, chip de área, activo/inactivo, acciones |
| Alta | `Field` email · `Field` nombre · `select` rol · `select` área (oculto si rol = super_admin) · `Button primary` "Invitar" |
| Visibilidad | El ítem "Usuarios" de la navegación no se renderiza para director/subdirector |

## 7. Qué NO hacer

- Introducir un color hex que no esté en §1 (ni "solo para un borde").
- Usar una fuente que no sea Inter / Geoform.
- Un modo claro / fondo blanco propio del panel (el iframe de Luma será blanco por ser cross-origin; eso es de Luma, no del panel).
- Componentes de librerías de UI (shadcn, DaisyUI, etc.).
- Animaciones que no respeten `prefers-reduced-motion`.
