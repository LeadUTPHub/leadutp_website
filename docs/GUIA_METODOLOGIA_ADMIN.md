# LEAD UTP — Prompts Maestros para el Panel de Administración + Integración Luma

> Adaptación del **Kit de Hackathon LEAD UTP** (metodología SDD + TDD + Scrum + Arquitectura Hexagonal) aplicada a un proyecto **real y ya desplegado**, no a un reto desde cero.

## Diferencia clave frente al Kit original

En una hackathon empiezas de una carpeta vacía. Acá **no**: ya existe `leadutp_website` en producción (Astro 7 + Tailwind, SSG, desplegado en Vercel). La regla de oro cambia de forma:

> **En la hackathon: "lo que no corre de principio a fin, no puntúa."**
> **Acá: "lo que no corre de principio a fin, no se mergea — y lo que ya corre en producción, no se rompe."**

Todo lo que sigue está diseñado para que el sitio público (Home, Pilares, Nosotros, Eventos, Convocatorias, Internacional, Vida LEAD) **jamás deje de funcionar** mientras se construye esto al lado.

---

## Decisiones ya tomadas (Fase 0 resuelta)

Estas cuatro preguntas ya no están abiertas — quedan fijadas acá para que Claude Code no las vuelva a proponer como si fueran opciones:

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Luma: API o embed? | **Solo embed.** Iframe o botón de redirección hacia Luma. Nada de sincronizar/duplicar datos de eventos vía API — Luma sigue siendo la única fuente de verdad, la web solo lo muestra o enlaza. |
| 2 | ¿CMS headless o backend custom? | **Backend custom con Supabase** (Auth + Postgres + Storage en un solo servicio). Se descarta CMS headless de terceros (Payload, Directus, Sanity) por ser más pesado de mantener y no necesario para el alcance actual. Free tier generoso, se integra bien con Vercel/Astro, sin backend adicional que hostear. |
| 3 | ¿Dónde van las fotos? | **Cloudinary** para todo el contenido de imagen (fotos de eventos, "así se vivió el evento"). Free tier de 25GB, CDN incluido, genera miniaturas y versiones responsive automáticamente — importante porque el sitio ya tiene varias galerías (Vida LEAD, Internacional) y va a sumar más. Supabase queda solo para datos y auth, no para archivos pesados. |
| 4 | ¿Páginas externas (cursos, programas de Pilar, Study Fest)? | **Solo se entrelazan por link.** No viven dentro de la estructura ni el repo de la landing — cada una se aloja aparte (subdominio o proyecto de Vercel distinto) para no cargar de peso el sitio principal. |

Con esto, el stack completo para el panel de admin queda: **Astro (hybrid solo en `/administrator/*`) + Supabase (Auth + DB) + Cloudinary (fotos) + iframe/link a Luma (eventos)**.

---

## Regla transversal de diseño — no negociable

El panel de administración y cualquier pieza nueva **deben verse como parte del mismo sitio**, no como una herramienta aparte con su propio estilo. Esto aplica a login, dashboard, formularios, todo.

Antes de escribir una sola línea de UI, Claude Code tiene que extraer los tokens reales del proyecto:

- Paleta de colores (Tailwind config, `pillarGradients` de `HomePillars.astro`, colores de Navbar/Footer)
- Tipografía y escalas de tamaño ya usadas
- Componentes reutilizables existentes en `src/components/ui/` (Button, Badge, Container, SectionHeader) — **reutilizar estos, no crear versiones nuevas**
- El tratamiento visual ya establecido (ej. el crossfade de 300ms en transiciones, el blur del Navbar al hacer scroll)

Ningún prompt de los pasos siguientes debe pedirle a Claude Code que "proponga" una paleta o un sistema de diseño nuevo — eso ya existe. Su trabajo es **extenderlo**, no reinventarlo.

---

## Plan de sprints propuesto (Scrum aplicado a este proyecto)

Esto es el punto de partida que Claude Code va a formalizar en `.sprints/BACKLOG.md` durante el Paso 3 — no es una sugerencia vaga, es el orden real en el que se construye, respetando que cada sprint debe cerrar con algo que **corre de principio a fin** antes de pasar al siguiente. Ningún sprint empieza sin que el anterior tenga su Definition of Done (DoD) cumplida y validada en preview de Vercel.

