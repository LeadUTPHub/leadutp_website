import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Frontera de build (regla inquebrantable 9 / ARCHITECTURE.md §4.3):
 * las páginas públicas siguen 100% prerenderizadas y ninguna ruta pasa
 * a función serverless mientras no exista `/administrator/**`.
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

function countHtmlFiles(dir: string): number {
	return readdirSync(dir).reduce((count, entry) => {
		const fullPath = join(dir, entry);
		if (statSync(fullPath).isDirectory()) {
			return count + countHtmlFiles(fullPath);
		}
		return count + (entry.endsWith('.html') ? 1 : 0);
	}, 0);
}

function hasServerlessFunctions(): boolean {
	if (!existsSync(FUNCTIONS_DIR)) return false;
	return readdirSync(FUNCTIONS_DIR).length > 0;
}

describe.skipIf(!existsSync(DIST_DIR))(
	'Frontera de build: público estático, admin on-demand (T0.6)',
	() => {
		it(`genera ${EXPECTED_STATIC_HTML_COUNT} páginas HTML públicas prerenderizadas`, () => {
			expect(countHtmlFiles(DIST_DIR)).toBe(EXPECTED_STATIC_HTML_COUNT);
		});

		it('no genera funciones serverless (sin rutas /administrator todavía)', () => {
			expect(hasServerlessFunctions()).toBe(false);
		});
	},
);
