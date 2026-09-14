#!/usr/bin/env node
/**
 * Script `prebuild` (T5.5) — corre automáticamente antes de `pnpm build`
 * (hook de ciclo de vida de pnpm/npm, ver package.json). Lee `page_blocks`
 * en vivo de Supabase (cliente anon, mismas keys de PAGE_BLOCK_KEYS —
 * 2 desde el Cambio 3, 2026-09-14, D-18: `nosotros.history` ya no es una
 * key válida, la historia se quedó fija en `about.data.ts`) y actualiza
 * `about.fallback.json` / `projects.fallback.json` — el escalón 2 de la
 * cadena de degradación de DOMAIN.md que `loadPageContent.ts` (T5.4) ya
 * sabe leer.
 *
 * Regla que manda (regla inquebrantable 4 + D-02): este script NUNCA puede
 * hacer fallar `pnpm build`. Si Supabase no responde, si faltan las env
 * vars, o si pasa cualquier error inesperado, se loguea una advertencia y
 * se sigue sin tocar los snapshots existentes — el build cae al siguiente
 * escalón de la cadena (snapshot viejo → `.data.ts` → vacío) tal como está
 * diseñado, nunca a un build roto.
 *
 * Corre con Node directo (Node 22.6+/24 soporta TypeScript nativo por
 * "type stripping" — sin `tsx` ni `ts-node`). Por eso, a diferencia del
 * resto del código de `src/`, este archivo no puede depender del grafo de
 * imports "sin extensión" que resuelve Vite: solo importa (a) paquetes de
 * `node_modules` (resolución normal de Node) y (b) `buildPageSnapshots.ts`
 * con extensión explícita — ese módulo es puro y no tiene, a su vez,
 * ningún import en tiempo de ejecución (los `import type` se eliden por
 * completo), así que Node lo puede cargar sin más resolución. Mismo
 * espíritu que `verify-cloudinary-upload.mjs` (Sprint 0, L9): scripts
 * fuera de Astro/Vite se mantienen deliberadamente independientes del
 * resto del árbol de módulos.
 *
 * Uso manual (igual que el resto de scripts/*, ver L9):
 *   node --env-file-if-exists=.env scripts/generate-page-snapshots.ts
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import type {
	AboutSnapshotContent,
	FetchOutcome,
} from '../src/infra/content/buildPageSnapshots.ts';
import {
	buildAboutSnapshot,
	buildProjectsSnapshot,
} from '../src/infra/content/buildPageSnapshots.ts';
import type { TeamMember } from '../src/data/about/about.types.ts';
import type { Project } from '../src/data/projects/projects.types.ts';
import {
	PAGE_BLOCK_KEYS,
	validatePageBlockData,
} from '../src/domain/validatePageBlockData.ts';

const ROOT_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ABOUT_SNAPSHOT_PATH = join(
	ROOT_DIR,
	'src/data/about/about.fallback.json',
);
const PROJECTS_SNAPSHOT_PATH = join(
	ROOT_DIR,
	'src/data/projects/projects.fallback.json',
);

function log(message: string): void {
	console.log(`[prebuild] ${message}`);
}

function warn(message: string): void {
	console.warn(`[prebuild] ${message}`);
}

function readJsonIfExists<T>(path: string): T | null {
	if (!existsSync(path)) return null;
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as T;
	} catch {
		// Snapshot corrupto (edición manual, commit a medias): se trata como
		// si no existiera. Si Supabase responde, se regenera solo; si no
		// responde, queda como estaba (corrupto) — no es peor que antes de
		// correr este script, y no vale la pena inventar una reparación acá.
		warn(`${path} no es JSON válido, se ignora como snapshot previo.`);
		return null;
	}
}

/** `null` de entrada = borrar el archivo si existe. Nunca escribe un
 * archivo vacío nuevo — mismo criterio en ambos snapshots. Si el contenido
 * ya está actualizado (caso típico: Supabase no respondió y `next` es
 * exactamente `current`), no reescribe — evita bumpear el mtime y ensuciar
 * el diff de un archivo versionado (D-02) en cada build sin cambio real. */
