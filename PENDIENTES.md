# Pendientes — LEAD UTP Website

> Última actualización: 2026-09-08

Lista de tareas abiertas para seguir avanzando en el sitio. Para contexto general del stack y la estructura del proyecto, ver [`CONTEXT.md`](./CONTEXT.md).

## Alta prioridad

### 1. `events.data.ts` son 22 eventos de ejemplo, no reales

**Sigue sin resolverse a propósito**: la directiva todavía no confirmó los eventos reales (fecha, hora, ubicación, link de registro), así que por ahora se decidió no tocar este archivo — ni vaciarlo ni reemplazarlo — para no perder la estructura de referencia mientras se espera esa información. Ninguno de los eventos en `src/data/events/events.data.ts` es real: fechas inventadas, `registrationUrl` apuntando a `https://example.com/registro-lead/...`, y varios marcados `imageIsTemporary: true`. Sirvió para construir la UI de `/eventos`, pero **no se puede desplegar tal cual a producción**: le mostraría a un visitante una agenda y links de registro ficticios. En cuanto la directiva confirme los eventos reales, reemplazar cada entrada (o vaciar el array y dejar que `/eventos` muestre su estado vacío, igual que ya hacen `/proyectos` y `/convocatorias` — ver punto 2).

### 2. Contenido real para `/nosotros` y `/proyectos`

La directiva todavía no confirmó este contenido. A diferencia del punto 1, acá **ya no hay marcadores `[Contenido pendiente]` ni nombres falsos visibles en producción** — se optó por dejar los datos vacíos y que cada página muestre un estado vacío cuidado hasta tener la información real:

- `src/data/about/about.data.ts` — misión, visión y valores ya son reales. `history` quedó sin definir (opcional) y `team: []`; `/nosotros` oculta las secciones "Historia" y "Junta directiva" mientras estén vacías.
- `src/data/projects/projects.data.ts` — `projects: []`; `/proyectos` muestra un mensaje de "todavía no publicamos proyectos" en vez de una lista vacía.

Apenas la directiva confirme la información real, solo hace falta completar esos 2 archivos `.data.ts` (historia + junta directiva, lista de proyectos) — no hace falta tocar los `.astro` de `src/pages/` ni los componentes visuales.

`/convocatorias` **ya no está en esta lista**: tiene una convocatoria real ("Voluntariado 2026 - 2") con su Google Form embebido — ver `src/data/openings/openings.data.ts` y el punto 14.

## Media prioridad

### 3. Imágenes placeholder en pilares y eventos

Buscar el flag `imageIsTemporary: true` en:

- `src/data/pillars/pillars.data.ts` (los 6 pilares)
- `src/data/events/events.data.ts` (dentro de los eventos de ejemplo del punto 1)

Reemplazar por fotos reales y quitar el flag (se usa para mostrar un aviso visual de que la imagen es temporal — ver `imageIsTemporary` en los componentes de media). Si alguno de esos eventos de ejemplo termina correspondiendo a un evento real de `public/images/`, se puede reutilizar esa foto (ver punto 1).

### 4. Colores placeholder en los cuadros de "Nuestros pilares" del home

Los 6 cuadros de pilares en la home (`src/components/home/HomePillars.astro`) ahora tienen un degradé de color distinto cada uno, inspirado en el mismo tratamiento de la página anterior de LEAD. Esos colores viven en el mapa `pillarGradients` dentro del propio componente (por slug, no por `tone` — ese campo se reutiliza entre pilares en `pillars.data.ts` y no alcanza para 6 colores únicos). Son placeholders elegidos solo para diferenciarlos a simple vista; reemplazar por la paleta real de cada pilar en cuanto la directiva la defina.

### 5. Imagen social (OG) por página

Parcialmente resuelto: `Layout.astro` acepta un `image` por página, y `/pilares/[slug]` ya la pasa automáticamente cuando el pilar tiene una foto real (`!pillar.imageIsTemporary`) — mientras tanto sigue usando el `og-image.png` global, sin necesitar más cambios cuando lleguen las fotos reales (ver punto 3). Queda pendiente aplicar el mismo patrón en `/eventos` (usando la imagen del evento destacado) — se armó una vez en sesión pero se revirtió a pedido para no tocar la estructura de esa página por ahora.

### 6. Carpeta internacional sin país confirmado

`public/images/internacional_leadutp/16_aI_hackaton_lizbeth/` (AI Hackathon) quedó fuera de `/internacional` porque no se confirmó el país. Cuando se sepa, agregar una entrada en `src/data/international/international.data.ts`.

### 7. Fechas reales para los eventos de `/vida-lead`

`src/data/life/life.data.ts` solo tiene el año de cada evento (2025/2026), no la fecha exacta, porque no la tengo confirmada. Si se consigue la fecha real de cada uno, se puede mostrar más detalle en `/vida-lead`. Ojo: no fusionar directamente con `events.data.ts` (punto 1) sin más — ese archivo modela eventos con fecha exacta (día, hora) para agenda/registro, mientras que `life.data.ts` es un archivo de fecha aproximada (año) para el álbum de fotos; forzar el mismo esquema implicaría inventar un día exacto que no es real.

