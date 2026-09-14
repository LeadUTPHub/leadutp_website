# Pendientes — LEAD UTP Website

> Última actualización: 2026-09-14

Lista de tareas abiertas para seguir avanzando en el sitio. Para contexto general del stack y la estructura del proyecto, ver [`CONTEXT.md`](./CONTEXT.md).

## Alta prioridad

### 1. ✅ RESUELTO — `events.data.ts` con 22 eventos de ejemplo

**Resuelto desde Sprint 1** (2026-09-10), y reforzado por el panel de administración desde entonces. `events.data.ts` está vacío a propósito (`events.utils.ts` se conserva porque lo sigue usando `/pilares/[slug]`) — los eventos reales de `/eventos` ya no viven en un `.data.ts` en absoluto: cada director/subdirector los carga desde `/administrator/eventos` (tarjeta con link de inscripción propio a Luma) y `/administrator/eventos-pasados` (fotos de eventos ya realizados). Ver `CONTEXT.md` § Panel de administración y `MEMORY.md` D-16 (el embed genérico de Luma que reemplazó esto en Sprint 1 también se quitó el 2026-09-14 — ahora es solo las tarjetas curadas). Este punto se deja documentado por historial, no porque siga abierto.

### 2. Contenido real para `/nosotros` y `/proyectos`

La directiva todavía no confirmó este contenido — pero desde el 2026-09-14 el *cómo* se completa cambió:

- **Junta directiva** (`/nosotros`) y **lista de proyectos** (`/proyectos`) — la presidencia (`super_admin`) las publica desde `/administrator/paginas` cuando la directiva confirme los datos. `src/data/about/about.data.ts` (`team: []`) y `src/data/projects/projects.data.ts` (`projects: []`) quedan solo como *fallback* mientras no se haya publicado nada desde el panel — no hace falta editarlos a mano si se va a usar el panel.
- **Historia** (`/nosotros`) — decisión explícita: se queda **fija en código**, editable solo por quien toque `src/data/about/about.data.ts` (`history` sin definir hoy). No hay ni va a haber una UI de panel para esto — es la única de las tres piezas que NO sigue el patrón "panel primero, `.data.ts` de respaldo".

Misión, visión, valores y acrónimo ya son reales y siguen viniendo siempre de `about.data.ts` — nunca del panel, no están en esta lista de pendientes.

`/nosotros` y `/proyectos` ocultan sus secciones vacías (Historia, Junta directiva, lista de proyectos) mientras no haya contenido, igual que antes.

`/convocatorias` **ya no está en esta lista**: tiene una convocatoria real ("Voluntarios 2026 - 2") con su Google Form embebido — ver `src/data/openings/openings.data.ts` y el punto 14.

## Media prioridad

### 3. Imágenes placeholder en pilares y eventos

Buscar el flag `imageIsTemporary: true` en `src/data/pillars/pillars.data.ts` (los 6 pilares) y reemplazar por fotos reales cuando la directiva las confirme (se usa para mostrar un aviso visual de que la imagen es temporal — ver `imageIsTemporary` en los componentes de media). `events.data.ts` ya no aplica acá — está vacío desde que se resolvió el punto 1; las imágenes de eventos reales ahora se cargan por evento desde `/administrator/eventos`, no tienen este flag.

### 4. Colores placeholder en los cuadros de "Nuestros pilares" del home

Los 6 cuadros de pilares en la home (`src/components/home/HomePillars.astro`) ahora tienen un degradé de color distinto cada uno, inspirado en el mismo tratamiento de la página anterior de LEAD. Esos colores viven en el mapa `pillarGradients` dentro del propio componente (por slug, no por `tone` — ese campo se reutiliza entre pilares en `pillars.data.ts` y no alcanza para 6 colores únicos). Son placeholders elegidos solo para diferenciarlos a simple vista; reemplazar por la paleta real de cada pilar en cuanto la directiva la defina.

### 5. Imagen social (OG) por página

