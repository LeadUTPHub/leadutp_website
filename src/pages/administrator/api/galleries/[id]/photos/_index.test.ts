import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GalleryPhoto } from '../../../../../../domain/ports/ContentRepository';
import type { Profile } from '../../../../../../domain/types';

const createPhoto = vi.fn();

vi.mock('../../../../../../infra/container', () => ({
	getContentRepositoryForRequest: () => ({
		listPointers: vi.fn(),
		createPointer: vi.fn(),
		updatePointer: vi.fn(),
		deletePointer: vi.fn(),
		resolve: vi.fn(),
		createPhoto,
	}),
}));

const { POST } = await import('./index');

function fakeContext(opts: {
	profile?: Profile | null;
	galleryId?: string;
	body?: unknown;
	rawBody?: string;
}) {
	const request = new Request(
		'http://localhost/administrator/api/galleries/gallery-id/photos',
		{
			method: 'POST',
			...(opts.rawBody !== undefined && { body: opts.rawBody }),
			...(opts.rawBody === undefined &&
				opts.body !== undefined && { body: JSON.stringify(opts.body) }),
		},
	);

	return {
		locals: { profile: opts.profile ?? null },
		request,
		params: { id: opts.galleryId ?? 'gallery-id' },
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

const SAMPLE_PHOTO: GalleryPhoto = {
	id: 'photo-id',
	galleryId: 'gallery-id',
	cloudinaryPublicId: 'lead-utp/x/abc123',
	secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/abc123.jpg',
	width: 1600,
	height: 1067,
	alt: 'Ponencia',
	position: 3,
	source: 'cloudinary',
};

const VALID_BODY = {
	cloudinaryPublicId: 'lead-utp/x/abc123',
	secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/abc123.jpg',
	width: 1600,
	height: 1067,
	alt: 'Ponencia',
};

beforeEach(() => {
	createPhoto.mockReset();
});

describe('POST /administrator/api/galleries/:id/photos', () => {
	it('devuelve 401 sin sesión', async () => {
		const response = await POST(fakeContext({ profile: null, body: VALID_BODY }));
		expect(response.status).toBe(401);
	});

	it('devuelve 422 si falta cloudinaryPublicId/secureUrl', async () => {
		const response = await POST(fakeContext({ profile: DIRECTOR, body: {} }));
		expect(response.status).toBe(422);
		expect(createPhoto).not.toHaveBeenCalled();
	});

	it('crea la foto y devuelve 201 con position calculada por el repo', async () => {
		createPhoto.mockResolvedValue(SAMPLE_PHOTO);

		const response = await POST(fakeContext({ profile: DIRECTOR, body: VALID_BODY }));
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(createPhoto).toHaveBeenCalledWith(
			'gallery-id',
			expect.objectContaining({ cloudinaryPublicId: 'lead-utp/x/abc123' }),
		);
		expect(body.photo).toMatchObject({ id: 'photo-id', position: 3 });
	});

	it('devuelve 404 si la galería no existe (violación de FK)', async () => {
		createPhoto.mockRejectedValue(
			Object.assign(new Error('foreign key violation'), { code: '23503' }),
		);

		const response = await POST(fakeContext({ profile: DIRECTOR, body: VALID_BODY }));
		expect(response.status).toBe(404);
	});

	it('devuelve 403 si la RLS rechaza el insert', async () => {
		createPhoto.mockRejectedValue(new Error('RLS: no autorizado'));

		const response = await POST(fakeContext({ profile: DIRECTOR, body: VALID_BODY }));
		expect(response.status).toBe(403);
	});
});
