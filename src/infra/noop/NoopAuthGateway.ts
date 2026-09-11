import type {
	AuthGateway,
	Session,
} from '../../domain/ports/AuthGateway';

/**
 * Implementación no-op del puerto AuthGateway. Se reemplaza por
 * SupabaseAuthGateway (@supabase/ssr) en Sprint 2 (ver ARCHITECTURE.md §2).
 */
export class NoopAuthGateway implements AuthGateway {
	async getSession(): Promise<Session | null> {
		return null;
	}

	async signInWithPassword(): Promise<Session> {
		throw new Error('AuthGateway no configurado todavía (Sprint 2).');
	}

	async signOut(): Promise<void> {
		// No-op.
	}
}
