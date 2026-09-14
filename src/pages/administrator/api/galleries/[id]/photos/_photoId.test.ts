import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GalleryPhoto } from '../../../../../../domain/ports/ContentRepository';
import type { Profile } from '../../../../../../domain/types';

const updatePhoto = vi.fn();
const deletePhoto = vi.fn();
const destroy = vi.fn();

vi.mock('../../../../../../infra/container', () => ({
	getContentRepositoryForRequest: () => ({
		listPointers: vi.fn(),
		createPointer: vi.fn(),
		updatePointer: vi.fn(),
		deletePointer: vi.fn(),
		resolve: vi.fn(),
		updatePhoto,
		deletePhoto,
	}),
	getPhotoStorage: () => ({ sign: vi.fn(), deliveryUrl: vi.fn(), destroy }),
}));

const { PATCH, DELETE } = await import('./[photoId]');

function fakeContext(opts: {
	profile?: Profile | null;
	galleryId?: string;
	photoId?: string;
	body?: unknown;
	rawBody?: string;
	method: 'PATCH' | 'DELETE';
}) {
	const request = new Request(
		'http://localhost/administrator/api/galleries/gallery-id/photos/photo-id',
		{
			method: opts.method,
			...(opts.rawBody !== undefined && { body: opts.rawBody }),
			...(opts.rawBody === undefined &&
				opts.body !== undefined && { body: JSON.stringify(opts.body) }),
		},
	);

	return {
		locals: { profile: opts.profile ?? null },
		request,
		params: { id: opts.galleryId ?? 'gallery-id', photoId: opts.photoId ?? 'photo-id' },
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
	width: 800,
	height: 600,
	alt: 'nuevo alt',
	position: 0,
	source: 'cloudinary',
};

beforeEach(() => {
	updatePhoto.mockReset();
	deletePhoto.mockReset();
	destroy.mockReset();
});

describe('PATCH /administrator/api/galleries/:id/photos/:photoId', () => {
	it('devuelve 401 sin sesión', async () => {
		const response = await PATCH(fakeContext({ profile: null, method: 'PATCH' }));
		expect(response.status).toBe(401);
	});

	it('devuelve 422 si position es negativo', async () => {
		const response = await PATCH(
			fakeContext({ profile: DIRECTOR, method: 'PATCH', body: { position: -1 } }),
		);
		expect(response.status).toBe(422);
		expect(updatePhoto).not.toHaveBeenCalled();
	});

	it('devuelve 404 si el repositorio devuelve null', async () => {
		updatePhoto.mockResolvedValue(null);
		const response = await PATCH(
			fakeContext({ profile: DIRECTOR, method: 'PATCH', body: { alt: 'x' } }),
		);
		expect(response.status).toBe(404);
	});

	it('devuelve 200 con la foto actualizada', async () => {
		updatePhoto.mockResolvedValue(SAMPLE_PHOTO);
		const response = await PATCH(
			fakeContext({
				profile: DIRECTOR,
				method: 'PATCH',
				body: { alt: 'nuevo alt', position: 0 },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(updatePhoto).toHaveBeenCalledWith('gallery-id', 'photo-id', {
			alt: 'nuevo alt',
			position: 0,
		});
		expect(body.photo).toMatchObject({ id: 'photo-id', alt: 'nuevo alt' });
	});
});

describe('DELETE /administrator/api/galleries/:id/photos/:photoId', () => {
	it('devuelve 401 sin sesión', async () => {
		const response = await DELETE(fakeContext({ profile: null, method: 'DELETE' }));
		expect(response.status).toBe(401);
	});

	it('devuelve 404 si el repositorio devuelve null, sin llamar a destroy', async () => {
		deletePhoto.mockResolvedValue(null);
		const response = await DELETE(fakeContext({ profile: DIRECTOR, method: 'DELETE' }));
		expect(response.status).toBe(404);
		expect(destroy).not.toHaveBeenCalled();
	});

	it('borra la fila y limpia el asset en Cloudinary (best-effort), devuelve 204', async () => {
		deletePhoto.mockResolvedValue(SAMPLE_PHOTO);
		destroy.mockResolvedValue(undefined);

		const response = await DELETE(fakeContext({ profile: DIRECTOR, method: 'DELETE' }));

		expect(response.status).toBe(204);
		expect(destroy).toHaveBeenCalledWith('lead-utp/x/abc123');
	});

	it('sigue devolviendo 204 aunque destroy() falle', async () => {
		deletePhoto.mockResolvedValue(SAMPLE_PHOTO);
		destroy.mockRejectedValue(new Error('Cloudinary caído'));

		const response = await DELETE(fakeContext({ profile: DIRECTOR, method: 'DELETE' }));

		expect(response.status).toBe(204);
	});
});
