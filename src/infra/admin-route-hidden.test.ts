import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * T2.7 — "/administrator" es una ruta oculta (DISENO_TECNICO §1.5):
 * sin enlaces en el sitio público, fuera del sitemap, con Disallow en
 * robots.txt. La seguridad real es la sesión (middleware), esto es
 * solo la parte "no se anuncia".
 */
const ROOT = process.cwd();

function collectAstroFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap((entry) => {
		const fullPath = join(dir, entry);
		if (statSync(fullPath).isDirectory()) return collectAstroFiles(fullPath);
		return fullPath.endsWith('.astro') ? [fullPath] : [];
	});
}

describe('robots.txt bloquea /administrator', () => {
	it('tiene un Disallow explícito para /administrator', () => {
		const robots = readFileSync(join(ROOT, 'public', 'robots.txt'), 'utf-8');
		expect(robots).toMatch(/Disallow:\s*\/administrator/);
	});
});

describe('ningún componente o página pública enlaza a /administrator', () => {
	// Se excluyen los propios archivos del panel: ahí sí es válido que
	// aparezca (por ejemplo, el form de logout con action="/administrator/logout").
	const files = [
		...collectAstroFiles(join(ROOT, 'src', 'components')),
		...collectAstroFiles(join(ROOT, 'src', 'pages')),
		...collectAstroFiles(join(ROOT, 'src', 'layouts')),
	].filter(
		(file) =>
			!file.includes(`${join('src', 'pages', 'administrator')}`) &&
			!file.includes(`${join('src', 'components', 'admin')}`) &&
			!file.endsWith(join('src', 'layouts', 'AdminLayout.astro')),
	);

	it('hay archivos públicos para revisar (guarda contra un filtro roto)', () => {
		expect(files.length).toBeGreaterThan(0);
	});

	it.each(files.map((f) => [f.replace(ROOT, ''), f] as const))(
		'%s no tiene href="/administrator..."',
		(_label, file) => {
			const content = readFileSync(file, 'utf-8');
			expect(content).not.toMatch(/href=["']\/administrator/);
		},
	);
});

describe.skipIf(!existsSync(join(ROOT, 'dist', 'client')))(
	'el sitemap generado no incluye /administrator',
	() => {
		it('ningún sitemap-*.xml menciona administrator', () => {
			const clientDir = join(ROOT, 'dist', 'client');
			const sitemapFiles = readdirSync(clientDir).filter(
				(name) => name.startsWith('sitemap') && name.endsWith('.xml'),
			);
			expect(sitemapFiles.length).toBeGreaterThan(0);

			const combined = sitemapFiles
				.map((name) => readFileSync(join(clientDir, name), 'utf-8'))
				.join('\n');
			expect(combined.toLowerCase()).not.toMatch(/administrator/);
		});
	},
);