Parcialmente resuelto: `Layout.astro` acepta un `image` por página, y `/pilares/[slug]` ya la pasa automáticamente cuando el pilar tiene una foto real (`!pillar.imageIsTemporary`) — mientras tanto sigue usando el `og-image.png` global, sin necesitar más cambios cuando lleguen las fotos reales (ver punto 3). Queda pendiente aplicar el mismo patrón en `/eventos` (usando la imagen de algún puntero publicado) — se armó una vez en sesión pero se revirtió a pedido para no tocar la estructura de esa página por ahora. Nota: desde el cambio de alcance del 2026-09-14 (`MEMORY.md` D-16), "eventos destacado" ya no es un concepto de esa página — habría que elegir otro criterio (¿el más próximo?, ¿el primero publicado?).

### 6. Carpeta internacional sin país confirmado

`public/images/internacional_leadutp/16_aI_hackaton_lizbeth/` (AI Hackathon) quedó fuera de `/internacional` porque no se confirmó el país. Cuando se sepa, agregar una entrada en `src/data/international/international.data.ts`.

### 7. Fechas reales para los eventos de `/vida-lead`

`src/data/life/life.data.ts` solo tiene el año de cada evento (2025/2026), no la fecha exacta, porque no la tengo confirmada. Si se consigue la fecha real de cada uno, se puede mostrar más detalle en `/vida-lead`. Ojo: no fusionar directamente con `events.data.ts` (punto 1) sin más — ese archivo modela eventos con fecha exacta (día, hora) para agenda/registro, mientras que `life.data.ts` es un archivo de fecha aproximada (año) para el álbum de fotos; forzar el mismo esquema implicaría inventar un día exacto que no es real.

### 8. Foto real para el hero de la home

`homeHeroMedia` en `src/data/home/home.data.ts` sigue vacío (`{}`). Hoy no es urgente: `homeHeroSlides` ya cubre el hero con un carrusel de fotos reales de `public/images/`. Completar `homeHeroMedia` solo si se quiere volver a un hero de foto fija en vez de carrusel.

### 9. Página `/alianzas`

La Home tenía un link "Conoce nuestras alianzas" apuntando a `/alianzas`, ruta que nunca existió; se quitó el link (`HomeAlliances.astro`) para no dejar un 404 en producción. A diferencia de cuando se escribió esto la primera vez, **ya hay una lista real de 7 alianzas con logo** en `homeAlliances` (`src/data/home/home.data.ts`): IBM Z, CONEII, AEDITIP, CV Matcher, Face to Face, Levo Learning y DSC UTP. Ya no falta juntar datos — solo crear la página `/alianzas` siguiendo el mismo patrón que `/nosotros`/`/proyectos` (o una versión ampliada de `HomeAlliances.astro`) y volver a agregar el link.

## Baja prioridad / decisiones a futuro

### 10. ¿CMS o seguir con archivos `.data.ts`? — parcialmente resuelto

**Resuelto para eventos, junta directiva y proyectos**: desde el panel de administración (`/administrator`, ver `CONTEXT.md`), directores/subdirectores y la presidencia cargan ese contenido sin tocar código — un backend custom sobre Supabase, no un CMS headless de terceros (decisión ya tomada, ver `docs/GUIA_METODOLOGIA_ADMIN.md`). **Sigue sin CMS** el resto: pilares, home, convocatorias, internacional, vida LEAD — viven como datos tipados en `src/data/`. Funciona bien mientras esos cambios sean poco frecuentes y alguien técnico los edite; si algún no-dev necesita cargar seguido alguno de estos (sobre todo convocatorias, que cambian por temporada), evaluar extenderles el mismo patrón del panel en vez de un CMS headless aparte.

### 11. Dominio propio

El sitio sigue en `leadutp.vercel.app`. Definir y conectar un dominio propio cuando esté disponible.

### 12. Formato desactualizado en muchos archivos

`pnpm format:check` marca **102 archivos** que no coinciden con el Prettier instalado hoy (subió de 7 a esta cifra entre el 2026-09-08 y el cierre de Sprint 6, 2026-09-14 — la mayoría son archivos de sprints anteriores del panel de administración que nunca pasaron por `pnpm format`, no un desfase de versión puntual como se pensaba al escribir esto la primera vez). Sigue sin ser urgente ni algo para corregir de una sola vez: reformatear 100+ archivos de golpe mezclaría un diff enorme sin cambio de contenido con el trabajo real de cualquier PR. Se sigue aplicando el mismo criterio de antes — correr `pnpm format` (o `pnpm exec prettier --write <archivo>`) solo sobre los archivos que se vayan a tocar de todos modos, nunca un reformateo masivo aparte. Sprint 6 (T6.6) formateó los ~15 archivos que tocó esa sesión; quedan los demás.

