import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageBlock } from '../../../../domain/ports/ContentRepository';
import type { Profile } from '../../../../domain/types';

// Prefijo `_` obligatorio: cualquier archivo bajo src/pages/ sin él es una
// ruta para Astro y rompe `pnpm build` (MEMORY.md L21).
//
// Se mockea el container (único punto de contacto con Supabase real) para
// probar la lógica del endpoint: validación de key, validación de forma y
// mapeo de respuesta. La RLS de page_blocks ya está probada contra
// Supabase real en SupabaseContentRepository.pageBlocks.test.ts (T5.2).
const getPageBlock = vi.fn();
const savePageBlock = vi.fn();

vi.mock('../../../../infra/container', () => ({
	getContentRepositoryForRequest: () => ({ getPageBlock, savePageBlock }),
}));

const { GET, PUT } = await import('./[key]');

const SUPER_ADMIN: Profile = {
	id: 'super-admin-id',
	fullName: 'Presidencia',
	role: 'super_admin',
	areaSlug: null,
	isActive: true,
};

// Key de ejemplo para los tests genéricos (auth, 400/422/403, etc.) que no
// prueban una key específica: `nosotros.team` — desde el Cambio 3
// (2026-09-14, D-18) ya no puede ser `nosotros.history`, que se sacó de la
// lista cerrada (ver el describe dedicado a esa key más abajo).
function fakeContext(opts: {
	key?: string;
	profile?: Profile | null;
	body?: unknown;
	rawBody?: string;
}) {
	const url = `http://localhost/administrator/api/pages/${opts.key ?? 'nosotros.team'}`;
	const request =
		opts.rawBody !== undefined
			? new Request(url, { method: 'PUT', body: opts.rawBody })
			: new Request(url, {
					method: opts.body === undefined ? 'GET' : 'PUT',
					...(opts.body !== undefined && { body: JSON.stringify(opts.body) }),
				});

	return {
		params: { key: opts.key ?? 'nosotros.team' },
		locals: { profile: opts.profile ?? null },
		request,
		cookies: { set: vi.fn() },
	} as never;
}

const BLOCK: PageBlock = {
	key: 'nosotros.team',
	data: [{ name: 'Ana Pérez', role: 'Presidenta' }],
	areaSlug: null,
	ownerId: 'super-admin-id',
	published: true,
	source: 'supabase',
	updatedAt: '2026-09-11T00:00:00.000Z',
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('GET /administrator/api/pages/:key', () => {
	it('devuelve 200 con el bloque en la forma del contrato §5', async () => {
		getPageBlock.mockResolvedValue(BLOCK);

		const response = await GET(fakeContext({ profile: SUPER_ADMIN }));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			block: {
				key: 'nosotros.team',
				data: [{ name: 'Ana Pérez', role: 'Presidenta' }],
				areaSlug: null,
				published: true,
				updatedAt: '2026-09-11T00:00:00.000Z',
			},
		});
	});

	it('devuelve 404 si el bloque no existe (la web pública cae a .data.ts)', async () => {
		getPageBlock.mockResolvedValue(null);

		const response = await GET(fakeContext({ profile: SUPER_ADMIN }));
		expect(response.status).toBe(404);
	});

	it('devuelve 404 ante una key fuera de la lista cerrada, sin tocar la DB', async () => {
		const response = await GET(
			fakeContext({ key: 'nosotros.mission', profile: SUPER_ADMIN }),
		);
		expect(response.status).toBe(404);
		expect(getPageBlock).not.toHaveBeenCalled();
	});

	it('devuelve 404 para nosotros.history (Cambio 3, D-18: se sacó de la lista cerrada)', async () => {
		const response = await GET(
			fakeContext({ key: 'nosotros.history', profile: SUPER_ADMIN }),
		);
		expect(response.status).toBe(404);
		expect(getPageBlock).not.toHaveBeenCalled();
	});
});

