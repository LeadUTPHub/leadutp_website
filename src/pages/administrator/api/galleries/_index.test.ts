import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GallerySlugConflictError } from '../../../../infra/supabase/SupabaseContentRepository';
import type { GalleryWithPhotoCount } from '../../../../domain/ports/ContentRepository';
import type { Profile } from '../../../../domain/types';

// Nombre con `_` a propósito — ver MEMORY.md L21 (Astro trata todo
// archivo sin `_` bajo src/pages/ como una ruta).
const listGalleries = vi.fn();
const createGallery = vi.fn();

vi.mock('../../../../infra/container', () => ({
	getContentRepositoryForRequest: () => ({
		listPointers: vi.fn(),
		createPointer: vi.fn(),
		updatePointer: vi.fn(),
		deletePointer: vi.fn(),
		resolve: vi.fn(),
		listGalleries,
		createGallery,
	}),
}));

const { GET, POST } = await import('./index');

function fakeContext(opts: { profile?: Profile | null; body?: unknown; rawBody?: string }) {
	const request = new Request('http://localhost/administrator/api/galleries', {
		method: opts.body === undefined && opts.rawBody === undefined ? 'GET' : 'POST',
		...(opts.rawBody !== undefined && { body: opts.rawBody }),
		...(opts.rawBody === undefined &&
			opts.body !== undefined && { body: JSON.stringify(opts.body) }),
	});

	return {
		locals: { profile: opts.profile ?? null },
		request,
		cookies: { set: vi.fn() },
	} as never;
}

const DIRECTOR: Profile = {
	id: 'director-id',
	fullName: 'Directora de Liderazgo',
	role: 'director',
	areaSlug: 'liderazgo',
	isActive: true,
};

const SUPER_ADMIN: Profile = {
	id: 'super-admin-id',
	fullName: 'Super Admin',
	role: 'super_admin',
	areaSlug: null,
	isActive: true,
};

const SAMPLE_GALLERY: GalleryWithPhotoCount = {
	id: 'gallery-id',
	title: 'Talent Room',
	slug: 'talent-room-2026-05',
	body: null,
	happenedOn: null,
	pillarSlug: null,
	areaSlug: 'liderazgo',
	ownerId: 'director-id',
	published: false,
	source: 'supabase',
	photoCount: 3,
};

beforeEach(() => {
	listGalleries.mockReset();
	createGallery.mockReset();
});

describe('GET /administrator/api/galleries', () => {
	it('devuelve 200 con las galerías (incluye photoCount, sin source)', async () => {
		listGalleries.mockResolvedValue([SAMPLE_GALLERY]);

		const response = await GET(fakeContext({ profile: DIRECTOR }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.galleries[0]).not.toHaveProperty('source');
		expect(body.galleries[0]).toMatchObject({ id: 'gallery-id', photoCount: 3 });
	});
});

describe('POST /administrator/api/galleries', () => {
	it('devuelve 401 sin sesión', async () => {
		const response = await POST(
			fakeContext({ profile: null, body: { title: 'x', slug: 'x' } }),
		);
		expect(response.status).toBe(401);
	});

	it('devuelve 422 si falta title', async () => {
		const response = await POST(fakeContext({ profile: DIRECTOR, body: { slug: 'x' } }));
		expect(response.status).toBe(422);
		expect(createGallery).not.toHaveBeenCalled();
	});

	it('devuelve 422 si super_admin no manda areaSlug', async () => {
		const response = await POST(
			fakeContext({ profile: SUPER_ADMIN, body: { title: 'Talent Room', slug: 'x' } }),
		);
		expect(response.status).toBe(422);
	});

	it('crea con el areaSlug del director (nunca el del body) y devuelve 201', async () => {
		createGallery.mockResolvedValue(SAMPLE_GALLERY);

		const response = await POST(
			fakeContext({
				profile: DIRECTOR,
				body: { title: 'Talent Room', slug: 'talent-room-2026-05', areaSlug: 'excelencia-academica' },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body.gallery).toMatchObject({ id: 'gallery-id' });
		expect(createGallery).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Talent Room', slug: 'talent-room-2026-05' }),
			'liderazgo',
		);
	});

	it('devuelve 409 si el slug ya existe', async () => {
		createGallery.mockRejectedValue(new GallerySlugConflictError('talent-room-2026-05'));

		const response = await POST(
			fakeContext({
				profile: DIRECTOR,
				body: { title: 'Talent Room', slug: 'talent-room-2026-05' },
			}),
		);

		expect(response.status).toBe(409);
	});

	it('devuelve 403 si la RLS rechaza el insert', async () => {
		createGallery.mockRejectedValue(new Error('RLS: no autorizado'));

		const response = await POST(
			fakeContext({ profile: DIRECTOR, body: { title: 'Talent Room', slug: 'x' } }),
		);

		expect(response.status).toBe(403);
	});
});
