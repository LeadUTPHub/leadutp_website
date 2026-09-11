import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventPointer } from '../../../../domain/ports/ContentRepository';
import type { Profile } from '../../../../domain/types';

// Nombre con `_` a propósito: cualquier archivo bajo src/pages/ sin ese
// prefijo es una ruta para Astro. `index.test.ts` (sin `_`) rompió
// `pnpm build` — Astro lo prerenderizaba como página y `vi.mock` no
// existe fuera de Vitest ("Vitest mocker was not initialized"). Bug
// real encontrado en T3.3, ver MEMORY.md.
//
// El container es el único punto de contacto con Supabase/cookies reales
// — se mockea para probar la lógica del endpoint (auth defensiva,
// validación, mapeo de forma) sin depender de infra externa. La RLS en
// sí ya está probada contra Supabase real en
// SupabaseContentRepository.pointers.test.ts (T3.2).
const listPointers = vi.fn();
const createPointer = vi.fn();

vi.mock('../../../../infra/container', () => ({
	getContentRepositoryForRequest: () => ({
		listPointers,
		createPointer,
		updatePointer: vi.fn(),
		deletePointer: vi.fn(),
		resolve: vi.fn(),
	}),
}));

const { GET, POST } = await import('./index');

function fakeContext(opts: {
	profile?: Profile | null;
	body?: unknown;
	rawBody?: string;
}) {
	const request =
		opts.rawBody !== undefined
			? new Request('http://localhost/administrator/api/event-pointers', {
					method: 'POST',
					body: opts.rawBody,
				})
			: new Request('http://localhost/administrator/api/event-pointers', {
					method: opts.body === undefined ? 'GET' : 'POST',
					...(opts.body !== undefined && { body: JSON.stringify(opts.body) }),
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

const SAMPLE_POINTER: EventPointer = {
	id: 'pointer-id',
	title: 'Talent Room',
	lumaUrl: 'https://luma.com/xxxx',
	eventDate: '2026-05-10T18:00:00Z',
	location: 'Auditorio UTP',
	imageUrl: null,
	shortDescription: null,
	pillarSlug: 'liderazgo',
	areaSlug: 'liderazgo',
	ownerId: 'director-id',
	featured: false,
	published: false,
	source: 'supabase',
};

beforeEach(() => {
	listPointers.mockReset();
	createPointer.mockReset();
});

describe('GET /administrator/api/event-pointers', () => {
	it('devuelve 200 con los punteros sin el campo source', async () => {
		listPointers.mockResolvedValue([SAMPLE_POINTER]);

		const response = await GET(fakeContext({ profile: DIRECTOR }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.pointers).toHaveLength(1);
		expect(body.pointers[0]).not.toHaveProperty('source');
		expect(body.pointers[0]).toMatchObject({ id: 'pointer-id', title: 'Talent Room' });
	});
});

describe('POST /administrator/api/event-pointers', () => {
	it('devuelve 401 sin sesión', async () => {
		const response = await POST(fakeContext({ profile: null, body: { title: 'x' } }));
		expect(response.status).toBe(401);
		expect(createPointer).not.toHaveBeenCalled();
	});

	it('devuelve 400 con JSON inválido', async () => {
		const response = await POST(
			fakeContext({ profile: DIRECTOR, rawBody: '{ esto no es json' }),
		);
		expect(response.status).toBe(400);
	});

	it('devuelve 422 si falta title', async () => {
		const response = await POST(
			fakeContext({ profile: DIRECTOR, body: { lumaUrl: 'https://luma.com/x' } }),
		);
		expect(response.status).toBe(422);
		expect(createPointer).not.toHaveBeenCalled();
	});

	it('devuelve 422 si super_admin no manda areaSlug', async () => {
		const response = await POST(
			fakeContext({
				profile: SUPER_ADMIN,
				body: { title: 'Talent Room', lumaUrl: 'https://luma.com/x' },
			}),
		);
		expect(response.status).toBe(422);
		expect(createPointer).not.toHaveBeenCalled();
	});

	it('crea con el areaSlug del director (nunca el del body) y devuelve 201', async () => {
		createPointer.mockResolvedValue(SAMPLE_POINTER);

		const response = await POST(
			fakeContext({
				profile: DIRECTOR,
				body: {
					title: 'Talent Room',
					lumaUrl: 'https://luma.com/xxxx',
					areaSlug: 'excelencia-academica', // debe ignorarse
				},
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body.pointer).toMatchObject({ id: 'pointer-id' });
		expect(createPointer).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Talent Room' }),
			'liderazgo',
		);
	});

	it('devuelve 403 si la RLS rechaza el insert', async () => {
		createPointer.mockRejectedValue(new Error('RLS: no autorizado'));

		const response = await POST(
			fakeContext({
				profile: DIRECTOR,
				body: { title: 'Talent Room', lumaUrl: 'https://luma.com/xxxx' },
			}),
		);

		expect(response.status).toBe(403);
	});
});
