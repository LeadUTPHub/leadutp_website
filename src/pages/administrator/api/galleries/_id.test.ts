import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GallerySlugConflictError } from '../../../../infra/supabase/SupabaseContentRepository';
import type { Gallery, GalleryPhoto } from '../../../../domain/ports/ContentRepository';
import type { Profile } from '../../../../domain/types';

const getGallery = vi.fn();
const updateGallery = vi.fn();
const deleteGallery = vi.fn();
const listPhotos = vi.fn();
const destroy = vi.fn();

vi.mock('../../../../infra/container', () => ({
	getContentRepositoryForRequest: () => ({
		listPointers: vi.fn(),
		createPointer: vi.fn(),
		updatePointer: vi.fn(),
		deletePointer: vi.fn(),
		resolve: vi.fn(),
		getGallery,
		updateGallery,
		deleteGallery,
		listPhotos,
	}),
	getPhotoStorage: () => ({ sign: vi.fn(), deliveryUrl: vi.fn(), destroy }),
}));

const { GET, PATCH, DELETE } = await import('./[id]');

function fakeContext(opts: {
	profile?: Profile | null;
	id?: string;
	body?: unknown;
	rawBody?: string;
	method: 'GET' | 'PATCH' | 'DELETE';
}) {
	const request = new Request('http://localhost/administrator/api/galleries/x', {
		method: opts.method,
		...(opts.rawBody !== undefined && { body: opts.rawBody }),
		...(opts.rawBody === undefined &&
			opts.body !== undefined && { body: JSON.stringify(opts.body) }),
	});

	return {
		locals: { profile: opts.profile ?? null },
		request,
		params: { id: opts.id ?? 'gallery-id' },
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

const SAMPLE_GALLERY: Gallery = {
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
};

const SAMPLE_PHOTO: GalleryPhoto = {
	id: 'photo-id',
	galleryId: 'gallery-id',
	cloudinaryPublicId: 'lead-utp/x/abc123',
	secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/abc123.jpg',
	width: 800,
	height: 600,
	alt: null,
	position: 0,
	source: 'cloudinary',
};

beforeEach(() => {
	getGallery.mockReset();
	updateGallery.mockReset();
	deleteGallery.mockReset();
	listPhotos.mockReset();
	destroy.mockReset();
});

describe('GET /administrator/api/galleries/:id', () => {
	it('devuelve 404 si no existe', async () => {
		getGallery.mockResolvedValue(null);
		const response = await GET(fakeContext({ profile: DIRECTOR, method: 'GET' }));
		expect(response.status).toBe(404);
	});

	it('devuelve 200 con gallery + photos', async () => {
		getGallery.mockResolvedValue(SAMPLE_GALLERY);
		listPhotos.mockResolvedValue([SAMPLE_PHOTO]);

		const response = await GET(fakeContext({ profile: DIRECTOR, method: 'GET' }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.gallery).toMatchObject({ id: 'gallery-id' });
		expect(body.photos).toHaveLength(1);
		expect(body.photos[0]).toMatchObject({ id: 'photo-id' });
	});
});

describe('PATCH /administrator/api/galleries/:id', () => {
	it('devuelve 401 sin sesión', async () => {
		const response = await PATCH(
			fakeContext({ profile: null, method: 'PATCH', body: { title: 'x' } }),
		);
		expect(response.status).toBe(401);
	});

	it('devuelve 422 si un campo presente no pasa la validación', async () => {
		const response = await PATCH(
			fakeContext({ profile: DIRECTOR, method: 'PATCH', body: { title: 'Ta' } }),
		);
		expect(response.status).toBe(422);
		expect(updateGallery).not.toHaveBeenCalled();
	});

	it('devuelve 409 si el slug ya existe', async () => {
		updateGallery.mockRejectedValue(new GallerySlugConflictError('duplicado'));
		const response = await PATCH(
			fakeContext({ profile: DIRECTOR, method: 'PATCH', body: { slug: 'duplicado' } }),
		);
		expect(response.status).toBe(409);
	});

	it('devuelve 404 si el repositorio devuelve null', async () => {
		updateGallery.mockResolvedValue(null);
		const response = await PATCH(
			fakeContext({ profile: DIRECTOR, method: 'PATCH', body: { title: 'Nuevo título' } }),
		);
		expect(response.status).toBe(404);
	});

	it('devuelve 200 con la galería actualizada', async () => {
		updateGallery.mockResolvedValue(SAMPLE_GALLERY);
		const response = await PATCH(
			fakeContext({ profile: DIRECTOR, method: 'PATCH', body: { title: 'Talent Room' } }),
		);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.gallery).toMatchObject({ id: 'gallery-id' });
	});
});

describe('DELETE /administrator/api/galleries/:id', () => {
	it('devuelve 401 sin sesión', async () => {
		const response = await DELETE(fakeContext({ profile: null, method: 'DELETE' }));
		expect(response.status).toBe(401);
	});

	it('lee las fotos ANTES de borrar, borra la galería, y limpia cada asset en Cloudinary (best-effort)', async () => {
		listPhotos.mockResolvedValue([SAMPLE_PHOTO]);
		deleteGallery.mockResolvedValue(true);
		destroy.mockResolvedValue(undefined);

		const response = await DELETE(
			fakeContext({ profile: DIRECTOR, method: 'DELETE', id: 'gallery-id' }),
		);

		expect(response.status).toBe(204);
		expect(listPhotos).toHaveBeenCalledWith('gallery-id');
		expect(deleteGallery).toHaveBeenCalledWith('gallery-id');
		expect(destroy).toHaveBeenCalledWith('lead-utp/x/abc123');
	});

	it('devuelve 404 si deleteGallery devuelve false, sin llamar a destroy', async () => {
		listPhotos.mockResolvedValue([]);
		deleteGallery.mockResolvedValue(false);

		const response = await DELETE(fakeContext({ profile: DIRECTOR, method: 'DELETE' }));

		expect(response.status).toBe(404);
		expect(destroy).not.toHaveBeenCalled();
	});

	it('sigue devolviendo 204 aunque destroy() falle en Cloudinary (best-effort)', async () => {
		listPhotos.mockResolvedValue([SAMPLE_PHOTO]);
		deleteGallery.mockResolvedValue(true);
		destroy.mockRejectedValue(new Error('Cloudinary caído'));

		const response = await DELETE(fakeContext({ profile: DIRECTOR, method: 'DELETE' }));

		expect(response.status).toBe(204);
	});
});
