# LEAD UTP — Website

Sitio web oficial de **LEAD UTP**, construido con [Astro](https://astro.build) 7 + [Tailwind CSS](https://tailwindcss.com) 4.

En producción: **https://leadutp.vercel.app**

## Requisitos

- **Node.js ≥ 22.12** ([nvm](https://github.com/nvm-sh/nvm) o [nvm-windows](https://github.com/coreybutler/nvm-windows) recomendado para manejar versiones)
- **pnpm** — este proyecto usa pnpm, no npm/yarn (hay `pnpm-lock.yaml`, no `package-lock.json`)
  ```sh
  npm install -g pnpm
  ```

No hace falta ninguna cuenta ni variable de entorno para correr el sitio localmente — todo el contenido vive en archivos tipados dentro del repo (ver más abajo).

## Puesta en marcha

```sh
git clone https://github.com/LeadUTPHub/leadutp_website.git
cd leadutp_website
pnpm install
pnpm dev
```

Abrí **http://localhost:4321** — listo.

## Comandos disponibles

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Levanta el servidor de desarrollo en `localhost:4321`, con recarga en caliente |
| `pnpm build` | Genera el build de producción en `./dist/` |
| `pnpm preview` | Sirve el build ya generado, para probarlo como quedaría en producción |
| `pnpm test` | Corre los tests (Vitest) |
| `pnpm test:watch` | Corre los tests en modo watch |
| `pnpm lint` | Corre ESLint sobre todo el proyecto |
| `pnpm format` | Formatea el código con Prettier |
| `pnpm format:check` | Verifica el formato sin modificar archivos |
| `pnpm astro ...` | Acceso directo al CLI de Astro (ej. `pnpm astro check`) |

## Estructura del proyecto

```text
/
├── public/              # Archivos estáticos servidos tal cual (imágenes, favicon, robots.txt)
├── src/
│   ├── assets/          # Imágenes procesadas por Astro (optimización automática)
│   ├── components/      # Componentes .astro, organizados por sección (ui/, layout/, home/, events/, ...)
│   ├── data/            # Contenido del sitio, tipado en TypeScript (ver abajo)
│   ├── layouts/         # Layout base de las páginas
│   ├── pages/           # Rutas del sitio (cada .astro es una página)
│   └── styles/          # CSS global y tokens de diseño (Tailwind)
├── astro.config.mjs
└── package.json
```

### Cómo editar contenido

El contenido (textos, eventos, pilares, fotos) **no vive en un CMS** — son archivos `.data.ts` tipados dentro de `src/data/`, uno por sección: `pillars/`, `events/`, `home/`, `about/`, `projects/`, `openings/`, `international/`, `life/`. Cada carpeta sigue el mismo patrón: un `.data.ts` con el contenido, un `.types.ts` con la forma de los datos, y a veces un `.utils.ts` con funciones auxiliares. Para cambiar un texto o agregar un evento, se edita el `.data.ts` correspondiente — no hace falta tocar los componentes visuales.

## Deploy

El sitio se despliega en [Vercel](https://vercel.com) automáticamente desde la rama `main`. Es un sitio estático (SSG): `pnpm build` genera HTML plano en `dist/`, sin backend ni base de datos.

## Stack

- **[Astro 7](https://astro.build)** (SSG) + TypeScript
- **[Tailwind CSS 4](https://tailwindcss.com)** vía `@tailwindcss/vite` (sin `tailwind.config.js` — los tokens de diseño están en `src/styles/global.css`, dentro de un bloque `@theme`)
- **[@lucide/astro](https://lucide.dev)** para iconos
- **[@vercel/analytics](https://vercel.com/docs/analytics)** y **@vercel/speed-insights** para métricas
- **[@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)** para el sitemap automático
- **ESLint + Prettier** para lint y formato
- **[Vitest](https://vitest.dev)** para tests

## Más información

- [Documentación de Astro](https://docs.astro.build)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)
