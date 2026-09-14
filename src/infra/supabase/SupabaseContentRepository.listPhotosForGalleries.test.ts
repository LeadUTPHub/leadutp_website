import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseContentRepository } from './SupabaseContentRepository';

// A diferencia de los `*.test.ts` hermanos en esta carpeta (pointers,
// galleries, pageBlocks — todos integration tests contra Supabase real,
// con describe.skipIf sin credenciales), este es un test UNITARIO: no
// necesita red ni cuentas de prueba, siempre corre. La razón es que lo
// que hay que probar acá no es "la RLS se comporta bien" (ya cubierto en
// esos otros archivos), sino "el CÓDIGO arma UNA sola consulta con
// .in(gallery_id), no N con .eq()" — algo que solo se puede verificar
// contando cuántas veces se llama a cada método del builder, para lo
// cual hace falta un cliente falso que registre esas llamadas.
//
// Fix de perf: /eventos (T4.6) llamaba `listPhotos(gallery.id)` una vez
// por galería dentro de un Promise.all — 1 query por galería visible
// (hasta MAX_GALLERIES=4), sumada a listGalleries() y listPointers().
// Medido en la conversación: esto es la causa dominante de que /eventos
// tarde ~900ms-2.5s en pnpm dev (donde el frontmatter corre por
// request), aunque en producción (SSG) el costo se paga una sola vez
// al hacer build.

interface FakeCall {
	method: string;
	args: unknown[];
}

/**
 * Imita lo mínimo del builder encadenable de `@supabase/supabase-js`
 * (`from().select().in()/eq().order()`, thenable) para poder contar
 * exactamente qué se llamó, sin tocar la red.
 */
function createFakeClient(rows: Record<string, unknown>[]) {
	const calls: FakeCall[] = [];
	let fromCallCount = 0;

	const builder = {
		select(...args: unknown[]) {
			calls.push({ method: 'select', args });
			return builder;
		},
		eq(...args: unknown[]) {
			calls.push({ method: 'eq', args });
			return builder;
		},
		in(...args: unknown[]) {
			calls.push({ method: 'in', args });
			return builder;
		},
		order(...args: unknown[]) {
			calls.push({ method: 'order', args });
			return builder;
		},
		then(
			resolve: (result: { data: unknown; error: null }) => void,
		) {
			resolve({ data: rows, error: null });
		},
	};

	const client = {
		from(table: string) {
			fromCallCount++;
			calls.push({ method: 'from', args: [table] });
			return builder;
		},
	};

	return {
		client: client as unknown as SupabaseClient,
		calls,
		getFromCallCount: () => fromCallCount,
	};
}

function photoRow(galleryId: string, id: string, position: number) {
	return {
		id,
		gallery_id: galleryId,
		cloudinary_public_id: `pub-${id}`,
		secure_url: `https://res.cloudinary.com/demo/${id}`,
		width: 800,
		height: 600,
		alt: null,
		position,
		source: 'cloudinary',
	};
}

describe('listPhotosForGalleries — evita el N+1 de listPhotos() por galería', () => {
	it('hace UNA sola consulta con .in(gallery_id, [...]), nunca .eq() por galería', async () => {
		const rows = [
			photoRow('g1', 'p1', 0),
			photoRow('g2', 'p2', 0),
		];
		const { client, calls, getFromCallCount } = createFakeClient(rows);
		const repo = new SupabaseContentRepository(client);

		await repo.listPhotosForGalleries(['g1', 'g2', 'g3']);

		// UNA sola consulta a la tabla, sin importar cuántas galleryIds se
		// pidan — esto es justamente lo que reemplaza al N+1 de N llamadas
		// a listPhotos() (una por galería) en /eventos.
		expect(getFromCallCount()).toBe(1);

		const inCalls = calls.filter((c) => c.method === 'in');
		expect(inCalls).toHaveLength(1);
		expect(inCalls[0].args).toEqual(['gallery_id', ['g1', 'g2', 'g3']]);

		// Nunca se usa .eq() para filtrar por galería individual — si
		// reapareciera, sería porque alguien reintrodujo el loop N+1.
		expect(calls.filter((c) => c.method === 'eq')).toHaveLength(0);
	});

	it('agrupa el resultado en memoria por galleryId', async () => {
		const rows = [photoRow('g1', 'p1', 0), photoRow('g2', 'p2', 0)];
		const { client } = createFakeClient(rows);
		const repo = new SupabaseContentRepository(client);

		const result = await repo.listPhotosForGalleries(['g1', 'g2']);

		expect(Object.keys(result).sort()).toEqual(['g1', 'g2']);
		expect(result.g1).toHaveLength(1);
		expect(result.g1[0]).toMatchObject({ id: 'p1', galleryId: 'g1' });
		expect(result.g2[0]).toMatchObject({ id: 'p2', galleryId: 'g2' });
	});

	it('una galleryId sin fotos no aparece como key en el resultado', async () => {
		const rows = [photoRow('g1', 'p1', 0)];
		const { client } = createFakeClient(rows);
		const repo = new SupabaseContentRepository(client);

		const result = await repo.listPhotosForGalleries(['g1', 'g-sin-fotos']);

		expect(Object.keys(result)).toEqual(['g1']);
		expect(result['g-sin-fotos']).toBeUndefined();
	});

	it('conserva el orden por position ascendente dentro de cada galería, aunque vengan intercaladas', async () => {
		// Filas intercaladas entre dos galerías, ya ordenadas globalmente
		// por position (como pediría el .order('position') de la query) —
		// agrupar debe preservar el orden relativo dentro de cada galería.
		const rows = [
			photoRow('g1', 'p1-pos0', 0),
			photoRow('g2', 'p2-pos1', 1),
			photoRow('g1', 'p1-pos2', 2),
			photoRow('g2', 'p2-pos3', 3),
		];
		const { client } = createFakeClient(rows);
		const repo = new SupabaseContentRepository(client);

		const result = await repo.listPhotosForGalleries(['g1', 'g2']);

		expect(result.g1.map((p) => p.id)).toEqual(['p1-pos0', 'p1-pos2']);
		expect(result.g2.map((p) => p.id)).toEqual(['p2-pos1', 'p2-pos3']);
	});

	it('con un array vacío, no dispara ninguna consulta y devuelve {}', async () => {
		const { client, getFromCallCount } = createFakeClient([]);
		const repo = new SupabaseContentRepository(client);

		const result = await repo.listPhotosForGalleries([]);

		expect(result).toEqual({});
		expect(getFromCallCount()).toBe(0);
	});

	it('propaga el error de Supabase como excepción, igual que listPhotos()', async () => {
		const client = {
			from() {
				return {
					select: () => ({
						in: () => ({
							order: () => ({
								then(resolve: (r: { data: null; error: { message: string } }) => void) {
									resolve({ data: null, error: { message: 'boom' } });
								},
							}),
						}),
					}),
				};
			},
		} as unknown as SupabaseClient;
		const repo = new SupabaseContentRepository(client);

		await expect(repo.listPhotosForGalleries(['g1'])).rejects.toThrow(/boom/);
	});
});
