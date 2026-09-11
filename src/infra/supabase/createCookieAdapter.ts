import { parseCookieHeader } from './cookieHeader';
import type { CookieAdapter } from './SupabaseAuthGateway';

/**
 * Traduce el contexto real de Astro (request + cookies) al `CookieAdapter`
 * que pide `SupabaseAuthGateway`. Un solo lugar para esta traducción —
 * la usan `src/middleware.ts` y cada página de `/administrator/**` que
 * necesite login/logout.
 */
export interface CookieContext {
	request: Request;
	cookies: { set: (name: string, value: string, options?: object) => void };
}

export function createCookieAdapter(context: CookieContext): CookieAdapter {
	return {
		getAll: () => parseCookieHeader(context.request.headers.get('cookie')),
		setAll: (cookies) => {
			for (const { name, value, options } of cookies) {
				context.cookies.set(name, value, options);
			}
		},
	};
}
