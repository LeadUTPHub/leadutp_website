# LEAD UTP — Website

Sitio web oficial de **LEAD UTP**, construido con [Astro](https://astro.build) y [Tailwind CSS](https://tailwindcss.com).

🔗 Producción: [leadutp.vercel.app](https://leadutp.vercel.app)

## Stack

- **[Astro 7](https://astro.build)** (SSG) + TypeScript
- **[Tailwind CSS 4](https://tailwindcss.com)** vía `@tailwindcss/vite`
- **[@lucide/astro](https://lucide.dev)** para iconos
- **@vercel/analytics** + **@vercel/speed-insights**
- **@astrojs/sitemap** — `sitemap.xml` automático
- **ESLint + Prettier** — lint y formato
- **Vitest** — tests unitarios
- Deploy en **Vercel**

## Requisitos

- Node.js `>= 22.12.0`
- [pnpm](https://pnpm.io)

## Comandos

Todos se corren desde la raíz del proyecto:

| Comando             | Acción                                        |
| :------------------ | :-------------------------------------------- |
| `pnpm install`      | Instala las dependencias                      |
| `pnpm dev`          | Levanta el servidor local en `localhost:4321` |
| `pnpm build`        | Genera el build de producción en `./dist/`    |
| `pnpm preview`      | Sirve el build de producción localmente       |
| `pnpm lint`         | Corre ESLint                                  |
| `pnpm format`       | Formatea el proyecto con Prettier             |
| `pnpm format:check` | Verifica el formato sin escribir cambios      |
| `pnpm test`         | Corre los tests con Vitest                    |
| `pnpm test:watch`   | Corre los tests en modo watch                 |

## Estructura y contenido

El contenido del sitio (eventos, pilares, equipo, proyectos, convocatorias...) vive como datos tipados en `src/data/`, no en un CMS. Cada sección sigue el mismo patrón: `*.data.ts` (los datos), `*.types.ts` (los tipos) e `index.ts` (lo que se exporta). Para editar contenido alcanza con tocar el `.data.ts` correspondiente, sin tocar componentes.

Para el detalle completo de la estructura del proyecto, el estado de cada página y las decisiones de arquitectura, ver [`CONTEXT.md`](./CONTEXT.md). Para la lista de pendientes, ver [`PENDIENTES.md`](./PENDIENTES.md).
