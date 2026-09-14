import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SupabaseContentRepository } from './SupabaseContentRepository';

// Contrato de canEditGallery() (T4.2) contra Supabase real — mismo patrón
// que SupabaseContentRepository.pointers.test.ts (T3.2). canEditGallery()
// llama al RPC can_edit_gallery(g_id) ya definido en schema.sql §8, así
// que este test también corrobora esa función SQL contra los 3 usuarios
// de prueba reales, no solo el wrapper de TS.
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
	'SupabaseContentRepository.canEditGallery() — RPC can_edit_gallery (T4.2)',
	() => {
		const AREA = 'liderazgo' as const;
		const OTHER_AREA = 'desarrollo-profesional' as const;

		let superAdminClient: SupabaseClient;
		let directorClient: SupabaseClient;
		let subdirectorClient: SupabaseClient;

		let superAdminRepo: SupabaseContentRepository;
		let directorRepo: SupabaseContentRepository;
		let subdirectorRepo: SupabaseContentRepository;

		let galleryOwnedByDirector: string;
		let galleryOwnedBySubdirector: string;
		let galleryInOtherArea: string;

		beforeAll(async () => {
			superAdminClient = await signInAs(
				CREDS.superAdmin.email!,
				CREDS.superAdmin.password!,
			);
			directorClient = await signInAs(CREDS.director.email!, CREDS.director.password!);
			subdirectorClient = await signInAs(
				CREDS.subdirector.email!,
				CREDS.subdirector.password!,
			);

			superAdminRepo = new SupabaseContentRepository(superAdminClient);
			directorRepo = new SupabaseContentRepository(directorClient);
			subdirectorRepo = new SupabaseContentRepository(subdirectorClient);

			const { data: profiles, error } = await superAdminClient
				.from('profiles')
				.select('id, role, area_slug')
				.in('role', ['director', 'subdirector']);
			if (error) throw error;

			const directorId = profiles?.find(
				(p) => p.role === 'director' && p.area_slug === AREA,
			)?.id;
			const subdirectorId = profiles?.find(
				(p) => p.role === 'subdirector' && p.area_slug === AREA,
			)?.id;
			if (!directorId || !subdirectorId) {
				throw new Error(
					`No se encontró el director/subdirector de '${AREA}' en profiles.`,
				);
			}

			const slug = (suffix: string) => `test-canEditGallery-${Date.now()}-${suffix}`;
			const { data: inserted, error: insertError } = await superAdminClient
				.from('event_galleries')
				.insert([
					{ title: 'del director', slug: slug('director'), area_slug: AREA, owner_id: directorId },
					{ title: 'del subdirector', slug: slug('subdirector'), area_slug: AREA, owner_id: subdirectorId },
					{ title: 'de otra área', slug: slug('otra-area'), area_slug: OTHER_AREA, owner_id: directorId },
				])
				.select('id, title');
			if (insertError) throw insertError;

			galleryOwnedByDirector = inserted!.find((g) => g.title === 'del director')!.id;
			galleryOwnedBySubdirector = inserted!.find(
				(g) => g.title === 'del subdirector',
			)!.id;
			galleryInOtherArea = inserted!.find((g) => g.title === 'de otra área')!.id;
		});

		afterAll(async () => {
			await superAdminClient
				.from('event_galleries')
				.delete()
				.in('id', [galleryOwnedByDirector, galleryOwnedBySubdirector, galleryInOtherArea]);
			await Promise.all([
				superAdminClient.auth.signOut(),
				directorClient.auth.signOut(),
				subdirectorClient.auth.signOut(),
			]);
		});

		it('director puede editar una galería de su área que no creó él', async () => {
			expect(await directorRepo.canEditGallery(galleryOwnedBySubdirector)).toBe(true);
		});

		it('director NO puede editar una galería de otra área', async () => {
			expect(await directorRepo.canEditGallery(galleryInOtherArea)).toBe(false);
		});

		it('subdirector puede editar su propia galería', async () => {
			expect(await subdirectorRepo.canEditGallery(galleryOwnedBySubdirector)).toBe(true);
		});

		it('subdirector NO puede editar la galería del director (misma área)', async () => {
			expect(await subdirectorRepo.canEditGallery(galleryOwnedByDirector)).toBe(false);
		});

		it('super_admin puede editar cualquier galería', async () => {
			expect(await superAdminRepo.canEditGallery(galleryInOtherArea)).toBe(true);
		});

		it('devuelve false para un id que no existe', async () => {
			expect(
				await directorRepo.canEditGallery('00000000-0000-0000-0000-000000000000'),
			).toBe(false);
		});

		it('getGallery() mapea la fila (camelCase) para quien puede leerla (staff reads all)', async () => {
			const gallery = await subdirectorRepo.getGallery(galleryOwnedByDirector);
			expect(gallery).toMatchObject({
				id: galleryOwnedByDirector,
				title: 'del director',
				areaSlug: AREA,
			});
		});

		it('getGallery() devuelve null para un id que no existe', async () => {
			expect(
				await directorRepo.getGallery('00000000-0000-0000-0000-000000000000'),
			).toBeNull();
		});
	},
);

