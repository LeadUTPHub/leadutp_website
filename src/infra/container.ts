import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AuthGateway } from '../domain/ports/AuthGateway';
import type { ContentRepository } from '../domain/ports/ContentRepository';
import type { PhotoStorage } from '../domain/ports/PhotoStorage';
import { NoopContentRepository } from './noop/NoopContentRepository';
import { NoopPhotoStorage } from './noop/NoopPhotoStorage';
import type { CookieContext } from './supabase/createCookieAdapter';
import { createCookieAdapter } from './supabase/createCookieAdapter';
import { SupabaseContentRepository } from './supabase/SupabaseContentRepository';
import type { CookieAdapter } from './supabase/SupabaseAuthGateway';
import { SupabaseAuthGateway } from './supabase/SupabaseAuthGateway';

function supabaseEnv() {
	return {
		url: import.meta.env.PUBLIC_SUPABASE_URL,
		publishableKey: import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	};
}

/**
 * Composition root (ARCHITECTURE.md §2). La UI (páginas públicas y del
 * panel) pide sus dependencias acá — nunca importa un adaptador concreto
 * directamente.
 *
 * Sprint 0: solo había adaptadores no-op. Sprint 2 (Auth) ya devuelve el
 * adaptador real de `AuthGateway`. Sprint 3 (contenido) y Sprint 4
 * (fotos) hacen lo mismo con `ContentRepository`/`PhotoStorage`.
 *
 * `ContentRepository` público/build-time: cliente anon, sin cookies ni
 * sesión — la RLS de `anon` ya limita la lectura a `published = true`
 * (schema.sql §9.2). Sin las env vars configuradas, degrada a
 * `NoopContentRepository` (listas vacías) en vez de tirar el build.
 * T3.5 solo necesita esta degradación simple (try/catch en la página);
 * la cadena completa live→fallback→static→vacío (`CompositeContentRepository`)
 * es de Sprint 5 (page_blocks) — no se adelanta acá.
 */
export function getContentRepository(): ContentRepository {
	const env = supabaseEnv();
	if (!env.url || !env.publishableKey) {
		return new NoopContentRepository();
	}
	return new SupabaseContentRepository(createClient(env.url, env.publishableKey));
}

export function getPhotoStorage(): PhotoStorage {
	return new NoopPhotoStorage();
}

/**
 * `cookies` debe construirse por request (nunca se comparte un cliente
 * de Supabase entre requests — ver el docstring de `createServerClient`).
 */
export function getAuthGateway(cookies: CookieAdapter): AuthGateway {
	return new SupabaseAuthGateway(cookies, supabaseEnv());
}

/** Conveniencia: arma el `CookieAdapter` desde el contexto real de Astro
 * (request + cookies) y devuelve el `AuthGateway` ya listo. Usar esto
 * desde middleware/páginas en vez de repetir `createCookieAdapter` +
 * `getAuthGateway` en cada archivo. */
export function getAuthGatewayForRequest(context: CookieContext): AuthGateway {
	return getAuthGateway(createCookieAdapter(context));
}

/**
 * `ContentRepository` con la sesión del actor (si la hay) ya cableada:
 * Postgres aplica la RLS con su JWT (ARCHITECTURE.md §4) — este
 * composition root no re-filtra por rol/área. Sirve tanto para
 * runtime autenticado (`/administrator/api/**`) como para una futura
 * lectura pública anónima (mismo cliente, sin cookies de sesión).
 */
export function getContentRepositoryForRequest(
	context: CookieContext,
): ContentRepository {
	const cookies = createCookieAdapter(context);
	const env = supabaseEnv();
	const client = createServerClient(env.url, env.publishableKey, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cookiesToSet) =>
				cookies.setAll(
					cookiesToSet.map(({ name, value, options }) => ({
						name,
						value,
						options,
					})),
				),
		},
	});
	return new SupabaseContentRepository(client);
}
