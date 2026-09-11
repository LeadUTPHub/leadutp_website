// No se usa `defineMiddleware` de 'astro:middleware': ese módulo virtual
// solo lo resuelve el plugin de Vite de Astro (dev/build), no Vitest en
// aislamiento — y es puramente un helper de tipos, sin lógica en runtime.
// `onRequest` con esta firma es exactamente lo que Astro espera igual.
import type { APIContext, MiddlewareNext } from 'astro';
import { getAuthGatewayForRequest } from './infra/container';

// Única ruta bajo /administrator que no exige sesión (regla
// inquebrantable 9 / DISENO_TECNICO §1.5). Todo lo demás fuera de
// /administrator/** es público y ni siquiera entra a este guard.
const OPEN_ADMIN_ROUTE = '/administrator/login';

function isProtectedRoute(pathname: string): boolean {
	if (!pathname.startsWith('/administrator')) return false;
	return pathname !== OPEN_ADMIN_ROUTE;
}

export async function onRequest(context: APIContext, next: MiddlewareNext) {
	// Se inicializa en null para las rutas públicas también, así
	// `Astro.locals.profile` nunca queda `undefined` en ningún .astro.
	context.locals.profile = null;

	if (!isProtectedRoute(context.url.pathname)) {
		return next();
	}

	const authGateway = getAuthGatewayForRequest(context);
	const session = await authGateway.getSession();

	if (!session) {
		// Rewrite, no redirect: la URL en la barra sigue siendo la
		// original y el status es 200 — la ruta queda "oculta" en vez
		// de anunciar con un 302 que hay algo protegido detrás.
		return context.rewrite(OPEN_ADMIN_ROUTE);
	}

	context.locals.profile = session.profile;
	return next();
}
