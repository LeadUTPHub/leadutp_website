-- ═══════════════════════════════════════════════════════════════════════
-- Patch 002 — luma_event_pointers: tarjeta visual completa
-- ───────────────────────────────────────────────────────────────────────
-- Contexto (Sprint 3, revisión de PO antes de T3.1):
--   El diseño original (Sprint 0) modelaba luma_event_pointers como un
--   puntero mínimo (title + luma_url + pillar_slug + featured + sort_hint),
--   asumiendo que fecha/lugar/imagen vivían solo en Luma y se consumirían
--   más adelante vía su API. Esa integración se descartó por costo — el
--   director carga estos datos completos a mano. El schema mínimo no
--   alcanza para la tarjeta visual (título, fecha, ubicación, imagen,
--   descripción corta, URL de registro) que la web pública necesita
--   mostrar sin volver a llamar a Luma.
--
-- Cambios:
--   1. sort_hint (timestamptz, solo ordenaba, no se mostraba) → se
--      reemplaza por event_date (timestamptz): ahora es la fecha real
--      del evento, se muestra en la tarjeta Y se usa para ordenar.
--   2. + location (text) — ubicación a mostrar.
--   3. + image_url (text, nullable, debe empezar con https://) — imagen
--      de la tarjeta. URL externa en texto plano (ej. pegada desde
--      Cloudinary u otro host) — sin subida firmada en este sprint, eso
--      es alcance de Sprint 4 (galerías).
--   4. + short_description (text, nullable, máx. 280 caracteres) —
--      descripción corta de la tarjeta.
--
-- Es una migración DESTRUCTIVA sobre sort_hint (DROP COLUMN): si ya
-- hay filas con sort_hint cargado, su valor se pierde. En Sprint 3 la
-- tabla todavía no tiene CRUD implementado, así que en la práctica no
-- debería haber filas reales aún — confirmar antes de correr en un
-- proyecto con datos.
--
-- Ya reflejado en database/schema.sql (fuente de verdad para proyectos
-- nuevos) — este patch es solo para aplicar el cambio a un proyecto que
-- ya corrió la versión anterior del schema.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.luma_event_pointers
  drop column if exists sort_hint,
  add column if not exists event_date        timestamptz,
  add column if not exists location          text,
  add column if not exists image_url         text,
  add column if not exists short_description text;

alter table public.luma_event_pointers
  drop constraint if exists image_url_must_be_https,
  add constraint image_url_must_be_https
    check (image_url is null or image_url ~* '^https://');

alter table public.luma_event_pointers
  drop constraint if exists short_description_max_length,
  add constraint short_description_max_length
    check (short_description is null or char_length(short_description) <= 280);
