import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SupabaseContentRepository } from './SupabaseContentRepository';

// Contrato de listPointers/createPointer/updatePointer/deletePointer (T3.2)
// contra Supabase real, con los 3 usuarios de prueba (mismo patrón que
// rls.integration.test.ts, T2.6) — pero acá se llama al ADAPTADOR, no a
// supabase-js crudo, para probar también el mapeo de columnas (snake_case
// ↔ camelCase) y no solo la RLS en sí.
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

describe.skipIf(!HAS_CREDENTIALS)(
	'SupabaseContentRepository — contrato de punteros a Luma (T3.2)',
	() => {
		const AREA = 'liderazgo' as const;
		const OTHER_AREA = 'desarrollo-profesional' as const;
		const testUrl = (suffix: string) =>
			`https://luma.com/test-repo-${Date.now()}-${suffix}`;

		let superAdminClient: SupabaseClient;
		let directorClient: SupabaseClient;
		let subdirectorClient: SupabaseClient;

		let superAdminRepo: SupabaseContentRepository;
		let directorRepo: SupabaseContentRepository;
		let subdirectorRepo: SupabaseContentRepository;

		const createdIds: string[] = [];

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

			superAdminRepo = new SupabaseContentRepository(superAdminClient);
			directorRepo = new SupabaseContentRepository(directorClient);
			subdirectorRepo = new SupabaseContentRepository(subdirectorClient);
		});

		afterAll(async () => {
			if (createdIds.length > 0) {
				await superAdminClient
					.from('luma_event_pointers')
					.delete()
					.in('id', createdIds);
			}
			await Promise.all([
				superAdminClient.auth.signOut(),
				directorClient.auth.signOut(),
				subdirectorClient.auth.signOut(),
			]);
		});

		it('createPointer mapea la tarjeta completa (camelCase ↔ columnas) y fija areaSlug/ownerId', async () => {
			const pointer = await directorRepo.createPointer(
				{
					title: 'Contract test — Talent Room',
					lumaUrl: testUrl('create'),
					eventDate: '2026-05-10T18:00:00Z',
					location: 'Auditorio UTP',
					imageUrl: 'https://res.cloudinary.com/leadutp/image/upload/test.jpg',
					shortDescription: 'Taller de talento y liderazgo estudiantil.',
					pillarSlug: 'liderazgo',
					featured: true,
					published: false,
				},
				AREA,
			);
			createdIds.push(pointer.id);

			expect(pointer).toMatchObject({
				title: 'Contract test — Talent Room',
				location: 'Auditorio UTP',
				imageUrl: 'https://res.cloudinary.com/leadutp/image/upload/test.jpg',
				shortDescription: 'Taller de talento y liderazgo estudiantil.',
				pillarSlug: 'liderazgo',
				areaSlug: AREA,
				featured: true,
				published: false,
			});
			// Postgres devuelve timestamptz como "+00:00", no "Z" — equivalentes,
			// se compara como instante real, no como string exacto.
			expect(new Date(pointer.eventDate!).toISOString()).toBe(
				'2026-05-10T18:00:00.000Z',
			);
			expect(pointer.id).toEqual(expect.any(String));
			expect(pointer.ownerId).toEqual(expect.any(String));
		});

		it('createPointer con un areaSlug que no es el del actor es rechazado por la RLS', async () => {
			await expect(
				subdirectorRepo.createPointer(
					{ title: 'Intento de otra área', lumaUrl: testUrl('wrong-area') },
					OTHER_AREA,
				),
			).rejects.toThrow();
		});

		it('listPointers como staff devuelve el puntero recién creado', async () => {
			const pointers = await directorRepo.listPointers();
			expect(pointers.some((p) => p.id === createdIds[0])).toBe(true);
		});

		it('listPointers como anon (sin sesión) no incluye punteros no publicados', async () => {
			const anonClient = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
			const anonRepo = new SupabaseContentRepository(anonClient);

			const pointers = await anonRepo.listPointers();

			expect(pointers.some((p) => p.id === createdIds[0])).toBe(false);
		});

		it('updatePointer: el director puede editar un puntero de su área que no creó él', async () => {
			const created = await subdirectorRepo.createPointer(
				{ title: 'Original', lumaUrl: testUrl('update-target') },
				AREA,
			);
			createdIds.push(created.id);

			const updated = await directorRepo.updatePointer(created.id, {
				title: 'Editado por el director',
				location: 'Nueva ubicación',
			});

			expect(updated).toMatchObject({
				id: created.id,
				title: 'Editado por el director',
				location: 'Nueva ubicación',
			});
		});

		it('updatePointer: el subdirector NO puede editar un puntero de otro dueño en su misma área (RLS → null)', async () => {
			const created = await directorRepo.createPointer(
				{ title: 'Del director', lumaUrl: testUrl('subdirector-blocked') },
				AREA,
			);
			createdIds.push(created.id);

			const result = await subdirectorRepo.updatePointer(created.id, {
				title: 'Intento de subdirector',
			});

			expect(result).toBeNull();
		});

		it('deletePointer: el director puede borrar un puntero de su área; devuelve false si ya no existe', async () => {
			const created = await directorRepo.createPointer(
				{ title: 'Para borrar', lumaUrl: testUrl('delete-me') },
				AREA,
			);

			const deleted = await directorRepo.deletePointer(created.id);
			expect(deleted).toBe(true);

			const deletedAgain = await directorRepo.deletePointer(created.id);
			expect(deletedAgain).toBe(false);
		});

		it('deletePointer: el super_admin puede borrar cualquier fila', async () => {
			const created = await directorRepo.createPointer(
				{ title: 'Para super_admin', lumaUrl: testUrl('super-admin-delete') },
				AREA,
			);

			const deleted = await superAdminRepo.deletePointer(created.id);
			expect(deleted).toBe(true);
		});
	},
);
