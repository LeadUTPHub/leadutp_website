import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Frontera de build (regla inquebrantable 9 / ARCHITECTURE.md §4.3):
 * las páginas públicas siguen 100% prerenderizadas, y el número de
 * funciones serverless es un valor **fijo y conocido**, no "cero para
 * siempre". Cada vez que un sprint aprueba nuevas rutas `prerender =
 * false`, este archivo se actualiza a propósito — si el conteo cambia
 * sin que alguien haya tocado `EXPECTED_FUNCTION_COUNT`, el test falla
 * y obliga a revisar qué ruta nueva se volvió dinámica.
 *
 * Requiere que ya haya corrido `pnpm build` (genera dist/ y
 * .vercel/output/). Si no corrió, se salta en vez de fallar en falso.
 */
const ROOT = process.cwd();
const DIST_DIR = join(ROOT, 'dist');
const FUNCTIONS_DIR = join(ROOT, '.vercel', 'output', 'functions');

// 8 páginas top-level (/, /nosotros, /proyectos, /eventos, /pilares,
// /vida-lead, /internacional, /convocatorias, /404 = 9)... ver desglose
// exacto abajo. Hoy: 15 archivos HTML (8 top-level + 404 + /pilares
// índice + 6 slugs de pilar). Ver CONTEXT.md y REQUISITOS_ADMIN.md §2.
const EXPECTED_STATIC_HTML_COUNT = 15;

// Sprint 2 (T2.4/T2.5): `/administrator/login`, `/administrator`,
// `/administrator/logout` son `prerender = false`. @astrojs/vercel las
// empaqueta TODAS en una sola función (`_render.func`) porque no se usa
// `functionPerRoute` — por eso el número esperado es 1, no 3. Si en un
// sprint futuro se activa `functionPerRoute` o aparece una función
// aparte, este número debe subir a propósito, con su propio commit.
const EXPECTED_FUNCTION_COUNT = 1;

function countHtmlFiles(dir: string): number {
	return readdirSync(dir).reduce((count, entry) => {
		const fullPath = join(dir, entry);
		if (statSync(fullPath).isDirectory()) {
			return count + countHtmlFiles(fullPath);
		}
		return count + (entry.endsWith('.html') ? 1 : 0);
	}, 0);
}

function countServerlessFunctions(): number {
	if (!existsSync(FUNCTIONS_DIR)) return 0;
	return readdirSync(FUNCTIONS_DIR, { withFileTypes: true }).filter(
		(entry) => entry.isDirectory() && entry.name.endsWith('.func'),
	).length;
}

describe.skipIf(!existsSync(DIST_DIR))(
	'Frontera de build: público estático, admin on-demand (T0.6 / Sprint 2)',
	() => {
		it(`genera ${EXPECTED_STATIC_HTML_COUNT} páginas HTML públicas prerenderizadas`, () => {
			expect(countHtmlFiles(DIST_DIR)).toBe(EXPECTED_STATIC_HTML_COUNT);
		});

		it(`genera exactamente ${EXPECTED_FUNCTION_COUNT} función(es) serverless — solo /administrator/**`, () => {
			expect(countServerlessFunctions()).toBe(EXPECTED_FUNCTION_COUNT);
		});
	},
);
