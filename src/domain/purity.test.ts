import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regla inquebrantable 3 (AGENTS.md): el dominio es puro. No importa
// Astro, Supabase, Cloudinary ni ninguna otra capa (src/infra, src/pages,
// src/components). Este test es la garantía automatizada de esa regla.
const DOMAIN_DIR = join(process.cwd(), 'src', 'domain');

const FORBIDDEN_IMPORTS = [
	/from\s+['"]astro/,
	/from\s+['"]@supabase\//,
	/from\s+['"]cloudinary['"]/,
	/from\s+['"].*\/infra\//,
	/from\s+['"].*\/pages\//,
	/from\s+['"].*\/components\//,
];

function collectTsFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const fullPath = join(dir, entry);
		if (statSync(fullPath).isDirectory()) return collectTsFiles(fullPath);
		return fullPath.endsWith('.ts') && !fullPath.endsWith('.test.ts')
			? [fullPath]
			: [];
	});
}

describe('src/domain es puro (regla inquebrantable 3)', () => {
	// Si src/domain/ no existe todavía, readdirSync lanza y el test falla
	// aquí mismo — ese es el "Rojo" antes de crear el esqueleto.
	const files = collectTsFiles(DOMAIN_DIR);

	it('existen archivos de dominio (puertos + tipos)', () => {
		expect(files.length).toBeGreaterThan(0);
	});

	it.each(files.map((f) => [f.replace(process.cwd(), ''), f] as const))(
		'%s no importa Astro, Supabase, Cloudinary ni otras capas',
		(_label, file) => {
			const content = readFileSync(file, 'utf-8');
			for (const pattern of FORBIDDEN_IMPORTS) {
				expect(content).not.toMatch(pattern);
			}
		},
	);
});
