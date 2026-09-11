import type { Profile } from '../types';

/**
 * Puerto de autenticación (Supabase Auth en la implementación real, ver
 * src/infra/). Este archivo no importa nada externo.
 */
export type AuthAssuranceLevel = 'aal1' | 'aal2';

export interface Session {
	profile: Profile;
	assuranceLevel: AuthAssuranceLevel;
}

export interface AuthGateway {
	getSession(): Promise<Session | null>;
	signInWithPassword(email: string, password: string): Promise<Session>;
	signOut(): Promise<void>;
}
