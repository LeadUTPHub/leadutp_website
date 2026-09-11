import { createServerClient } from '@supabase/ssr';
import type { AuthGateway, Session } from '../../domain/ports/AuthGateway';
import { mapUserToProfile } from './mapUserToProfile';

/**
 * Adaptador mínimo de cookies que necesita @supabase/ssr (API no
 * deprecada: getAll/setAll). Lo implementa quien tenga el request/response
 * real (Astro.cookies + Astro.request) — ver src/middleware.ts y las
 * páginas de /administrator.
 */
export interface CookieAdapter {
	getAll(): { name: string; value: string }[];
	setAll(
		cookies: { name: string; value: string; options: Record<string, unknown> }[],
	): void;
}

export interface SupabaseEnv {
	url: string;
	publishableKey: string;
}

export class SupabaseAuthGateway implements AuthGateway {
	private readonly client;

	constructor(cookies: CookieAdapter, env: SupabaseEnv) {
		this.client = createServerClient(env.url, env.publishableKey, {
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
	}

	async getSession(): Promise<Session | null> {
		// getClaims() valida el JWT (JWKS o red, según el proyecto) y
		// devuelve las claims REALES del access token — a diferencia de
		// getUser(), cuyo `data.user.app_metadata` es el raw_app_meta_data
		// crudo de auth.users, sin las claims que agrega el Auth Hook
		// (bug encontrado en Sprint 2, T2.8 — ver MEMORY.md L19).
		const { data, error } = await this.client.auth.getClaims();
		if (error || !data) return null;

		return this.buildSession(data.claims);
	}

	async signInWithPassword(email: string, password: string): Promise<Session> {
		const { error: signInError } = await this.client.auth.signInWithPassword({
			email,
			password,
		});

		if (signInError) {
			throw new Error('Usuario o contraseña incorrectos.');
		}

		const { data, error: claimsError } = await this.client.auth.getClaims();
		if (claimsError || !data) {
			throw new Error('No se pudo validar la sesión.');
		}

		const session = this.buildSession(data.claims);
		if (!session) {
			throw new Error('Este usuario no tiene un perfil asignado.');
		}

		return session;
	}

	async signOut(): Promise<void> {
		await this.client.auth.signOut();
	}

	private buildSession(claims: {
		sub: string;
		app_metadata?: Record<string, unknown>;
		aal?: string;
	}): Session | null {
		const profile = mapUserToProfile({
			id: claims.sub,
			app_metadata: claims.app_metadata,
		});
		if (!profile || !profile.isActive) return null;

		return {
			profile,
			// MFA-ready (D-P3): getClaims() ya trae el AAL actual, sin
			// llamada de red adicional. Nada en este sprint exige aal2.
			assuranceLevel: claims.aal === 'aal2' ? 'aal2' : 'aal1',
		};
	}
}
