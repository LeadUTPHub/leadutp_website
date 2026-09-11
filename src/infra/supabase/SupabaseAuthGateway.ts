import { createServerClient } from '@supabase/ssr';
import type {
	AuthAssuranceLevel,
	AuthGateway,
	Session,
} from '../../domain/ports/AuthGateway';
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
		// getUser() valida el JWT contra Supabase, no solo lo decodifica
		// (regla de DISENO_TECNICO §1.5).
		const { data, error } = await this.client.auth.getUser();
		if (error || !data.user) return null;

		return await this.buildSession(data.user);
	}

	async signInWithPassword(email: string, password: string): Promise<Session> {
		const { data, error } = await this.client.auth.signInWithPassword({
			email,
			password,
		});

		if (error || !data.user) {
			throw new Error('Usuario o contraseña incorrectos.');
		}

		const session = await this.buildSession(data.user);
		if (!session) {
			throw new Error('Este usuario no tiene un perfil asignado.');
		}

		return session;
	}

	async signOut(): Promise<void> {
		await this.client.auth.signOut();
	}

	private async buildSession(user: {
		id: string;
		app_metadata?: Record<string, unknown>;
	}): Promise<Session | null> {
		const profile = mapUserToProfile(user);
		if (!profile || !profile.isActive) return null;

		return {
			profile,
			// MFA-ready (D-P3): se lee el AAL actual del JWT (sin llamada de
			// red adicional), pero nada en este sprint exige aal2 todavía.
			assuranceLevel: await this.readAssuranceLevel(),
		};
	}

	private async readAssuranceLevel(): Promise<AuthAssuranceLevel> {
		const { data } = await this.client.auth.mfa.getAuthenticatorAssuranceLevel();
		return data?.currentLevel === 'aal2' ? 'aal2' : 'aal1';
	}
}
