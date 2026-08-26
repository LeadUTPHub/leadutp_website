# Pendientes — LEAD UTP Website

> Última actualización: 2026-08-25

Lista de tareas abiertas para seguir avanzando en el sitio. Para contexto general del stack y la estructura del proyecto, ver [`CONTEXT.md`](./CONTEXT.md).

## Alta prioridad

### 1. Contenido real para `/nosotros`, `/proyectos` y `/convocatorias`

Ya no son placeholders "Próximamente": las 3 páginas tienen su diseño y estructura de datos definitivos, siguiendo el mismo patrón `.data.ts` tipado que `src/data/pillars/` y `src/data/events/`. Solo falta reemplazar los textos marcados `[Contenido pendiente]` por la información real:

- `src/data/about/about.data.ts` — misión, visión, historia y junta directiva (`team: []`).
- `src/data/projects/projects.data.ts` — lista de proyectos/iniciativas (nombre, descripción, estado, link opcional).
- `src/data/openings/openings.data.ts` — convocatoria(s) abiertas (rol, requisitos, fecha límite, link de postulación). Si no hay ninguna abierta, dejar el array vacío — la página ya maneja ese estado sin usar `ComingSoon`.

No hace falta tocar los `.astro` de `src/pages/` ni los componentes visuales para cargar el contenido real, solo esos 3 archivos `.data.ts`.

## Media prioridad

### 2. Imágenes placeholder en pilares y eventos

Buscar el flag `imageIsTemporary: true` en:

- `src/data/pillars/pillars.data.ts`
- `src/data/events/events.data.ts`

Reemplazar por fotos reales y quitar el flag (se usa para mostrar un aviso visual de que la imagen es temporal — ver `imageIsTemporary` en los componentes de media).

### 3. Imagen social (OG) por página

Hoy todo el sitio comparte una sola `public/og-image.png` (definida en `Layout.astro`). Las páginas de pilares y eventos individuales podrían tener su propia imagen al compartirse en redes.

### 4. Tests para la lógica de fechas de eventos

`src/data/events/events.utils.ts` tiene funciones como `getUpcomingEvents`, `getPastEvents`, `getFeaturedEvent` que dependen de comparar fechas. No hay ningún test runner en el proyecto — si esta lógica falla silenciosamente, un evento puede aparecer en la sección equivocada sin que nadie lo note. Vale la pena agregar Vitest + un par de casos de prueba ahí.

### 5. Gestor de paquetes duplicado

El repo tiene `package-lock.json` (npm) y también `pnpm-lock.yaml` + `pnpm-workspace.yaml`, pero `node_modules` está instalado con npm (no hay carpeta `.pnpm`). Los archivos de pnpm están huérfanos — conviene eliminarlos para evitar que alguien instale con el gestor equivocado y genere un lockfile desincronizado.

### 6. Carpeta internacional sin país confirmado

`public/imagestest/internacional_leadutp/16_aI_hackaton_lizbeth/` (AI Hackathon) quedó fuera de `/internacional` porque no se confirmó el país. Cuando se sepa, agregar una entrada en `src/data/international/international.data.ts`.

## Baja prioridad / decisiones a futuro

### 7. ¿CMS o seguir con archivos `.data.ts`?

Todo el contenido (pilares, eventos, home, nosotros, proyectos, convocatorias, internacional) vive como datos tipados en `src/data/`, no en un CMS. Funciona bien mientras el equipo sea técnico y los cambios sean poco frecuentes. Si alguien no-dev va a cargar contenido seguido (sobre todo convocatorias, que cambian por temporada), evaluar migrar a un CMS headless.

### 8. Dominio propio

El sitio sigue en `leadutp.vercel.app`. Definir y conectar un dominio propio cuando esté disponible.

## Dónde preguntar

Si algo de esta lista ya se resolvió o quedó desactualizado, revisar `git log` o marcarlo como hecho acá mismo.