describe('PUT /administrator/api/pages/:key', () => {
	it('guarda y devuelve 200 con el bloque', async () => {
		savePageBlock.mockResolvedValue(BLOCK);

		const response = await PUT(
			fakeContext({
				profile: SUPER_ADMIN,
				body: {
					data: [{ name: 'Ana Pérez', role: 'Presidenta' }],
					published: true,
				},
			}),
		);

		expect(response.status).toBe(200);
		expect(savePageBlock).toHaveBeenCalledWith('nosotros.team', {
			data: [{ name: 'Ana Pérez', role: 'Presidenta' }],
			published: true,
		});
	});

	it('devuelve 401 sin perfil en la sesión (chequeo defensivo)', async () => {
		const response = await PUT(
			fakeContext({ profile: null, body: { data: { body: 'x' } } }),
		);
		expect(response.status).toBe(401);
		expect(savePageBlock).not.toHaveBeenCalled();
	});

	it('devuelve 404 ante una key fuera de la lista cerrada', async () => {
		const response = await PUT(
			fakeContext({
				key: 'proyectos.destacados',
				profile: SUPER_ADMIN,
				body: { data: [] },
			}),
		);
		expect(response.status).toBe(404);
		expect(savePageBlock).not.toHaveBeenCalled();
	});

	it('devuelve 404 para nosotros.history (Cambio 3, D-18: se sacó de la lista cerrada, aunque el body tenga forma válida)', async () => {
		const response = await PUT(
			fakeContext({
				key: 'nosotros.history',
				profile: SUPER_ADMIN,
				body: { data: { body: 'Intento de reescribir la historia.' } },
			}),
		);
		expect(response.status).toBe(404);
		expect(savePageBlock).not.toHaveBeenCalled();
	});

	it('devuelve 400 con JSON inválido', async () => {
		const response = await PUT(
			fakeContext({ profile: SUPER_ADMIN, rawBody: 'no-es-json' }),
		);
		expect(response.status).toBe(400);
		expect(savePageBlock).not.toHaveBeenCalled();
	});

	it('devuelve 422 si falta data', async () => {
		const response = await PUT(
			fakeContext({ profile: SUPER_ADMIN, body: { published: true } }),
		);
		expect(response.status).toBe(422);
		expect(savePageBlock).not.toHaveBeenCalled();
	});

	it('devuelve 422 con la ruta del campo si data tiene forma inválida', async () => {
		const response = await PUT(
			fakeContext({
				key: 'proyectos.list',
				profile: SUPER_ADMIN,
				body: {
					data: [{ slug: 'x', name: 'X', description: 'd', status: 'nope' }],
				},
			}),
		);

		expect(response.status).toBe(422);
		expect((await response.json()).error).toContain('data[0].status');
		expect(savePageBlock).not.toHaveBeenCalled();
	});

	it('devuelve 422 si published no es booleano', async () => {
		const response = await PUT(
			fakeContext({
				profile: SUPER_ADMIN,
				body: { data: { body: 'x' }, published: 'sí' },
			}),
		);
		expect(response.status).toBe(422);
		expect(savePageBlock).not.toHaveBeenCalled();
	});

	it('devuelve 403 cuando la RLS rechaza la escritura (director/subdirector)', async () => {
		savePageBlock.mockResolvedValue(null);

		const response = await PUT(
			fakeContext({
				profile: SUPER_ADMIN,
				body: { data: [{ name: 'Ana', role: 'Presidenta' }] },
			}),
		);
		expect(response.status).toBe(403);
	});

	it('nunca acepta areaSlug ni ownerId del cliente', async () => {
		savePageBlock.mockResolvedValue(BLOCK);

		await PUT(
			fakeContext({
				profile: SUPER_ADMIN,
				body: {
					data: [{ name: 'Ana', role: 'Presidenta' }],
					areaSlug: 'liderazgo',
					ownerId: 'otro-usuario',
				},
			}),
		);

		expect(savePageBlock).toHaveBeenCalledWith('nosotros.team', {
			data: [{ name: 'Ana', role: 'Presidenta' }],
			published: undefined,
		});
	});
});
