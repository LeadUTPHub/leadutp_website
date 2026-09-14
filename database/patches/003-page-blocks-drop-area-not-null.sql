-- ═══════════════════════════════════════════════════════════════════════
-- Patch 003 — page_blocks: area_slug pasa a nullable (contenido institucional)
-- ───────────────────────────────────────────────────────────────────────
-- Contexto (Sprint 5, auditoría de schema pedida por el PO antes de T5.1):
--   Las "áreas" mapean 1:1 a los 6 pilares (D-P2), y area_slug es lo que
--   decide QUIÉN puede editar cada fila (RLS por scope). Eso funciona para
--   luma_event_pointers y event_galleries, donde el contenido sí pertenece
--   de verdad a un pilar.
--
--   Pero los bloques de Sprint 5 son contenido INSTITUCIONAL:
--     · nosotros.history  — la historia de LEAD UTP
--     · nosotros.team     — la junta directiva
--     · proyectos.list    — la lista de proyectos de la comunidad
--   Ninguno pertenece a un pilar. Con area_slug NOT NULL habría que
--   asignarle un pilar arbitrario, y eso no es cosmético: significaría que
--   el director de ESE pilar es el único director que puede editar la
--   historia o la junta directiva de toda la organización. Además viola la
--   regla 5 de trazabilidad (el dato diría algo que no es cierto).
--
-- Decisión del PO (D-13, D-a de la auditoría): Nosotros y Proyectos los
-- mantiene super_admin, no un director de pilar. area_slug pasa a nullable
-- y un bloque sin área = contenido institucional.
--
-- POR QUÉ NO HACE FALTA TOCAR NINGUNA POLÍTICA DE RLS:
--   La RLS actual ya hace lo correcto con area_slug = NULL, por la
--   semántica de tres valores de SQL:
--     · INSERT  → "staff insert own-area" exige
--                 (owner_id = auth.uid() and area_slug = auth_area()).
--                 Con NULL, esa comparación da NULL; el WITH CHECK no es
--                 TRUE y la fila se rechaza. Resultado: solo un super_admin
--                 puede crear un bloque sin área. Es exactamente lo que
--                 queremos, sin escribir una política nueva.
--     · UPDATE/DELETE → la rama de director exige
--                 area_slug = auth_area() → NULL → no pasa. Solo
--                 super_admin. Ídem.
--     · SELECT  → sin cambios (anon lee published, staff lee todo).
--   Si mañana se quiere delegar un bloque a un pilar (p. ej. proyectos.list
--   a un área concreta), basta con darle area_slug: la RLS de director
--   vuelve a aplicar tal cual, sin migrar nada.
--
--   ⚠ CAVEAT CONOCIDO (ver MEMORY.md L27 y D-13): la rama de SUBDIRECTOR
--   de las políticas de UPDATE y DELETE es (owner_id = auth.uid()) SIN
--   condición de área. Un subdirector que fuera owner_id de un bloque sin
--   área PODRÍA editarlo o borrarlo. Hoy es inalcanzable: los endpoints
--   fijan ownerId = usuario autenticado del request y el INSERT sin área
--   ya está bloqueado para no-super_admin, así que un subdirector nunca
--   llega a ser owner de una fila sin área. Si en algún momento se
--   permite REASIGNAR owner_id (p. ej. un traspaso de contenido al cambiar
--   la directiva), hay que revisar esta política ANTES de habilitarlo.
--
-- NO ES DESTRUCTIVA: drop not null solo relaja una restricción. No borra,
-- no transforma y no reescribe ninguna fila — a diferencia del patch 002,
-- que sí hacía DROP COLUMN sobre sort_hint. Las filas existentes (si las
-- hubiera) conservan su area_slug intacto y siguen siendo válidas. Es
-- idempotente: correrlo dos veces no da error.
--
-- Cómo aplicar: pegar este archivo completo en el SQL Editor de Supabase
-- y ejecutarlo.
--
-- Ya reflejado en database/schema.sql (fuente de verdad para proyectos
-- nuevos) — este patch es solo para aplicar el cambio a un proyecto que
-- ya corrió la versión anterior del schema.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.page_blocks
  alter column area_slug drop not null;

comment on column public.page_blocks.area_slug is
  'Área (= slug de pilar) dueña del bloque. NULL = contenido institucional '
  '(Nosotros, Proyectos): solo super_admin puede crearlo o editarlo, por la '
  'semántica NULL de las políticas RLS. Ver patch 003 y MEMORY.md D-13/L27.';
