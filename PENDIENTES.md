# Pendientes — LEAD UTP Website

> Última actualización: 2026-08-25

Lista de tareas abiertas para seguir avanzando en el sitio. Para contexto general del stack y la estructura del proyecto, ver [`CONTEXT.md`](./CONTEXT.md).

## Alta prioridad

### 1. `events.data.ts` son 22 eventos de ejemplo, no reales

Revisando las carpetas `public/imagestest/2025/` y `2026/` para armar `/vida-lead` note que **ninguno** de los eventos en `src/data/events/events.data.ts` es real: fechas inventadas, `registrationUrl` apuntando a `https://example.com/registro-lead/...`, y varios marcados `imageIsTemporary: true`. Sirvió para construir la UI de `/eventos`, pero si se despliega tal cual a producción se le mostraría a un visitante una agenda y links de registro ficticios. Hay que reemplazar cada entrada por eventos reales (fecha, hora, ubicación, link de registro) antes de lanzar, o al menos dejar el array vacío/con avisos claros mientras tanto.

### 2. Contenido real para `/nosotros`, `/proyectos` y `/convocatorias`

Ya no son placeholders "Próximamente": las 3 páginas tienen su diseño y estructura de datos definitivos, siguiendo el mismo patrón `.data.ts` tipado que `src/data/pillars/` y `src/data/events/`. Solo falta reemplazar los textos marcados `[Contenido pendiente]` por la información real:

- `src/data/about/about.data.ts` — misión, visión, historia y junta directiva (`team: []`).
- `src/data/projects/projects.data.ts` — lista de proyectos/iniciativas (nombre, descripción, estado, link opcional).
- `src/data/openings/openings.data.ts` — convocatoria(s) abiertas (rol, requisitos, fecha límite, link de postulación). Si no hay ninguna abierta, dejar el array vacío — la página ya maneja ese estado sin usar `ComingSoon`.

No hace falta tocar los `.astro` de `src/pages/` ni los componentes visuales para cargar el contenido real, solo esos 3 archivos `.data.ts`.

## Media prioridad

### 3. Imágenes placeholder en pilares y eventos

Buscar el flag `imageIsTemporary: true` en:

- `src/data/pillars/pillars.data.ts`
- `src/data/events/events.data.ts`

Reemplazar por fotos reales y quitar el flag (se usa para mostrar un aviso visual de que la imagen es temporal — ver `imageIsTemporary` en los componentes de media). Si alguno de esos eventos de ejemplo termina correspondiendo a un evento real de `public/imagestest/`, se puede reutilizar esa foto (ver punto 1).

### 4. Imagen social (OG) por página

Hoy todo el sitio comparte una sola `public/og-image.png` (definida en `Layout.astro`). Las páginas de pilares y eventos individuales podrían tener su propia imagen al compartirse en redes.

### 5. Carpeta internacional sin país confirmado

`public/imagestest/internacional_leadutp/16_aI_hackaton_lizbeth/` (AI Hackathon) quedó fuera de `/internacional` porque no se confirmó el país. Cuando se sepa, agregar una entrada en `src/data/international/international.data.ts`.

### 6. Fechas reales para los eventos de `/vida-lead`

`src/data/life/life.data.ts` solo tiene el año de cada evento (2025/2026), no la fecha exacta, porque no la tengo confirmada. Si se consigue la fecha real de cada uno, se puede mostrar más detalle en `/vida-lead` y, si tiene sentido, fusionar esos eventos con `events.data.ts` (ver punto 1) en vez de mantener dos listados separados.

### 7. Foto real para el hero de la home

`homeHeroMedia` en `src/data/home/home.data.ts` sigue vacío (`{}`); solo se completaron los 3 "momentos" de la sección Vida LEAD con fotos de `public/imagestest/2025/`.

## Baja prioridad / decisiones a futuro

### 8. ¿CMS o seguir con archivos `.data.ts`?

Todo el contenido (pilares, eventos, home, nosotros, proyectos, convocatorias, internacional, vida LEAD) vive como datos tipados en `src/data/`, no en un CMS. Funciona bien mientras el equipo sea técnico y los cambios sean poco frecuentes. Si alguien no-dev va a cargar contenido seguido (sobre todo convocatorias, que cambian por temporada), evaluar migrar a un CMS headless.

### 9. Dominio propio

El sitio sigue en `leadutp.vercel.app`. Definir y conectar un dominio propio cuando esté disponible.

## Dónde preguntar

Si algo de esta lista ya se resolvió o quedó desactualizado, revisar `git log` o marcarlo como hecho acá mismo.