| Sprint | Épica | Qué entrega (DoD) | Requiere auth/roles |
|---|---|---|---|
| **0** | Infraestructura base | Proyecto Supabase creado, variables de entorno configuradas, cuenta Cloudinary lista, `astro.config.mjs` migrado a hybrid solo para `/administrator/*`, `pnpm build` sigue pasando igual que antes. Sin UI todavía. | No |
| **1 — Piloto** | Eventos + embed Luma | `/eventos` muestra el embed/link de Luma en producción, con degradación elegante si Luma no responde. Cero cambios a Supabase todavía. | No |
| **2** | Autenticación y roles | `/administrator` accesible solo por URL directa, login funcional contra Supabase Auth, roles (director/subdirector/super-admin) creados con Row Level Security. Sin funcionalidad de contenido todavía, solo login exitoso y bloqueo correcto por rol. | Sí |
| **3** | CRUD de Eventos propios | Un director logueado puede crear/editar/borrar SOLO sus propios eventos desde el panel, guardado en Supabase. | Sí |
| **4** | Galería "así se vivió el evento" | Subida de fotos a Cloudinary desde el panel, asociadas a un evento, visibles en una página tipo `/vida-lead`. | Sí |
| **5** | Extensión a otros módulos | Repetir el patrón del Sprint 3-4 para Nosotros (historia, junta) y Proyectos — los que hoy están vacíos esperando a la directiva. | Sí |
| **6** | Pulido UX/UI | Ver Paso 6: consistencia visual, estados de carga/error, accesibilidad, documentación actualizada. | — |

**Regla de secuencia:** el Sprint 2 (auth) no arranca hasta que el Sprint 1 esté mergeado o al menos validado en preview — así, si algo del stack de Supabase se complica, la sección de Eventos ya quedó entregada de forma independiente y utilizable.

Cada sprint, al cerrarse, pasa por el mismo ciclo TDD del Paso 5: Rojo → Verde → `pnpm build` completo → demo en preview de Vercel → tu aprobación → recién ahí el siguiente sprint.

---

## Antes de empezar — checklist de una sola vez

- [ ] Confirmar que `pnpm build` y `pnpm preview` del sitio actual funcionan **antes** de empezar (baseline limpio)
- [ ] Tener a mano `CONTEXT.md` y `PENDIENTES.md` del proyecto — van a ser el "reto" que Claude Code tiene que leer en el Paso 1
- [ ] Crear cuentas gratuitas en Supabase y Cloudinary (no hace falta configurarlas todavía, solo tenerlas listas para el Paso 4)
- [ ] Seguir el flujo de ramas y Vercel de la sección siguiente

---

## Flujo de trabajo con git y Vercel (cómo no tocar la landing)

Esto es lo que responde directamente a "¿cómo trabajo esto sin afectar lo que ya está en producción?".

### 1. Crear la rama desde `main`

```bash
git checkout main
git pull origin main
git checkout -b cms-admin
```

En este punto, `cms-admin` es una copia exacta de `main`. Nada ha cambiado todavía.

### 2. Cómo conviven ambas versiones mientras trabajas

Tu carpeta local tiene ambas ramas, pero solo una activa a la vez:

- Parado en `cms-admin` + `pnpm dev` → ves el sitio **con** los cambios nuevos.
- `git checkout main` → tu carpeta vuelve a verse exactamente como producción, sin nada nuevo.
- Todo lo que haga Claude Code se guarda como commits en `cms-admin` — **no toca `main`** hasta que tú decidas mergear.

### 3. Producción no se entera de nada

`leadutp.vercel.app` sigue sirviendo desde `main`. Nadie que visite el sitio ve cambios hasta que hagas merge — sin importar cuánto tiempo trabajes en la rama.

### 4. Preview deployments para probar sin arriesgar nada

```bash
git push origin cms-admin
```

Al conectar esa rama a un Pull Request en GitHub, Vercel genera automáticamente una URL de preview (tipo `leadutp-git-cms-admin-tuusuario.vercel.app`) con el panel de admin funcionando de verdad, datos reales incluidos — sin tocar la URL pública.

### 5. Mergear solo cuando el piloto esté validado

Cuando el Sprint piloto (Eventos + Luma, ver Paso 5) funcione en la preview y `pnpm build` pase limpio, recién ahí abres el Pull Request de `cms-admin` hacia `main`. El merge es el único momento en que los cambios llegan a producción.

