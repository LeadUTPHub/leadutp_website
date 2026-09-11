-- ═══════════════════════════════════════════════════════════════════════════
-- LEAD UTP — Panel de administración. Esquema Supabase (Postgres).
-- ───────────────────────────────────────────────────────────────────────────
-- Aplicar con:  supabase db push   (o pegar en el SQL Editor del proyecto).
-- Idempotente donde Postgres lo permite. Todo en el esquema `public` salvo auth.*
-- Referencias: docs/DISENO_TECNICO.md §1–§2 · DOMAIN.md
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 0. Extensiones ───────────────────────────────────────────────────────
create extension if not exists pgcrypto;            -- gen_random_uuid()

-- ─── 1. Enums ─────────────────────────────────────────────────────────────
do $$ begin
  create type public.app_role as enum ('director', 'subdirector', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_source as enum ('supabase', 'cloudinary', 'static');
exception when duplicate_object then null; end $$;

-- ─── 2. pillars — tabla de referencia (= "áreas"). Sembrada desde ─────────
--        src/data/pillars/pillars.data.ts . source = 'static'.
create table if not exists public.pillars (
  slug        text primary key,
  name        text not null,
  source      public.content_source not null default 'static',
  created_at  timestamptz not null default now()
);

insert into public.pillars (slug, name) values
  ('desarrollo-profesional',  'Desarrollo Profesional'),
  ('liderazgo',               'Liderazgo'),
  ('excelencia-femenina',     'Excelencia Femenina'),
  ('desarrollo-del-capitulo', 'Desarrollo del Capítulo'),
  ('excelencia-academica',    'Excelencia Académica'),
  ('lead-academia',           'LEAD Academia')
on conflict (slug) do nothing;

-- ─── 3. profiles — 1:1 con auth.users ────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        public.app_role not null,
  area_slug   text references public.pillars(slug),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_area_required_unless_super
    check (role = 'super_admin' or area_slug is not null)
);

-- ─── 4. Helpers de autorización ──────────────────────────────────────────
--       Leen el JWT (poblado por el Auth Hook del §6). STABLE + search_path fijo.
create or replace function public.auth_role()
  returns public.app_role
  language sql stable
  set search_path = public
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::public.app_role;
$$;

create or replace function public.auth_area()
  returns text
  language sql stable
  set search_path = public
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'area_slug', '');
$$;

create or replace function public.is_super_admin()
  returns boolean
  language sql stable
  set search_path = public
as $$
  select coalesce(public.auth_role() = 'super_admin', false);
$$;

grant execute on function public.auth_role(), public.auth_area(), public.is_super_admin()
  to anon, authenticated;

-- ─── 5. updated_at automático ───────────────────────────────────────────
create or replace function public.set_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── 6. Custom Access Token Hook ───────────────────────────────────────
--       Registrar en: Supabase Dashboard → Authentication → Hooks →
--       "Customize Access Token" → public.custom_access_token_hook
create or replace function public.custom_access_token_hook(event jsonb)
  returns jsonb
  language plpgsql stable
  set search_path = public
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  meta   jsonb := coalesce(claims -> 'app_metadata', '{}'::jsonb);
  prof   record;
begin
  select role, area_slug, is_active
    into prof
    from public.profiles
   where id = (event ->> 'user_id')::uuid;

  if found then
    meta := meta || jsonb_build_object(
      'role',      prof.role,
      'area_slug', prof.area_slug,
      'is_active', prof.is_active
    );
    claims := jsonb_set(claims, '{app_metadata}', meta);
    event  := jsonb_set(event, '{claims}', claims);
  end if;

  return event;
end $$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from anon, authenticated, public;

-- ─── 7. Tablas de contenido ────────────────────────────────────────────

