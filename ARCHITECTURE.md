# ARCHITECTURE.md — Panel de administración LEAD UTP

> Cómo conviven el sitio Astro SSG actual (en producción) y las rutas on-demand nuevas del panel, bajo Arquitectura Limpia + Hexagonal.
> Detalle de implementación: [`docs/DISENO_TECNICO.md`](./docs/DISENO_TECNICO.md). Modelo de datos: [`database/schema.sql`](./database/schema.sql).

## 1. Dos mundos en el mismo build

```
                         pnpm build  (adapter: @astrojs/vercel, output: 'static')
                                 │
             ┌───────────────────┴────────────────────┐
             ▼                                        ▼
   PRERENDER (HTML estático)                 ON-DEMAND (función servidor)
   /  /nosotros  /proyectos  /eventos        /administrator
   /pilares  /pilares/[slug]                 /administrator/login
   /vida-lead  /internacional                /administrator/**
   /convocatorias  /404                      /administrator/api/**
             │                                        │
   Leen contenido en BUILD-TIME               Leen/escriben en RUNTIME
   (Supabase → fallback JSON →                (sesión Supabase + RLS,
    .data.ts → estado vacío)                   firma Cloudinary)
```

- El sitio público **no cambia de naturaleza**: sigue siendo SSG. El adaptador solo habilita que ciertas rutas se rendericen a demanda.
- La frontera es física: `prerender = false` va **solo** en archivos bajo `src/pages/administrator/`. El panel usa su propio `AdminLayout.astro`, nunca el `Layout.astro` público.
- `src/middleware.ts` hace `if (!pathname.startsWith('/administrator')) return next()` en su primera línea: coste cero para las rutas públicas.

## 2. Capas hexagonales (dependencias hacia adentro)

```
        ┌──────────────────────────────────────────────────────┐
        │  UI                                                   │
        │  src/pages/*.astro (público, build-time)              │
        │  src/pages/administrator/**  ·  src/components/admin/**│
        └───────────────┬──────────────────────────────────────┘
                        │ depende de ▼ (puertos, nunca adaptadores)
        ┌───────────────┴──────────────────────────────────────┐
        │  DOMINIO  (src/domain/)                    PURO       │
        │  tipos: Role, Area(=PillarSlug), EventPointer,        │
        │         Gallery, GalleryPhoto, PageBlock              │
        │  reglas: canEdit(actor, resource)                     │
        │          resolveContent(db, fallback, static)         │
        │          buildCloudinaryUrl(publicId, width)          │
        │          buildLumaLinks(config)                       │
        │  puertos (src/domain/ports/):                         │
        │    ContentRepository · PhotoStorage · AuthGateway     │
        └───────────────▲──────────────────────────────────────┘
                        │ implementan ▲
        ┌───────────────┴──────────────────────────────────────┐
        │  ADAPTADORES  (src/infra/)   — únicos con SDK         │
        │  SupabaseContentRepository   (@supabase/supabase-js)  │
        │  FallbackContentRepository   (lee *.fallback.json)    │
        │  CompositeContentRepository  (encadena live→fallback→static→empty) │
        │  CloudinaryPhotoStorage      (crypto + fetch)         │
        │  SupabaseAuthGateway         (@supabase/ssr)          │
        │  container.ts                (composition root)       │
        └──────────────────────────────────────────────────────┘
```

### Regla de dependencias

| Capa | Puede importar | NO puede importar |
|---|---|---|
| `src/domain/**` | Solo tipos de TS / otros módulos de dominio | `astro`, `@supabase/*`, `cloudinary`, `src/infra/**`, `src/pages/**` |
| `src/domain/ports/**` | Solo `src/domain/**` | Cualquier adaptador |
| `src/infra/**` | `src/domain/**`, puertos, SDK externos | `src/pages/**`, `src/components/**` |
| `src/pages/**`, `src/components/**` | puertos + `src/infra/container.ts` | Un adaptador concreto directamente |

> Un test de lint/estructura (Sprint 0) verifica que `src/domain/` no tenga imports prohibidos.

## 3. Flujo de datos: contenido público

```
BUILD:  src/pages/nosotros.astro
          └─ container.getContentRepository()            (CompositeContentRepository)
               1. SupabaseContentRepository.getPageBlock('nosotros.history')   ── OK ─┐
               2. FallbackContentRepository (src/data/about/about.fallback.json)       │ el primero
               3. static: src/data/about/about.data.ts                                 │ que responde
               4. estado vacío curado (ya existente en la página)                      │
          └─ render HTML → dist/nosotros/index.html  (estático, con data-source)  ◄────┘

PREBUILD (script npm, antes de astro build):
  src/infra/snapshot.ts consulta Supabase (publishable key, solo published)
    → escribe src/data/**/**.fallback.json { fetchedAt, source:'supabase', data }
    → si Supabase no responde: no escribe nada; queda el .fallback.json anterior (versionado)
```

## 4. Flujo de datos: panel (runtime)

```
Navegador → GET /administrator/eventos
  middleware.ts: @supabase/ssr lee cookies → supabase.auth.getUser()
    sin sesión  → render de /administrator/login (status 200, sin redirect)
    con sesión  → Astro.locals.user / Astro.locals.profile ; next()
  page.astro (prerender=false): container.getContentRepository(locals)
    → SupabaseContentRepository con el JWT del usuario
    → Postgres aplica RLS (auth_role(), auth_area()) — el servidor no re-filtra

Navegador → POST /administrator/api/uploads/sign
  valida sesión + can_edit_gallery → responde firma (secreto nunca sale)
Navegador → PUT  Cloudinary (directo, con firma)
Navegador → POST /administrator/api/galleries/:id/photos  → insert gallery_photos (RLS)
```

## 5. Qué NO se rompe (mapa de riesgo)

| Cambio | Riesgo | Mitigación |
|---|---|---|
| `adapter: vercel()` en `astro.config.mjs` | Que una página pública pase a on-demand | `prerender=false` solo por archivo admin; test de build que cuenta HTML estáticos y funciones |
| `src/middleware.ts` nuevo | Overhead o interferencia en páginas públicas | Guard temprano por prefijo `/administrator` |
| Lectura de Supabase en build | Que `pnpm build` falle si Supabase está caído | `CompositeContentRepository` con try/catch y cadena de fallback; el deploy anterior sigue vivo |
| `output: 'static'` explícito | — | Es el valor que ya estaba implícito; sin efecto |