```
main ──●───────────────────────────────●──(merge, a producción)
        \                              /
         cms-admin ──●──●──●──●
                          (commits de Claude Code, sprint a sprint)
```

---

## Paso 0 · Reglas base del agente (pegar una vez, al inicio de la sesión de Claude Code)

```
Eres un Ingeniero de Software Senior operando como Development Team autónomo
sobre un proyecto EXISTENTE y EN PRODUCCIÓN. Trabajas bajo la intersección
estricta de tres marcos: Spec-Driven Development (SDD), Arquitectura Limpia +
Hexagonal (Ports & Adapters con dominio puro), y Scrum. Yo soy el Product
Owner (PO).

CONTEXTO CRÍTICO: este NO es un proyecto desde cero. Es el sitio web de
LEAD UTP (Astro 7 + Tailwind 4, SSG, desplegado en Vercel), ya en producción,
con páginas públicas que funcionan y no se pueden romper.

STACK YA DECIDIDO (no lo cuestiones ni propongas alternativas):
- Backend: Supabase (Auth + Postgres + Storage de datos).
- Fotos: Cloudinary (todo el contenido de imagen, no Supabase Storage).
- Eventos: SOLO embed/link a Luma. Nunca sincronizar ni duplicar datos de
  Luma vía API — Luma es la única fuente de verdad de eventos.
- Páginas externas (cursos, programas de Pilar, Study Fest): NO se integran
  a este repo. Solo se enlazan desde la navegación. No construyas nada de
  esas páginas aquí.

REGLA DE DISEÑO NO NEGOCIABLE: toda UI nueva reutiliza la paleta, tipografía
y componentes de src/components/ui/ ya existentes. Nunca propongas un
sistema de diseño nuevo. Antes de crear cualquier pantalla, extrae y lista
los tokens visuales reales del proyecto (Tailwind config, pillarGradients,
Navbar, Footer).

REGLAS INQUEBRANTABLES:
1. No escribes código sin una especificación (SPEC) que lo contrate.
2. TDD siempre: primero el test que falla (Rojo), luego el código mínimo (Verde).
3. El dominio es PURO: no importa librerías externas ni otras capas. Las
   dependencias apuntan siempre hacia adentro.
4. Toda dependencia externa (Luma, Supabase, Cloudinary) tiene degradación
   elegante: si algo falla, la página pública no debe romperse.
5. Trazabilidad: todo dato conserva su procedencia (Supabase / Cloudinary /
   archivo estático).
6. Solo cuenta lo demostrable. Nada es "hecho" si no corre end-to-end.
7. No añades funcionalidades fuera del alcance del SPEC activo.
8. NUNCA modificas páginas públicas existentes (Home, Pilares, Nosotros,
   Convocatorias, Internacional, Vida LEAD) fuera del sprint que
   explícitamente las toque. El build de producción (`pnpm build`) debe
   pasar en cada commit.
9. Todo el trabajo nuevo vive en rutas aisladas (`/administrator/*`) y,
   al cambiar Astro de `output: 'static'` a `output: 'hybrid'`, las
   páginas públicas existentes deben seguir prerenderizadas — solo las
   rutas nuevas pasan a modo servidor.
10. Trabajas SOLO sobre la rama `cms-admin`. Nunca sobre `main`.

COMUNICACIÓN:
- Reportas SIEMPRE en tablas de doble entrada (estilo Notion).
- Al cerrar una tarea, documentas decisiones y errores en MEMORY.md.

Confirma que entendiste con una tabla que liste estas reglas y su estado
(Activa). No hagas nada más hasta que te dé el Paso 1.
```

---

## Paso 1 · Leer el contexto real del proyecto (no bases de hackathon)

```
CONTEXTO: en la raíz del repo están CONTEXT.md y PENDIENTES.md, que describen
el estado actual del sitio. Además, te paso un resumen de lo que pidió el
Vicepresidente en dos notas de voz (pegar aquí el resumen de ambos audios).
El stack y las decisiones de arquitectura YA están definidos (ver Paso 0).
Aún NO escribas código.

TAREA (Paso 1 de 6 — Entendimiento):
1. Lee CONTEXT.md y PENDIENTES.md de principio a fin.
2. Lee el código actual de src/data/events/, src/data/openings/ y
   src/data/life/ para entender los patrones de datos ya usados, y
   src/components/ui/ + la config de Tailwind para los tokens de diseño.
3. Crea ./docs/REQUISITOS_ADMIN.md con, en tablas:
   - Problema central en una frase.
   - Qué NO se puede romper (páginas públicas, build, deploy actual).
   - Funcionalidades pedidas por el VP:
     a) Sección de Eventos con embed/link a Luma (sin sync de datos).
     b) Panel de administración con acceso oculto por URL, login +
        posible 2FA, y roles por director/subdirector (vía Supabase Auth).
     c) Cada rol puede subir/editar SOLO su contenido (eventos propios,
        fotos de "así se vivió el evento" en Cloudinary, texto en Supabase).
   - Módulos candidatos a migrar del `.data.ts` estático al panel:
     eventos, vida-lead, nosotros (historia + junta), proyectos.
   - Tokens de diseño existentes que hay que reutilizar (lista concreta).
   - Restricciones técnicas actuales (Astro SSG, pnpm, sin backend previo).
4. Marca las 3 decisiones donde más se juega el éxito de este proyecto.
5. Reporta un resumen en tabla y espera mi visto bueno.

No inventes requisitos ni stack alternativo. El stack ya está cerrado.
```

**Tu rol:** corregir cualquier malinterpretación antes de seguir.

---

## Paso 2 · Diseño técnico detallado del stack ya decidido

```
TAREA (Paso 2 de 6 — Diseño técnico):
El stack ya está definido: Supabase (Auth + DB) + Cloudinary (fotos) +
embed/link a Luma (eventos) + Astro hybrid solo en /administrator/*.
No propongas alternativas — detalla CÓMO se implementa esto.

1. Diseña el modelo de autenticación y roles en Supabase:
   - Tabla de usuarios/roles (director, subdirector, super-admin).
   - Cómo se restringe que cada uno solo edite su propio contenido
     (Row Level Security de Supabase).
   - Cómo se implementa el acceso por URL oculta (/administrator) sin
     exponer un botón de login en el sitio público.
   - Opciones reales para 2FA con Supabase Auth (evalúa si vale la pena
     para el tamaño de este equipo, o si es sobre-ingeniería en esta fase).
2. Diseña el flujo de subida de fotos a Cloudinary desde el panel:
   - Upload directo desde el navegador (unsigned upload preset) vs.
     subida a través de un endpoint propio — recomienda uno y por qué.
   - Cómo se guarda en Supabase la referencia (URL de Cloudinary) ligada
     a cada evento/galería.
3. Diseña cómo se ve la sección de Eventos en la web pública:
   - Iframe embebido de Luma vs. botón de redirección — recomienda uno,
     considerando el mismo problema de fondo blanco que ya tuvieron con
     el iframe de Google Forms en /convocatorias.
4. Define qué pasa con astro.config.mjs: qué rutas exactas pasan a modo
   servidor y cuáles siguen 100% estáticas.
5. Plan de degradación: qué ve el visitante si Supabase, Cloudinary o
   Luma no responden.
6. Guárdalo en ./docs/DISENO_TECNICO.md y espera mi aprobación.
```

**Tu rol:** validar sobre todo el punto de Row Level Security (quién puede editar qué) y decidir si el 2FA se hace ahora o se deja para después.

---

## Paso 3 · Scaffolding SDD + contrato API + diseño visual (sobre el repo existente)

```
TAREA (Paso 3 de 6 — Infraestructura SDD + Diseño + API):
Ya está definido el diseño técnico (ver ./docs/DISENO_TECNICO.md). Audita
el repo EXISTENTE — no lo trates como una carpeta vacía — y crea solo lo
que falte, sin duplicar lo que ya funciona.

A. INFRAESTRUCTURA SDD/SCRUM (raíz, si no existen ya):
   1. AGENTS.md — tus reglas operativas, incluyendo la regla de no tocar
      páginas públicas fuera de alcance y de reutilizar el diseño existente.
   2. MEMORY.md — retrospectiva: "Lecciones aprendidas" y "Estado del sistema".
   3. ARCHITECTURE.md — cómo conviven el Astro SSG actual y las nuevas
      rutas hybrid del admin. Diagrama de capas (Hexagonal) para la
      integración con Supabase/Cloudinary. Regla de dependencias hacia
      adentro.
   4. TECH_STACK.md — Supabase, Cloudinary y qué librerías cliente se
      agregan sobre Astro/Tailwind ya existentes. Qué queda vetado
      (ningún CMS de terceros, ninguna sync con API de Luma).
   5. DOMAIN.md — glosario: Evento, Director, Subdirector, Pilar, Rol,
      "Evento realizado" vs "Evento próximo", Galería, etc.
   6. database/schema.sql — modelo de datos en Supabase: usuarios, roles,
      eventos, galerías (con referencia a Cloudinary), relación con pilares.
   7. .sprints/BACKLOG.md — formaliza EXACTAMENTE esta secuencia de sprints
      (ya decidida, no la reordenes ni la fusiones):
      │ ID Sprint │ Épica │ Estado │ DoD │
      - Sprint 0: Infraestructura base (Supabase, Cloudinary, astro hybrid).
      - Sprint 1: Eventos + embed Luma (piloto, sin auth).
      - Sprint 2: Autenticación y roles (Supabase Auth + RLS).
      - Sprint 3: CRUD de eventos propios por rol.
      - Sprint 4: Galería "así se vivió el evento" (Cloudinary).
      - Sprint 5: Extensión a Nosotros y Proyectos.
      - Sprint 6: Pulido UX/UI.
      Para cada sprint, descompón la épica en tareas concretas con su
      Given-When-Then, pero sin alterar el orden ni el alcance de cada uno.

B. CONTRATO DE API (./docs/):
   8. API_CONTRACTS.md — cada endpoint propio (los que no son Supabase/
      Cloudinary directo desde el cliente): login, gestión de roles, CRUD
      de eventos, subida de fotos. Método, ruta, request, response (JSON
      de ejemplo) y errores.

C. DISEÑO (raíz):
   9. DESIGN.md — NO propongas paleta ni tipografía nueva. Documenta los
      tokens ya existentes (extraídos de Tailwind config, pillarGradients,
      componentes de src/components/ui/) y cómo se aplican a cada pantalla
      nueva: login, dashboard, gestión de eventos, gestión de "así se vivió
      el evento", gestión de usuarios/roles.

Todos los .md coherentes entre sí y coherentes con CONTEXT.md/PENDIENTES.md
ya existentes en el repo. Al terminar, dame la tabla de estado y el orden
de sprints recomendado, dejando claro cuál sprint es el piloto.
```

**Tu rol:** revisar que DESIGN.md realmente reutilice lo existente (no debería tener ni un solo color o fuente nueva que no esté ya en el proyecto) y que ARCHITECTURE.md respete el sitio existente antes de aprobar.

---

## Paso 4 · Preparar el entorno y onboarding del agente

### 4.1 · Preparación del entorno (tú, en la terminal)

```bash
git checkout main
git pull origin main
git checkout -b cms-admin

pnpm install
pnpm add @supabase/supabase-js
# Cloudinary: según lo que defina DISENO_TECNICO.md (SDK o unsigned upload
# directo desde el navegador, sin paquete adicional necesariamente)

pnpm build   # confirma que el sitio actual sigue compilando ANTES de seguir
```

Crea las cuentas y proyectos:
- Un proyecto nuevo en [supabase.com](https://supabase.com) (free tier) → guarda `SUPABASE_URL` y `SUPABASE_ANON_KEY` como variables de entorno, nunca hardcodeadas.
- Una cuenta en [cloudinary.com](https://cloudinary.com) (free tier) → guarda el `cloud_name` y configura un upload preset unsigned si el diseño técnico lo recomienda.

### 4.2 · Onboarding del agente (pegar en Claude Code)

```
TAREA (Paso 4 de 6 — Onboarding):
Confirma que leíste AGENTS.md, ARCHITECTURE.md, DOMAIN.md, TECH_STACK.md,
API_CONTRACTS.md y .sprints/BACKLOG.md. Antes de tocar código:

1. Corre `pnpm build` y confirma que el sitio actual compila sin errores.
   Si falla, DETENTE y repórtalo — no es tu tarea arreglar regresiones
   preexistentes en este paso.
2. Confirma que las variables de entorno de Supabase y Cloudinary están
   disponibles (te las paso yo) y que NO quedan hardcodeadas en ningún
   archivo que se suba al repo.
3. Lista qué archivos y carpetas nuevas vas a crear para el Sprint 1
   (el piloto: Eventos + embed de Luma), sin listar cambios a archivos
   existentes salvo que sea estrictamente necesario.
4. Si astro.config.mjs necesita cambiar de 'static' a 'hybrid', muéstrame
   el diff exacto y explica qué rutas seguirán prerenderizadas.
5. Espera mi aprobación antes de escribir el primer test.
```

---

## Paso 5 · Desarrollo sprint por sprint (repetir este prompt en cada sprint)

Este prompt **se reutiliza en cada uno de los 7 sprints** (0 al 6) del backlog. Solo cambia el número de sprint. Nunca se salta un sprint ni se combinan dos en la misma sesión, aunque parezcan simples — cada uno cierra con su propia demo aprobada antes de abrir el siguiente.

```
TAREA (Paso 5 — Sprint N, [nombre de la épica según BACKLOG.md]):
Ejecuta el Sprint N de .sprints/BACKLOG.md. No adelantes trabajo de
sprints posteriores aunque lo veas fácil de incluir de una vez.

Para cada tarea del sprint:
1. LECTURA DEL CONTRATO: lee el SPEC de la tarea antes de escribir nada.
2. TDD: escribe primero el test que falla (Rojo), confírmalo, luego el
   código mínimo para pasar (Verde).
3. DEGRADACIÓN ELEGANTE: si una dependencia externa de este sprint falla
   (Luma, Supabase o Cloudinary, según corresponda), la página pública
   debe seguir renderizando de forma razonable, NUNCA un error 500.
4. CONSISTENCIA VISUAL: toda UI nueva de este sprint usa los mismos
   componentes y tokens del resto del sitio — nada de estilos nuevos.
5. Al terminar cada tarea, corre `pnpm build` completo del sitio — no
   solo del módulo nuevo — para confirmar que nada más se rompió.
6. Actualiza MEMORY.md con decisiones tomadas y con el estado del sprint.

Cada 2 tareas, dame un resumen en tabla: qué se hizo, qué test lo cubre,
y si el build de producción sigue pasando. NO avances al Sprint N+1 sin
mi aprobación explícita de que el DoD de este sprint se cumplió.

Cuando el sprint esté listo, recuérdame hacer:
  git push origin cms-admin
para generar/actualizar el preview deployment en Vercel y probarlo ahí
antes de aprobar el cierre del sprint.
```

**Tu rol en cada sprint:** abrir la preview URL de Vercel, probar exactamente lo que promete el DoD de ese sprint (ni más ni menos), y solo entonces decir "aprobado, sigue con el Sprint N+1". Si algo del sprint no cumple su DoD, se queda ahí hasta que se resuelva — no se avanza con deuda pendiente.

---

## Paso 6 · Pulido UX/UI del panel

```
TAREA (Paso 6 de 6 — Pulido):
El panel de administración ya es funcional end-to-end. No agregues
features nuevas en este paso, solo claridad y consistencia:

1. Confirma que el panel reutiliza exactamente los mismos tokens de color,
   tipografía y componentes de src/components/ui/ que el sitio público —
   revisa pantalla por pantalla contra DESIGN.md.
2. Estados claros para cuando algo carga, está vacío, o falla (Supabase
   no responde, una foto no sube a Cloudinary, el embed de Luma no carga).
3. Un flujo de "primera vez" simple para que un director que nunca usó
   esto entienda dónde subir su evento y sus fotos sin explicación previa.
4. Revisa accesibilidad básica: contraste, foco de teclado en los
   formularios de login y carga de contenido.
5. Actualiza CONTEXT.md y PENDIENTES.md del proyecto para reflejar que
   estos puntos (integración Luma, panel de admin) ya no están pendientes,
   y documenta cómo se administra de ahora en adelante.

Al terminar, dame el checklist final: qué corre de principio a fin, qué
build/deploy quedó validado en preview, y qué le falta confirmar al VP
(roles reales de cada director, si se activa 2FA más adelante, etc.).

Cuando todo esté aprobado, el último paso (fuera de este prompt) es abrir
el Pull Request de cms-admin hacia main en GitHub y mergearlo —
recién ahí llega a producción.
```

---

## Recordatorio final

En cada uno de estos 6 pasos, la pregunta que manda no es "¿qué tan sofisticado se ve?", sino la misma del Kit de Hackathon adaptada:

> **¿Esto corre de principio a fin sin romper lo que ya funciona, y se ve como parte del mismo sitio?**

Si la respuesta es no, no se mergea a `main` — sin importar cuánto código ya se escribió.
