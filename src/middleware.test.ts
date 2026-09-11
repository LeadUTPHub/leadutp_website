import { beforeEach, describe, expect, it, vi } from 'vitest';

// Se mockea el contenedor para que este test no toque Supabase de
// verdad — eso lo cubre T2.6 con los usuarios reales. Acá solo se
// prueba la lógica de la frontera: qué rutas se dejan pasar y cuáles
// exigen sesión.
const getSessionMock = vi.fn();

vi.mock('./infra/container', () => ({
	getAuthGatewayForRequest: () => ({
		getSession: getSessionMock,
		signInWithPassword: vi.fn(),
		signOut: vi.fn(),
	}),
}));

const { onRequest } = await import('./middleware');

function createContext(pathname: string) {
	return {
		url: new URL(`http://localhost${pathname}`),
		request: new Request(`http://localhost${pathname}`),
		cookies: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
		},
		locals: {} as Record<string, unknown>,
		rewrite: vi.fn(async () => new Response(null)),
	};
}

describe('middleware onRequest (regla inquebrantable 9 / DISENO_TECNICO §1.5)', () => {
	beforeEach(() => {
		getSessionMock.mockReset();
	});

	it('deja pasar "/" sin tocar Supabase', async () => {
		const context = createContext('/');
		const next = vi.fn(async () => new Response('ok'));

		await onRequest(context as never, next);

		expect(next).toHaveBeenCalledOnce();
		expect(context.rewrite).not.toHaveBeenCalled();
		expect(getSessionMock).not.toHaveBeenCalled();
	});

	it('deja pasar "/administrator/login" sin tocar Supabase', async () => {
		const context = createContext('/administrator/login');
		const next = vi.fn(async () => new Response('ok'));

		await onRequest(context as never, next);

		expect(next).toHaveBeenCalledOnce();
		expect(getSessionMock).not.toHaveBeenCalled();
	});

	it('sin sesión, "/administrator" renderiza el login (rewrite, no next, sin redirect)', async () => {
		getSessionMock.mockResolvedValue(null);
		const context = createContext('/administrator');
		const next = vi.fn(async () => new Response('ok'));

		await onRequest(context as never, next);

		expect(getSessionMock).toHaveBeenCalledOnce();
		expect(context.rewrite).toHaveBeenCalledWith('/administrator/login');
		expect(next).not.toHaveBeenCalled();
	});

	it('sin sesión, cualquier otra ruta bajo /administrator/** también renderiza el login', async () => {
		getSessionMock.mockResolvedValue(null);
		const context = createContext('/administrator/eventos');
		const next = vi.fn(async () => new Response('ok'));

		await onRequest(context as never, next);

		expect(context.rewrite).toHaveBeenCalledWith('/administrator/login');
		expect(next).not.toHaveBeenCalled();
	});

	it('con sesión válida, "/administrator" deja pasar y guarda el perfil en locals', async () => {
		const session = {
			profile: {
				id: 'u1',
				fullName: null,
				role: 'director',
				areaSlug: 'liderazgo',
				isActive: true,
			},
			assuranceLevel: 'aal1',
		};
		getSessionMock.mockResolvedValue(session);
		const context = createContext('/administrator');
		const next = vi.fn(async () => new Response('ok'));

		await onRequest(context as never, next);

		expect(next).toHaveBeenCalledOnce();
		expect(context.rewrite).not.toHaveBeenCalled();
		expect(context.locals.profile).toEqual(session.profile);
	});
});