function applySnapshot(path: string, next: unknown | null): void {
	const name = path.split(/[\\/]/).pop();

	if (next === null) {
		if (existsSync(path)) {
			rmSync(path);
			log(`${name}: sin contenido publicado, snapshot eliminado.`);
		}
		return;
	}

	const serialized = `${JSON.stringify(next, null, '\t')}\n`;
	if (existsSync(path) && readFileSync(path, 'utf8') === serialized) {
		return;
	}

	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, serialized, 'utf8');
	log(`${name}: actualizado.`);
}

/**
 * Lee las 3 keys en una sola consulta. `anon` (RLS de schema.sql §9.2) ya
 * filtra a `published = true` — una key ausente en el resultado significa
 * "no publicada", no "no existe la tabla" (eso sería `error`).
 */
async function fetchPublishedBlocks(
	url: string,
	publishableKey: string,
): Promise<Map<string, unknown> | null> {
	const client = createClient(url, publishableKey);
	const { data, error } = await client
		.from('page_blocks')
		.select('key, data')
		.in('key', PAGE_BLOCK_KEYS);

	if (error) {
		warn(
			`Supabase respondió con un error leyendo page_blocks: ${error.message}`,
		);
		return null;
	}

	const byKey = new Map<string, unknown>();
	for (const row of data ?? []) {
		byKey.set(row.key as string, row.data);
	}
	return byKey;
}

/**
 * Traduce la fila cruda de Supabase a `FetchOutcome<T>`, revalidando con el
 * mismo validador que el endpoint de guardado (T5.2) usa al escribir — así
 * una fila con forma inválida (ej. escrita antes de un cambio de
 * validador) nunca "envenena" el snapshot: se trata igual que si Supabase
 * no hubiera respondido para esa key en particular (se preserva lo que ya
 * había). Mismo principio que `resolvePageContent.ts` aplica del lado de
 * la lectura en build-time.
 */
function outcomeFor<T>(
	rows: Map<string, unknown> | null,
	key: (typeof PAGE_BLOCK_KEYS)[number],
	unwrap: (raw: unknown) => T,
): FetchOutcome<T> {
	if (rows === null) return { ok: false };
	if (!rows.has(key)) return { ok: true, value: null };

	const raw = rows.get(key);
	const result = validatePageBlockData(key, raw);
	if (!result.ok) {
		warn(
			`page_blocks."${key}" tiene una forma inválida (${result.error}), se ignora.`,
		);
		return { ok: false };
	}
	return { ok: true, value: unwrap(raw) };
}

async function main(): Promise<void> {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const publishableKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	let rows: Map<string, unknown> | null = null;
	if (!url || !publishableKey) {
		warn(
			'PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_PUBLISHABLE_KEY no configuradas — se deja cada snapshot existente tal cual (si hay uno).',
		);
	} else {
		rows = await fetchPublishedBlocks(url, publishableKey).catch(
			(error: unknown) => {
				const message = error instanceof Error ? error.message : String(error);
				warn(
					`No se pudo leer page_blocks de Supabase: ${message}. Se deja cada snapshot existente tal cual.`,
				);
				return null;
			},
		);
	}

	const currentAbout =
		readJsonIfExists<AboutSnapshotContent>(ABOUT_SNAPSHOT_PATH);
	const nextAbout = buildAboutSnapshot({
		current: currentAbout,
		team: outcomeFor(rows, 'nosotros.team', (raw) => raw as TeamMember[]),
	});
	applySnapshot(ABOUT_SNAPSHOT_PATH, nextAbout);

	const currentProjects = readJsonIfExists<Project[]>(PROJECTS_SNAPSHOT_PATH);
	const nextProjects = buildProjectsSnapshot(
		currentProjects,
		outcomeFor(rows, 'proyectos.list', (raw) => raw as Project[]),
	);
	applySnapshot(PROJECTS_SNAPSHOT_PATH, nextProjects);
}

main().catch((error: unknown) => {
	// Última red de seguridad: ni un bug de este script puede tirar el
	// build (regla inquebrantable 4). Se loguea y se sigue sin actualizar
	// nada — el peor caso es construir sobre el snapshot/.data.ts viejo.
	const message = error instanceof Error ? error.message : String(error);
	warn(`Error inesperado, se continúa sin actualizar snapshots: ${message}`);
});
