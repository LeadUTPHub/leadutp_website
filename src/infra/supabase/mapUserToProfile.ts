import type { AreaSlug, Profile, Role } from '../../domain/types';

const VALID_ROLES: readonly Role[] = ['director', 'subdirector', 'super_admin'];

function isValidRole(value: unknown): value is Role {
	return typeof value === 'string' && VALID_ROLES.includes(value as Role);
}

/**
 * Traduce el `user` que devuelve Supabase Auth (con `app_metadata` ya
 * poblado por el Auth Hook, ver database/schema.sql §6) a nuestro
 * `Profile` de dominio. Devuelve `null` si no hay un `profile` válido
 * asociado (Auth Hook no corrió, rol inválido, o usuario sin fila en
 * `profiles`) — el llamador lo trata como "sin sesión utilizable".
 */
export function mapUserToProfile(user: {
	id: string;
	app_metadata?: Record<string, unknown>;
}): Profile | null {
	const meta = user.app_metadata ?? {};

	if (!isValidRole(meta.role)) return null;

	return {
		id: user.id,
		fullName: null,
		role: meta.role,
		areaSlug: (meta.area_slug as AreaSlug | null) ?? null,
		isActive: meta.is_active === undefined ? true : Boolean(meta.is_active),
	};
}