-- 7.1 luma_event_pointers — puntero curado a un evento próximo de Luma.
--     NO copia datos autoritativos (fecha/lugar/cupos viven en Luma).
create table if not exists public.luma_event_pointers (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  luma_url     text not null,
  pillar_slug  text references public.pillars(slug),
  area_slug    text not null references public.pillars(slug),
  owner_id     uuid not null references public.profiles(id),
  featured     boolean not null default false,
  sort_hint    timestamptz,                 -- SOLO para ordenar en la web
  source       public.content_source not null default 'supabase',
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint luma_url_must_be_luma
    check (luma_url ~* '^https://(lu\.ma|luma\.com)/')
);

-- 7.2 event_galleries — "así se vivió el evento"
create table if not exists public.event_galleries (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,
  body         text,                         -- markdown
  happened_on  date,
  pillar_slug  text references public.pillars(slug),
  area_slug    text not null references public.pillars(slug),
  owner_id     uuid not null references public.profiles(id),
  source       public.content_source not null default 'supabase',
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 7.3 gallery_photos — fotos alojadas en Cloudinary
create table if not exists public.gallery_photos (
  id                    uuid primary key default gen_random_uuid(),
  gallery_id            uuid not null references public.event_galleries(id) on delete cascade,
  cloudinary_public_id  text not null,
  secure_url            text not null,
  width                 int,
  height                int,
  alt                   text,
  position              int not null default 0,
  source                public.content_source not null default 'cloudinary',
  created_at            timestamptz not null default now()
);
create index if not exists gallery_photos_gallery_idx on public.gallery_photos (gallery_id);

-- 7.4 page_blocks — contenido editable de subpáginas públicas
create table if not exists public.page_blocks (
  key          text primary key,             -- 'nosotros.history', 'proyectos.list', ...
  data         jsonb not null,               -- forma = src/data/**/*.types.ts
  area_slug    text not null references public.pillars(slug),
  owner_id     uuid not null references public.profiles(id),
  source       public.content_source not null default 'supabase',
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- triggers updated_at
do $$
declare t text;
begin
  foreach t in array array['profiles','luma_event_pointers','event_galleries','page_blocks'] loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I', t);
    execute format('create trigger trg_set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ─── 8. Helper de scope para gallery_photos ────────────────────────────
create or replace function public.can_edit_gallery(g_id uuid)
  returns boolean
  language sql stable
  set search_path = public
as $$
  select exists (
    select 1 from public.event_galleries g
     where g.id = g_id
       and (
         public.is_super_admin()
         or (public.auth_role() = 'director'    and g.area_slug = public.auth_area())
         or (public.auth_role() = 'subdirector' and g.owner_id  = auth.uid())
       )
  );
$$;
grant execute on function public.can_edit_gallery(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 9. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════

-- 9.0 pillars — lectura para todos, escritura solo super_admin
alter table public.pillars enable row level security;
drop policy if exists "pillars: world readable" on public.pillars;
create policy "pillars: world readable" on public.pillars
  for select to anon, authenticated using (true);
drop policy if exists "pillars: super_admin writes" on public.pillars;
create policy "pillars: super_admin writes" on public.pillars
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- 9.1 profiles
alter table public.profiles enable row level security;
drop policy if exists "profiles: read scope" on public.profiles;
create policy "profiles: read scope" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_super_admin()
    or (public.auth_role() = 'director' and area_slug = public.auth_area())
  );
drop policy if exists "profiles: super_admin insert" on public.profiles;
create policy "profiles: super_admin insert" on public.profiles
  for insert to authenticated with check (public.is_super_admin());
drop policy if exists "profiles: super_admin update" on public.profiles;
create policy "profiles: super_admin update" on public.profiles
  for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "profiles: super_admin delete" on public.profiles;
create policy "profiles: super_admin delete" on public.profiles
  for delete to authenticated using (public.is_super_admin());

-- 9.2 Patrón reutilizable para tablas con (area_slug, owner_id, published):
--     luma_event_pointers, event_galleries, page_blocks
do $$
declare t text;
begin
  foreach t in array array['luma_event_pointers','event_galleries','page_blocks'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format($f$drop policy if exists "%1$s: public reads published" on public.%1$I$f$, t);
    execute format($f$create policy "%1$s: public reads published" on public.%1$I
      for select to anon using (published = true)$f$, t);

    execute format($f$drop policy if exists "%1$s: staff reads all" on public.%1$I$f$, t);
    execute format($f$create policy "%1$s: staff reads all" on public.%1$I
      for select to authenticated using (true)$f$, t);

    execute format($f$drop policy if exists "%1$s: staff insert own-area" on public.%1$I$f$, t);
    execute format($f$create policy "%1$s: staff insert own-area" on public.%1$I
      for insert to authenticated with check (
        public.is_super_admin()
        or (owner_id = auth.uid() and area_slug = public.auth_area())
      )$f$, t);

    execute format($f$drop policy if exists "%1$s: staff update by scope" on public.%1$I$f$, t);
    execute format($f$create policy "%1$s: staff update by scope" on public.%1$I
      for update to authenticated
      using (
        public.is_super_admin()
        or (public.auth_role() = 'director'    and area_slug = public.auth_area())
        or (public.auth_role() = 'subdirector' and owner_id  = auth.uid())
      )
      with check (
        public.is_super_admin()
        or (public.auth_role() = 'director'    and area_slug = public.auth_area())
        or (public.auth_role() = 'subdirector' and owner_id  = auth.uid())
      )$f$, t);

    execute format($f$drop policy if exists "%1$s: staff delete by scope" on public.%1$I$f$, t);
    execute format($f$create policy "%1$s: staff delete by scope" on public.%1$I
      for delete to authenticated
      using (
        public.is_super_admin()
        or (public.auth_role() = 'director'    and area_slug = public.auth_area())
        or (public.auth_role() = 'subdirector' and owner_id  = auth.uid())
      )$f$, t);
  end loop;
end $$;

-- 9.3 gallery_photos — hereda el scope de su galería padre
alter table public.gallery_photos enable row level security;
drop policy if exists "gallery_photos: public reads published" on public.gallery_photos;
create policy "gallery_photos: public reads published" on public.gallery_photos
  for select to anon
  using (exists (
    select 1 from public.event_galleries g
     where g.id = gallery_id and g.published = true
  ));
drop policy if exists "gallery_photos: staff reads all" on public.gallery_photos;
create policy "gallery_photos: staff reads all" on public.gallery_photos
  for select to authenticated using (true);
drop policy if exists "gallery_photos: staff insert" on public.gallery_photos;
create policy "gallery_photos: staff insert" on public.gallery_photos
  for insert to authenticated with check (public.can_edit_gallery(gallery_id));
drop policy if exists "gallery_photos: staff update" on public.gallery_photos;
create policy "gallery_photos: staff update" on public.gallery_photos
  for update to authenticated
  using (public.can_edit_gallery(gallery_id))
  with check (public.can_edit_gallery(gallery_id));
drop policy if exists "gallery_photos: staff delete" on public.gallery_photos;
create policy "gallery_photos: staff delete" on public.gallery_photos
  for delete to authenticated using (public.can_edit_gallery(gallery_id));

-- ═══════════════════════════════════════════════════════════════════════
-- 10. GRANTS base (Supabase ya concede lo estándar; explícito por claridad)
-- ═══════════════════════════════════════════════════════════════════════
grant usage on schema public to anon, authenticated;
grant select on public.pillars, public.luma_event_pointers, public.event_galleries,
                 public.gallery_photos, public.page_blocks to anon;
grant select, insert, update, delete
  on public.luma_event_pointers, public.event_galleries, public.gallery_photos,
     public.page_blocks, public.profiles to authenticated;
grant select on public.pillars to authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 11. SEED MANUAL (una sola vez, fuera de este archivo — ver MEMORY.md Sprint 2)
--     El primer super_admin se crea desde el Dashboard de Supabase y luego:
--       insert into public.profiles (id, full_name, role)
--       values ('<uuid-del-user>', 'Nombre Apellido', 'super_admin');
--     Los directores/subdirectores los crea ese super_admin desde el panel
--     (/administrator/usuarios → POST /administrator/api/users).
-- ═══════════════════════════════════════════════════════════════════════
