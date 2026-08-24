# Pendientes — LEAD UTP Website

> Última actualización: 2026-08-24

Lista de tareas abiertas para seguir avanzando en el sitio. Para contexto general del stack y la estructura del proyecto, ver [`CONTEXT.md`](./CONTEXT.md).

## Alta prioridad

### 1. Contenido real para `/nosotros`, `/proyectos` y `/convocatorias`

Estas 3 rutas ya existen pero muestran un placeholder "Próximamente" (componente `src/components/ui/ComingSoon.astro`), porque los CTAs del home y el Navbar apuntaban a páginas que no existían.

- `src/pages/nosotros.astro` — falta: misión, historia, equipo/junta directiva.
- `src/pages/proyectos.astro` — falta: lista de proyectos/iniciativas de la comunidad (nombre, descripción, estado, quizás imagen).
- `src/pages/convocatorias.astro` — falta: convocatorias abiertas (rol, requisitos, fecha límite, link de postulación).

**Cómo encararlo:** si el contenido es una lista repetible (varios proyectos, varias convocatorias), seguir el patrón ya usado en `src/data/pillars/` y `src/data/events/` — un archivo `.data.ts` tipado + un componente que itera sobre los items. Si es contenido único (ej. "Sobre nosotros"), se puede escribir directo en la página como `src/pages/pilares/index.astro`.

Una vez haya contenido real, reemplazar `<ComingSoon ... />` por las secciones definitivas en cada página.

### 2. ESLint + Prettier

El repo no tiene linter ni formateador configurado. Con más de una persona tocando el código, esto evita diffs de formato ruidosos en los PRs.

- Agregar `eslint` + `eslint-plugin-astro` + `@typescript-eslint`.
- Agregar `prettier` + `prettier-plugin-astro` + `prettier-plugin-tailwindcss` (para ordenar clases de Tailwind).
- Agregar scripts `lint` y `format` a `package.json`.

## Media prioridad

### 3. Imágenes placeholder en pilares y eventos

Buscar el flag `imageIsTemporary: true` en:
- `src/data/pillars/pillars.data.ts`
- `src/data/events/events.data.ts`

Reemplazar por fotos reales y quitar el flag (se usa para mostrar un aviso visual de que la imagen es temporal — ver `imageIsTemporary` en los componentes de media).

### 4. Imagen social (OG) por página

Hoy todo el sitio comparte una sola `public/og-image.png` (definida en `Layout.astro`). Las páginas de pilares y eventos individuales podrían tener su propia imagen al compartirse en redes.

### 5. Tests para la lógica de fechas de eventos

`src/data/events/events.utils.ts` tiene funciones como `getUpcomingEvents`, `getPastEvents`, `getFeaturedEvent` que dependen de comparar fechas. No hay ningún test runner en el proyecto — si esta lógica falla silenciosamente, un evento puede aparecer en la sección equivocada sin que nadie lo note. Vale la pena agregar Vitest + un par de casos de prueba ahí.

## Baja prioridad / decisiones a futuro

### 6. ¿CMS o seguir con archivos `.data.ts`?

Todo el contenido (pilares, eventos, home) vive como datos tipados en `src/data/`, no en un CMS. Funciona bien mientras el equipo sea técnico y los cambios sean poco frecuentes. Si alguien no-dev va a cargar contenido seguido (sobre todo convocatorias, que cambian por temporada), evaluar migrar a un CMS headless.

### 7. Dominio propio

El sitio sigue en `leadutp.vercel.app`. Definir y conectar un dominio propio cuando esté disponible.

## Dónde preguntar

Si algo de esta lista ya se resolvió o quedó desactualizado, revisar `git log` o marcarlo como hecho acá mismo.
