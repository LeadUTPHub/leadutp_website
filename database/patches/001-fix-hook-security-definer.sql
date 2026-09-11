-- ═══════════════════════════════════════════════════════════════════════
-- Patch 001 — fix: custom_access_token_hook necesita SECURITY DEFINER
-- ───────────────────────────────────────────────────────────────────────
-- Contexto (Sprint 2, T2.6 — ver MEMORY.md L18):
--   Al activar el Auth Hook en Authentication → Hooks, el login empezó a
--   fallar con "Error running hook URI: pg-functions://postgres/public/
--   custom_access_token_hook". Causa: la función corría con los
--   privilegios de quien la invoca (`supabase_auth_admin`), que no tiene
--   grant sobre `public.profiles` — y en pleno login todavía no hay un
--   auth.uid() válido para que la RLS de "profiles: read scope" deje
--   pasar la lectura de todas formas. Postgres tira "permission denied
--   for table profiles" y el login entero falla.
--
-- Fix: agregar SECURITY DEFINER. La función pasa a correr con los
-- privilegios de quien la creó (el rol admin del proyecto, con acceso
-- total a `profiles` sin pasar por RLS), que es exactamente lo que un
-- Auth Hook necesita para poder leer el rol/área de cualquier usuario
-- que esté logueándose.
--
-- Cómo aplicar: pegar este archivo completo en el SQL Editor de
-- Supabase y ejecutarlo. Es seguro correrlo solo — no toca tablas ni
-- datos, solo reemplaza la función (CREATE OR REPLACE) y reafirma sus
-- grants (ya estaban bien, se repiten acá por completitud/idempotencia).
-- No hace falta volver a registrar el hook en Authentication → Hooks:
-- sigue apuntando al mismo nombre de función.
--
-- Ya reflejado en database/schema.sql (fuente de verdad para proyectos
-- nuevos) — este patch es solo para aplicar la corrección a un proyecto
-- que ya corrió la versión vieja de la función.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.custom_access_token_hook(event jsonb)
  returns jsonb
  language plpgsql stable
  security definer
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
