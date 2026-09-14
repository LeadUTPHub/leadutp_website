import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SupabaseContentRepository } from './SupabaseContentRepository';

// Contrato de getPageBlock()/savePageBlock()/resolve() (T5.2) contra
// Supabase real — mismo patrón que pointers.test.ts (T3.2) y
// galleries.test.ts (T4.2).
//
// Lo que este test verifica de verdad (y no un test unitario con mocks):
// que la RLS de page_blocks con area_slug = NULL se comporta como dice
// MEMORY.md D-13/L27 — solo super_admin escribe contenido institucional.
try {
	process.loadEnvFile();
} catch {
	// Sin .env (CI, otra máquina): el describe.skipIf de abajo salta la suite.
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const CREDS = {
	superAdmin: {
		email: process.env.TEST_SUPER_ADMIN_EMAIL,
		password: process.env.TEST_SUPER_ADMIN_PASSWORD,
	},
	director: {
		email: process.env.TEST_DIRECTOR_EMAIL,
		password: process.env.TEST_DIRECTOR_PASSWORD,
	},
	subdirector: {
		email: process.env.TEST_SUBDIRECTOR_EMAIL,
		password: process.env.TEST_SUBDIRECTOR_PASSWORD,
	},
};

const HAS_CREDENTIALS = Boolean(
	SUPABASE_URL &&
	SUPABASE_PUBLISHABLE_KEY &&
	CREDS.superAdmin.email &&
	CREDS.superAdmin.password &&
	CREDS.director.email &&
	CREDS.director.password &&
	CREDS.subdirector.email &&
	CREDS.subdirector.password,
);

async function signInAs(email: string, password: string) {
	const client = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
	const { error } = await client.auth.signInWithPassword({ email, password });
	if (error) {
		throw new Error(`No se pudo autenticar ${email}: ${error.message}`);
	}
	return client;
}

// Key de prueba: NO se usa ninguna de las 3 reales para no pisar contenido
// que el PO pueda estar cargando en paralelo. La RLS no mira el valor de
// `key`, así que el comportamiento es idéntico.
const TEST_KEY = '_test.page-block';

describe.skipIf(!HAS_CREDENTIALS)(
	'SupabaseContentRepository — page_blocks (T5.2)',
	() => {
		let superAdminClient: SupabaseClient;
		let directorClient: SupabaseClient;
		let subdirectorClient: SupabaseClient;
		let anonClient: SupabaseClient;

		let superAdminRepo: SupabaseContentRepository;
		let directorRepo: SupabaseContentRepository;
		let subdirectorRepo: SupabaseContentRepository;
		let anonRepo: SupabaseContentRepository;

		beforeAll(async () => {
			superAdminClient = await signInAs(
				CREDS.superAdmin.email!,
				CREDS.superAdmin.password!,
			);
			directorClient = await signInAs(
				CREDS.director.email!,
				CREDS.director.password!,
			);
			subdirectorClient = await signInAs(
				CREDS.subdirector.email!,
				CREDS.subdirector.password!,
			);
			anonClient = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);

			superAdminRepo = new SupabaseContentRepository(superAdminClient);
			directorRepo = new SupabaseContentRepository(directorClient);
			subdirectorRepo = new SupabaseContentRepository(subdirectorClient);
			anonRepo = new SupabaseContentRepository(anonClient);

			// Punto de partida limpio por si una corrida anterior se cortó.
			await superAdminClient.from('page_blocks').delete().eq('key', TEST_KEY);
		});

		afterAll(async () => {
			// Limpia solo su propia fila de prueba.
			await superAdminClient.from('page_blocks').delete().eq('key', TEST_KEY);
		});

		it('getPageBlock() devuelve null si la key no existe', async () => {
			expect(await superAdminRepo.getPageBlock(TEST_KEY)).toBeNull();
		});

		it('un super_admin crea el bloque con area_slug NULL', async () => {
			const block = await superAdminRepo.savePageBlock(TEST_KEY, {
				data: { body: 'Primera versión' },
				published: false,
			});

			expect(block).not.toBeNull();
			expect(block!.key).toBe(TEST_KEY);
			expect(block!.data).toEqual({ body: 'Primera versión' });
			expect(block!.areaSlug).toBeNull();
			expect(block!.published).toBe(false);
			expect(block!.source).toBe('supabase');
			expect(block!.updatedAt).toEqual(expect.any(String));
		});

		it('un super_admin actualiza data y published de un bloque existente', async () => {
			const updated = await superAdminRepo.savePageBlock(TEST_KEY, {
				data: { body: 'Segunda versión' },
				published: true,
			});

			expect(updated).not.toBeNull();
			expect(updated!.data).toEqual({ body: 'Segunda versión' });
			expect(updated!.published).toBe(true);
		});

		it('el update NO reescribe ownerId (contrato §5, precondición de L27)', async () => {
			const before = await superAdminRepo.getPageBlock(TEST_KEY);
			await superAdminRepo.savePageBlock(TEST_KEY, {
				data: { body: 'Tercera versión' },
				published: true,
			});
			const after = await superAdminRepo.getPageBlock(TEST_KEY);

			expect(after!.ownerId).toBe(before!.ownerId);
		});

		it('un director NO puede escribir un bloque institucional (area NULL)', async () => {
			const result = await directorRepo.savePageBlock(TEST_KEY, {
				data: { body: 'Intento del director' },
			});
			expect(result).toBeNull();

			// Y el contenido real quedó intacto.
			const block = await superAdminRepo.getPageBlock(TEST_KEY);
			expect(block!.data).toEqual({ body: 'Tercera versión' });
		});

		it('un subdirector NO puede escribir un bloque institucional (area NULL)', async () => {
			const result = await subdirectorRepo.savePageBlock(TEST_KEY, {
				data: { body: 'Intento del subdirector' },
			});
			expect(result).toBeNull();

			const block = await superAdminRepo.getPageBlock(TEST_KEY);
			expect(block!.data).toEqual({ body: 'Tercera versión' });
		});

		it('un director NO puede crear un bloque institucional nuevo', async () => {
			const NEW_KEY = '_test.page-block-director';
			const result = await directorRepo.savePageBlock(NEW_KEY, {
				data: { body: 'Nuevo del director' },
			});
			expect(result).toBeNull();
			expect(await superAdminRepo.getPageBlock(NEW_KEY)).toBeNull();
		});

		it('el staff lee el bloque aunque esté en borrador ("staff reads all")', async () => {
			await superAdminRepo.savePageBlock(TEST_KEY, {
				data: { body: 'Borrador' },
				published: false,
			});

			expect((await directorRepo.getPageBlock(TEST_KEY))!.data).toEqual({
				body: 'Borrador',
			});
			expect((await subdirectorRepo.getPageBlock(TEST_KEY))!.data).toEqual({
				body: 'Borrador',
			});
		});

		it('anon NO lee un bloque en borrador', async () => {
			expect(await anonRepo.getPageBlock(TEST_KEY)).toBeNull();
		});

		it('anon SÍ lee un bloque publicado', async () => {
			await superAdminRepo.savePageBlock(TEST_KEY, {
				data: { body: 'Publicado' },
				published: true,
			});

			const block = await anonRepo.getPageBlock(TEST_KEY);
			expect(block).not.toBeNull();
			expect(block!.data).toEqual({ body: 'Publicado' });
		});

		it('resolve() devuelve el data con su procedencia (source)', async () => {
			const resolved = await anonRepo.resolve<{ body: string }>(TEST_KEY);
			expect(resolved).toEqual({
				data: { body: 'Publicado' },
				source: 'supabase',
			});
		});

		it('resolve() devuelve null si la key no existe (degrada al fallback)', async () => {
			expect(await anonRepo.resolve('_test.no-existe')).toBeNull();
		});

		it('guarda un array como data (proyectos.list / nosotros.team)', async () => {
			const block = await superAdminRepo.savePageBlock(TEST_KEY, {
				data: [{ name: 'Ana Pérez', role: 'Directora' }],
				published: true,
			});

			expect(block!.data).toEqual([{ name: 'Ana Pérez', role: 'Directora' }]);
		});
	},
);