### 8. Foto real para el hero de la home

`homeHeroMedia` en `src/data/home/home.data.ts` sigue vacío (`{}`). Hoy no es urgente: `homeHeroSlides` ya cubre el hero con un carrusel de fotos reales de `public/images/`. Completar `homeHeroMedia` solo si se quiere volver a un hero de foto fija en vez de carrusel.

### 9. Página `/alianzas`

La Home tenía un link "Conoce nuestras alianzas" apuntando a `/alianzas`, ruta que nunca existió; se quitó el link (`HomeAlliances.astro`) para no dejar un 404 en producción. A diferencia de cuando se escribió esto la primera vez, **ya hay una lista real de 7 alianzas con logo** en `homeAlliances` (`src/data/home/home.data.ts`): IBM Z, CONEII, AEDITIP, CV Matcher, Face to Face, Levo Learning y DSC UTP. Ya no falta juntar datos — solo crear la página `/alianzas` siguiendo el mismo patrón que `/nosotros`/`/proyectos` (o una versión ampliada de `HomeAlliances.astro`) y volver a agregar el link.

## Baja prioridad / decisiones a futuro

### 10. ¿CMS o seguir con archivos `.data.ts`?

Todo el contenido (pilares, eventos, home, nosotros, proyectos, convocatorias, internacional, vida LEAD) vive como datos tipados en `src/data/`, no en un CMS. Funciona bien mientras el equipo sea técnico y los cambios sean poco frecuentes. Si alguien no-dev va a cargar contenido seguido (sobre todo convocatorias, que cambian por temporada), evaluar migrar a un CMS headless.

### 11. Dominio propio

El sitio sigue en `leadutp.vercel.app`. Definir y conectar un dominio propio cuando esté disponible.

### 12. Formato desactualizado en algunos archivos

`pnpm format:check` marca 7 archivos que no coinciden con el Prettier instalado hoy (`HomeHero.astro`, `HomeHeroCarousel.astro`, `404.astro`, `eventos.astro`, `internacional.astro`, `pilares/index.astro`, `vida-lead.astro`) — parece un desfase de versión de Prettier/plugins desde la última vez que se formatearon, no algo introducido ahora. Correr `pnpm format` cuando se vaya a tocar alguno de esos archivos igual, para no mezclar un reformateo grande con un cambio de contenido puntual (así se hizo con `HomeAlliances.astro` y `convocatorias.astro`, que ya salieron de esta lista).

### 13. Logos de alianzas: ¿monocromo blanco como en la página anterior?

La página anterior de LEAD UTP le aplica a cada logo del marquee un filtro `brightness(0) invert(1)` (los vuelve blancos, sin color) para que la franja se vea uniforme en vez de competir con los colores de cada marca. Acá se agrandaron los logos y se igualó el ritmo del marquee (ver `src/components/home/HomeAlliances.astro`), pero se dejaron con su color original a propósito, por no ser parte de lo pedido. Si se quiere ese mismo tratamiento monocromo, es un filtro CSS en el `<Image>` del marquee.

### 14. Google Form embebido en `/convocatorias`

`openings.data.ts` soporta `embedForm: true` para embeber el `applyUrl` (debe ser un Google Form) como iframe directamente en la página, en vez de solo linkear afuera — ver `getEmbeddedFormUrl()` en `openings.utils.ts`. Cosas a tener en cuenta:

- El iframe de Google Forms siempre se ve con fondo blanco — no hay forma de que herede los colores oscuros del sitio (es contenido de otro origen). El ancho se limitó a ~380px (columna derecha) para que no sobre blanco de más a los costados; el blanco del formulario en sí no se puede evitar.
- Layout actual (2026-09-08): el texto (título, resumen, requisitos, fecha límite) va en una tarjeta a la izquierda y el formulario a la derecha, en un grid `lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]` — en mobile se apilan (texto arriba, form abajo). La tarjeta de texto usa `lg:flex lg:h-full lg:flex-col` + `lg:mt-auto` en la fecha límite para estirarse y calzar con la altura del form automáticamente, sin números fijos que haya que reajustar a mano.
- La altura del iframe está fija (520px / 600px en `sm:`) con scroll interno propio de Google Forms; si el formulario real crece o se acorta mucho, ajustar esos valores en `convocatorias.astro`.
- Cuando se cierre esta convocatoria o cambie el link, actualizar `applyUrl` (y `role`/`summary`/`requirements` si corresponde) en `openings.data.ts`, o volver a dejar el array vacío si no hay ninguna abierta.

## Dónde preguntar

Si algo de esta lista ya se resolvió o quedó desactualizado, revisar `git log` o marcarlo como hecho acá mismo.