### 13. Logos de alianzas: ¿monocromo blanco como en la página anterior?

La página anterior de LEAD UTP le aplica a cada logo del marquee un filtro `brightness(0) invert(1)` (los vuelve blancos, sin color) para que la franja se vea uniforme en vez de competir con los colores de cada marca. Acá se agrandaron los logos y se igualó el ritmo del marquee (ver `src/components/home/HomeAlliances.astro`), pero se dejaron con su color original a propósito, por no ser parte de lo pedido. Si se quiere ese mismo tratamiento monocromo, es un filtro CSS en el `<Image>` del marquee.

### 14. Google Form embebido en `/convocatorias`

`openings.data.ts` soporta `embedForm: true` para embeber el `applyUrl` (debe ser un Google Form) como iframe directamente en la página, en vez de solo linkear afuera — ver `getEmbeddedFormUrl()` en `openings.utils.ts`. Cosas a tener en cuenta:

- El iframe de Google Forms siempre se ve con fondo blanco — no hay forma de que herede los colores oscuros del sitio (es contenido de otro origen). El ancho se limitó a ~380px (columna derecha) para que no sobre blanco de más a los costados; el blanco del formulario en sí no se puede evitar.
- Layout actual (2026-09-08): el texto (título, resumen, requisitos, fecha límite) va en una tarjeta a la izquierda y el formulario a la derecha, en un grid `lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]` — en mobile se apilan (texto arriba, form abajo). La tarjeta de texto usa `lg:flex lg:h-full lg:flex-col` + `lg:mt-auto` en la fecha límite para estirarse y calzar con la altura del form automáticamente, sin números fijos que haya que reajustar a mano.
- La altura del iframe está fija (520px / 600px en `sm:`) con scroll interno propio de Google Forms; si el formulario real crece o se acorta mucho, ajustar esos valores en `convocatorias.astro`.
- Cuando se cierre esta convocatoria o cambie el link, actualizar `applyUrl` (y `role`/`summary`/`requirements` si corresponde) en `openings.data.ts`, o volver a dejar el array vacío si no hay ninguna abierta.

### 15. Contraste de `--color-secondary` (rojo) por debajo de AA para texto normal

Calculado en la auditoría de accesibilidad del panel de administración (T6.4, Sprint 6, `MEMORY.md` L34): `--color-secondary` (`#d93340`, texto de error/borrar) sobre `--color-canvas` (`#060b24`) da ~4.16:1 de contraste — WCAG AA exige 4.5:1 para texto normal (sí pasa el 3:1 de texto grande). Es un token compartido con **todo el sitio público**, no algo introducido por el panel — cambiarlo afecta badges de error, mensajes de validación, etc. en todas las páginas, no solo `/administrator`. Verificar con un contraste-checker real (el cálculo fue manual, con la fórmula de luminancia de WCAG) y decidir si vale la pena ajustar el tono — es una decisión de paleta/marca, no un bug puntual.

### 16. Rediseño visual de la tarjeta de "Eventos pasados"

Anotado explícitamente por el PO al cerrar el cambio de alcance que renombró "Galerías" a "Eventos pasados" en el panel (2026-09-14, `MEMORY.md` D-17) — **sin fecha definida, no es urgente**. Aplica tanto a la tarjeta de lista en `/administrator/eventos-pasados` como, potencialmente, a `GalleryEventCard.astro` en `/eventos` público (que muestra estas galerías como "Eventos realizados"). No se tocó nada de esto en el cambio de alcance ni en el Sprint 6 — quedó deliberadamente fuera de esos alcances hasta que el PO defina qué cambiar.

## Dónde preguntar

Si algo de esta lista ya se resolvió o quedó desactualizado, revisar `git log` o marcarlo como hecho acá mismo.