describe.skipIf(!HAS_CREDENTIALS)(
	'SupabaseContentRepository — CRUD de galerías y fotos (T4.4)',
	() => {
		const AREA = 'liderazgo' as const;
		const OTHER_AREA = 'desarrollo-profesional' as const;
		const slug = (suffix: string) => `test-crud-${Date.now()}-${suffix}`;

		let superAdminClient: SupabaseClient;
		let directorClient: SupabaseClient;
		let subdirectorClient: SupabaseClient;

		let superAdminRepo: SupabaseContentRepository;
		let directorRepo: SupabaseContentRepository;
		let subdirectorRepo: SupabaseContentRepository;

		const createdGalleryIds: string[] = [];

		beforeAll(async () => {
			superAdminClient = await signInAs(
				CREDS.superAdmin.email!,
				CREDS.superAdmin.password!,
			);
			directorClient = await signInAs(CREDS.director.email!, CREDS.director.password!);
			subdirectorClient = await signInAs(
				CREDS.subdirector.email!,
				CREDS.subdirector.password!,
			);

			superAdminRepo = new SupabaseContentRepository(superAdminClient);
			directorRepo = new SupabaseContentRepository(directorClient);
			subdirectorRepo = new SupabaseContentRepository(subdirectorClient);
		});

		afterAll(async () => {
			if (createdGalleryIds.length > 0) {
				await superAdminClient.from('event_galleries').delete().in('id', createdGalleryIds);
			}
			await Promise.all([
				superAdminClient.auth.signOut(),
				directorClient.auth.signOut(),
				subdirectorClient.auth.signOut(),
			]);
		});

		it('createGallery mapea la entrada completa y fija areaSlug/ownerId', async () => {
			const gallery = await directorRepo.createGallery(
				{
					title: 'Contract test — Talent Room',
					slug: slug('create'),
					body: 'Texto **markdown**',
					happenedOn: '2026-05-10',
					pillarSlug: 'liderazgo',
					published: false,
				},
				AREA,
			);
			createdGalleryIds.push(gallery.id);

			expect(gallery).toMatchObject({
				title: 'Contract test — Talent Room',
				body: 'Texto **markdown**',
				happenedOn: '2026-05-10',
				pillarSlug: 'liderazgo',
				areaSlug: AREA,
				published: false,
			});
			expect(gallery.ownerId).toEqual(expect.any(String));
		});

		it('createGallery con un slug duplicado tira GallerySlugConflictError', async () => {
			const duplicateSlug = slug('conflict');
			const first = await directorRepo.createGallery(
				{ title: 'Original', slug: duplicateSlug },
				AREA,
			);
			createdGalleryIds.push(first.id);

			const { GallerySlugConflictError } = await import('./SupabaseContentRepository');
			await expect(
				directorRepo.createGallery({ title: 'Duplicado', slug: duplicateSlug }, AREA),
			).rejects.toThrow(GallerySlugConflictError);
		});

		it('createGallery con un areaSlug que no es el del actor es rechazado por la RLS', async () => {
			await expect(
				subdirectorRepo.createGallery(
					{ title: 'Intento de otra área', slug: slug('wrong-area') },
					OTHER_AREA,
				),
			).rejects.toThrow();
		});

		it('listGalleries incluye photoCount', async () => {
			const gallery = await directorRepo.createGallery(
				{ title: 'Con fotos', slug: slug('with-photos') },
				AREA,
			);
			createdGalleryIds.push(gallery.id);
			await directorRepo.createPhoto(gallery.id, {
				cloudinaryPublicId: 'lead-utp/test/photo-1',
				secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/photo-1.jpg',
			});

			const galleries = await directorRepo.listGalleries();
			const found = galleries.find((g) => g.id === gallery.id);
			expect(found?.photoCount).toBe(1);
		});

		it('updateGallery: el director puede editar una galería de su área que no creó él', async () => {
			const created = await subdirectorRepo.createGallery(
				{ title: 'Original', slug: slug('update-target') },
				AREA,
			);
			createdGalleryIds.push(created.id);

			const updated = await directorRepo.updateGallery(created.id, {
				title: 'Editado por el director',
			});

			expect(updated).toMatchObject({ id: created.id, title: 'Editado por el director' });
		});

		it('updateGallery: el subdirector NO puede editar la galería de otro dueño (RLS → null)', async () => {
			const created = await directorRepo.createGallery(
				{ title: 'Del director', slug: slug('subdirector-blocked') },
				AREA,
			);
			createdGalleryIds.push(created.id);

			const result = await subdirectorRepo.updateGallery(created.id, {
				title: 'Intento de subdirector',
			});

			expect(result).toBeNull();
		});

		it('createPhoto calcula position = último + 1', async () => {
			const gallery = await directorRepo.createGallery(
				{ title: 'Para fotos', slug: slug('photo-position') },
				AREA,
			);
			createdGalleryIds.push(gallery.id);

			const first = await directorRepo.createPhoto(gallery.id, {
				cloudinaryPublicId: 'lead-utp/test/a',
				secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/a.jpg',
			});
			const second = await directorRepo.createPhoto(gallery.id, {
				cloudinaryPublicId: 'lead-utp/test/b',
				secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/b.jpg',
			});

			expect(first.position).toBe(0);
			expect(second.position).toBe(1);
		});

		it('listPhotos devuelve las fotos ordenadas por position', async () => {
			const gallery = await directorRepo.createGallery(
				{ title: 'Para listar fotos', slug: slug('photo-list') },
				AREA,
			);
			createdGalleryIds.push(gallery.id);
			await directorRepo.createPhoto(gallery.id, {
				cloudinaryPublicId: 'lead-utp/test/x',
				secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/x.jpg',
			});
			await directorRepo.createPhoto(gallery.id, {
				cloudinaryPublicId: 'lead-utp/test/y',
				secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/y.jpg',
			});

			const photos = await directorRepo.listPhotos(gallery.id);
			expect(photos.map((p) => p.cloudinaryPublicId)).toEqual([
				'lead-utp/test/x',
				'lead-utp/test/y',
			]);
		});

		it('updatePhoto reordena y edita alt', async () => {
			const gallery = await directorRepo.createGallery(
				{ title: 'Para editar foto', slug: slug('photo-update') },
				AREA,
			);
			createdGalleryIds.push(gallery.id);
			const photo = await directorRepo.createPhoto(gallery.id, {
				cloudinaryPublicId: 'lead-utp/test/z',
				secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/z.jpg',
			});

			const updated = await directorRepo.updatePhoto(gallery.id, photo.id, {
				alt: 'Nuevo alt',
				position: 5,
			});

			expect(updated).toMatchObject({ id: photo.id, alt: 'Nuevo alt', position: 5 });
		});

		it('deletePhoto devuelve la fila borrada (para poder limpiar Cloudinary después)', async () => {
			const gallery = await directorRepo.createGallery(
				{ title: 'Para borrar foto', slug: slug('photo-delete') },
				AREA,
			);
			createdGalleryIds.push(gallery.id);
			const photo = await directorRepo.createPhoto(gallery.id, {
				cloudinaryPublicId: 'lead-utp/test/delete-me',
				secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/delete-me.jpg',
			});

			const deleted = await directorRepo.deletePhoto(gallery.id, photo.id);
			expect(deleted).toMatchObject({
				id: photo.id,
				cloudinaryPublicId: 'lead-utp/test/delete-me',
			});

			const deletedAgain = await directorRepo.deletePhoto(gallery.id, photo.id);
			expect(deletedAgain).toBeNull();
		});

		it('deleteGallery: el director puede borrar una galería de su área; false si ya no existe', async () => {
			const created = await directorRepo.createGallery(
				{ title: 'Para borrar', slug: slug('gallery-delete') },
				AREA,
			);

			const deleted = await directorRepo.deleteGallery(created.id);
			expect(deleted).toBe(true);

			const deletedAgain = await directorRepo.deleteGallery(created.id);
			expect(deletedAgain).toBe(false);
		});

		it(
			'deleteGallery también borra sus fotos (cascade en DB)',
			async () => {
				const gallery = await directorRepo.createGallery(
					{ title: 'Con fotos a borrar', slug: slug('cascade') },
					AREA,
				);
				await directorRepo.createPhoto(gallery.id, {
					cloudinaryPublicId: 'lead-utp/test/cascade',
					secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/cascade.jpg',
				});

				await directorRepo.deleteGallery(gallery.id);

				const photosAfter = await superAdminRepo.listPhotos(gallery.id);
				expect(photosAfter).toHaveLength(0);
			},
			// 4 round-trips reales secuenciales a Supabase — bajo la carga de
			// correr toda la suite de integración en paralelo, el default de
			// 5000ms puede no alcanzar (visto una vez, no reproducible aislado).
			15000,
		);

		it('super_admin puede borrar cualquier galería', async () => {
			const created = await directorRepo.createGallery(
				{ title: 'Para super_admin', slug: slug('super-admin-delete') },
				AREA,
			);

			const deleted = await superAdminRepo.deleteGallery(created.id);
			expect(deleted).toBe(true);
		});
	},
);
