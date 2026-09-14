import type { OwnedResource, Profile } from './types';

/**
 * Regla de dominio (DOMAIN.md, "Reglas de dominio"): decide si `actor`
 * puede editar/borrar `resource`. Espeja exactamente la matriz de RLS
 * de database/schema.sql §9.2 ("staff update by scope" / "staff delete
 * by scope") — cualquier cambio acá debe reflejarse también ahí.
 */
export function canEdit(actor: Profile, resource: OwnedResource): boolean {
	if (actor.role === 'super_admin') return true;
	if (actor.role === 'director') return resource.areaSlug === actor.areaSlug;
	return resource.ownerId === actor.id;
}
