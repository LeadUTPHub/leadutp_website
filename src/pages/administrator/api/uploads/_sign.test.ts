import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Gallery } from '../../../../domain/ports/ContentRepository';
import type { Profile } from '../../../../domain/types';

// Nombre con `_` a propósito (ver src/pages/administrator/api/event-pointers/_index.test.ts):
// cualquier archivo bajo src/pages/ sin ese prefijo es una ruta para Astro.
const getGallery = vi.fn();
const canEditGallery = vi.fn();
const sign = vi.fn();

vi.mock('../../../../infra/container', () => ({
	getContentRepositoryForRequest: () => ({
		listPointers: vi.fn(),
		createPointer: vi.fn(),
		updatePointer: vi.fn(),
		deletePointer: vi.fn(),
		resolve: vi.fn(),
		getGallery,
		canEditGallery,
	}),
	getPhotoStorage: () => ({ sign, deliveryUrl: vi.fn() }),
}));

const { POST } = await import('./sign');

function fakeContext(opts: { profile?: Profile | null; body?: unknown; rawBody?: string }) {
	const request = new Request('http://localhost/administrator/api/uploads/sign', {
		method: 'POST',
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

beforeEach(() => {
	getGallery.mockReset();
	canEditGallery.mockReset();
	sign.mockReset();
});

describe('POST /administrator/api/uploads/sign', () => {
	it('devuelve 401 sin sesión', async () => {
		const response = await POST(
			fakeContext({ profile: null, body: { galleryId: 'gallery-id' } }),
		);
		expect(response.status).toBe(401);
	});

	it('devuelve 400 con JSON inválido', async () => {
		const response = await POST(fakeContext({ profile: DIRECTOR, rawBody: '{ mal' }));
		expect(response.status).toBe(400);
	});

	it('devuelve 422 sin galleryId (mismo criterio que event-pointers: 400 = JSON malformado, 422 = validación)', async () => {
		const response = await POST(fakeContext({ profile: DIRECTOR, body: {} }));
		expect(response.status).toBe(422);
		expect(getGallery).not.toHaveBeenCalled();
	});

	it('devuelve 404 si la galería no existe', async () => {
		getGallery.mockResolvedValue(null);

		const response = await POST(
			fakeContext({ profile: DIRECTOR, body: { galleryId: 'no-existe' } }),
		);

		expect(response.status).toBe(404);
		expect(canEditGallery).not.toHaveBeenCalled();
	});

	it('devuelve 403 si el actor no puede editar la galería', async () => {
		getGallery.mockResolvedValue(SAMPLE_GALLERY);
		canEditGallery.mockResolvedValue(false);

		const response = await POST(
			fakeContext({ profile: DIRECTOR, body: { galleryId: 'gallery-id' } }),
		);

		expect(response.status).toBe(403);
		expect(sign).not.toHaveBeenCalled();
	});

	it('devuelve 503 si Cloudinary no está configurado (sign() tira)', async () => {
		getGallery.mockResolvedValue(SAMPLE_GALLERY);
		canEditGallery.mockResolvedValue(true);
		sign.mockRejectedValue(new Error('PhotoStorage no configurado todavía (Sprint 4).'));

		const response = await POST(
			fakeContext({ profile: DIRECTOR, body: { galleryId: 'gallery-id' } }),
		);

		expect(response.status).toBe(503);
	});

	it('devuelve 200 con la firma (incluye allowedFormats/maxFileSize), folder = lead-utp/<area>/<slug>', async () => {
		getGallery.mockResolvedValue(SAMPLE_GALLERY);
		canEditGallery.mockResolvedValue(true);
		sign.mockResolvedValue({
			timestamp: 1700000000,
			signature: 'abc123',
			apiKey: 'key',
			cloudName: 'leadutp',
			folder: 'lead-utp/liderazgo/talent-room-2026-05',
			allowedFormats: 'jpg,png,webp',
			maxFileSize: 10_485_760,
		});

		const response = await POST(
			fakeContext({ profile: DIRECTOR, body: { galleryId: 'gallery-id' } }),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(sign).toHaveBeenCalledWith('lead-utp/liderazgo/talent-room-2026-05');
		expect(body).toMatchObject({
			timestamp: 1700000000,
			signature: 'abc123',
			apiKey: 'key',
			cloudName: 'leadutp',
			folder: 'lead-utp/liderazgo/talent-room-2026-05',
			allowedFormats: 'jpg,png,webp',
			maxFileSize: 10_485_760,
		});
	});
});
