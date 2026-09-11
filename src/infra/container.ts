import type { AuthGateway } from '../domain/ports/AuthGateway';
import type { ContentRepository } from '../domain/ports/ContentRepository';
import type { PhotoStorage } from '../domain/ports/PhotoStorage';
import { NoopContentRepository } from './noop/NoopContentRepository';
import { NoopPhotoStorage } from './noop/NoopPhotoStorage';
import type { CookieContext } from './supabase/createCookieAdapter';
import { createCookieAdapter } from './supabase/createCookieAdapter';
import type { CookieAdapter } from './supabase/SupabaseAuthGateway';
import { SupabaseAuthGateway } from './supabase/SupabaseAuthGateway';

/**
 * Composition root (ARCHITECTURE.md §2). La UI (páginas públicas y del
 * panel) pide sus dependencias acá — nunca importa un adaptador concreto
 * directamente.
 *
 * Sprint 0: solo había adaptadores no-op. Sprint 2 (Auth) ya devuelve el
 * adaptador real de `AuthGateway`. Sprint 3 (contenido) y Sprint 4
 * (fotos) hacen lo mismo con `ContentRepository`/`PhotoStorage`.
 */
export function getContentRepository(): ContentRepository {
	return new NoopContentRepository();
}

export function getPhotoStorage(): PhotoStorage {
	return new NoopPhotoStorage();
}

/**
 * `cookies` debe construirse por request (nunca se comparte un cliente
 * de Supabase entre requests — ver el docstring de `createServerClient`).
 */
export function getAuthGateway(cookies: CookieAdapter): AuthGateway {
	return new SupabaseAuthGateway(cookies, {
		url: import.meta.env.PUBLIC_SUPABASE_URL,
		publishableKey: import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	});
}

/** Conveniencia: arma el `CookieAdapter` desde el contexto real de Astro
 * (request + cookies) y devuelve el `AuthGateway` ya listo. Usar esto
 * desde middleware/páginas en vez de repetir `createCookieAdapter` +
 * `getAuthGateway` en cada archivo. */
export function getAuthGatewayForRequest(context: CookieContext): AuthGateway {
	return getAuthGateway(createCookieAdapter(context));
}
