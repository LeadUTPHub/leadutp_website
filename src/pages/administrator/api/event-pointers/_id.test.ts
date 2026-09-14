import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventPointer } from '../../../../domain/ports/ContentRepository';
import type { Profile } from '../../../../domain/types';

// Nombre con `_` a propósito — ver _index.test.ts para el porqué
// (Astro trata todo archivo sin `_` bajo src/pages/ como una ruta).
const updatePointer = vi.fn();
const deletePointer = vi.fn();

vi.mock('../../../../infra/container', () => ({
	getContentRepositoryForRequest: () => ({
		listPointers: vi.fn(),
		createPointer: vi.fn(),
		updatePointer,
		deletePointer,
		resolve: vi.fn(),
	}),
}));

const { PATCH, DELETE } = await import('./[id]');

function fakeContext(opts: {
	profile?: Profile | null;
	id?: string;
	body?: unknown;
	rawBody?: string;
	method: 'PATCH' | 'DELETE';
}) {
	const request = new Request('http://localhost/administrator/api/event-pointers/x', {
		method: opts.method,
		...(opts.rawBody !== undefined && { body: opts.rawBody }),
		...(opts.rawBody === undefined &&
			opts.body !== undefined && { body: JSON.stringify(opts.body) }),
	});

	return {
		locals: { profile: opts.profile ?? null },
		request,
		params: { id: opts.id ?? 'pointer-id' },
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

const SAMPLE_POINTER: EventPointer = {
	id: 'pointer-id',
	title: 'Editado',
	lumaUrl: 'https://luma.com/xxxx',
	eventDate: null,
	location: null,
	imageUrl: null,
	shortDescription: null,
	pillarSlug: null,
	areaSlug: 'liderazgo',
	ownerId: 'director-id',
	featured: false,
	published: false,
	source: 'supabase',
};

beforeEach(() => {
	updatePointer.mockReset();
	deletePointer.mockReset();
});

describe('PATCH /administrator/api/event-pointers/:id', () => {
	it('devuelve 401 sin sesión', async () => {
		const response = await PATCH(
			fakeContext({ profile: null, method: 'PATCH', body: { title: 'x' } }),
		);
		expect(response.status).toBe(401);
	});

	it('devuelve 400 con JSON inválido', async () => {
		const response = await PATCH(
			fakeContext({ profile: DIRECTOR, method: 'PATCH', rawBody: '{ mal' }),
		);
		expect(response.status).toBe(400);
	});

	it('devuelve 422 si un campo presente no pasa la validación', async () => {
		const response = await PATCH(
			fakeContext({ profile: DIRECTOR, method: 'PATCH', body: { title: 'Ta' } }),
		);
		expect(response.status).toBe(422);
		expect(updatePointer).not.toHaveBeenCalled();
	});

	it('devuelve 404 si el repositorio devuelve null (RLS rechazó o no existe)', async () => {
		updatePointer.mockResolvedValue(null);

		const response = await PATCH(
			fakeContext({ profile: DIRECTOR, method: 'PATCH', body: { title: 'Nuevo título' } }),
		);

		expect(response.status).toBe(404);
	});

	it('devuelve 200 con el puntero actualizado, sin source', async () => {
		updatePointer.mockResolvedValue(SAMPLE_POINTER);

		const response = await PATCH(
			fakeContext({
				profile: DIRECTOR,
				method: 'PATCH',
				id: 'pointer-id',
				body: { title: 'Editado' },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.pointer).not.toHaveProperty('source');
		expect(body.pointer).toMatchObject({ id: 'pointer-id', title: 'Editado' });
		expect(updatePointer).toHaveBeenCalledWith('pointer-id', { title: 'Editado' });
	});
});

describe('DELETE /administrator/api/event-pointers/:id', () => {
	it('devuelve 401 sin sesión', async () => {
		const response = await DELETE(fakeContext({ profile: null, method: 'DELETE' }));
		expect(response.status).toBe(401);
	});

	it('devuelve 404 si el repositorio devuelve false', async () => {
		deletePointer.mockResolvedValue(false);

		const response = await DELETE(fakeContext({ profile: DIRECTOR, method: 'DELETE' }));

		expect(response.status).toBe(404);
	});

	it('devuelve 204 sin body si se borró', async () => {
		deletePointer.mockResolvedValue(true);

		const response = await DELETE(
			fakeContext({ profile: DIRECTOR, method: 'DELETE', id: 'pointer-id' }),
		);

		expect(response.status).toBe(204);
		expect(deletePointer).toHaveBeenCalledWith('pointer-id');
	});
});
