import { describe, expect, it } from 'vitest';
import { canEdit } from './canEdit';
import type { OwnedResource, Profile } from './types';

// Matriz de DOMAIN.md: canEdit(actor, resource) =
//   true si actor.role === 'super_admin'
//   o actor.role === 'director'    y resource.areaSlug === actor.areaSlug
//   o actor.role === 'subdirector' y resource.ownerId === actor.id
//
// Se prueban las 3 fronteras (propio / misma área / otra área) para cada rol.

const AREA = 'liderazgo' as const;
const OTHER_AREA = 'desarrollo-profesional' as const;

function profile(overrides: Partial<Profile>): Profile {
	return {
		id: 'actor-id',
		fullName: 'Actor de prueba',
		role: 'director',
		areaSlug: AREA,
		isActive: true,
		...overrides,
	};
}

function resource(overrides: Partial<OwnedResource>): OwnedResource {
	return {
		ownerId: 'owner-id',
		areaSlug: AREA,
		...overrides,
	};
}

describe('canEdit — matriz completa (DOMAIN.md)', () => {
	describe('super_admin', () => {
		it('puede editar un recurso de su propia área', () => {
			const actor = profile({ role: 'super_admin', areaSlug: null });
			expect(canEdit(actor, resource({ areaSlug: AREA }))).toBe(true);
		});

		it('puede editar un recurso de otra área', () => {
			const actor = profile({ role: 'super_admin', areaSlug: null });
			expect(canEdit(actor, resource({ areaSlug: OTHER_AREA }))).toBe(true);
		});

		it('puede editar un recurso que no le pertenece', () => {
			const actor = profile({
				role: 'super_admin',
				areaSlug: null,
				id: 'super-admin-id',
			});
			expect(
				canEdit(actor, resource({ ownerId: 'otro-usuario', areaSlug: AREA })),
			).toBe(true);
		});
	});

	describe('director', () => {
		it('puede editar un recurso de su área que no creó él', () => {
			const actor = profile({
				role: 'director',
				areaSlug: AREA,
				id: 'director-id',
			});
			expect(
				canEdit(actor, resource({ ownerId: 'otro-usuario', areaSlug: AREA })),
			).toBe(true);
		});

		it('puede editar un recurso propio de su área', () => {
			const actor = profile({
				role: 'director',
				areaSlug: AREA,
				id: 'director-id',
			});
			expect(
				canEdit(actor, resource({ ownerId: 'director-id', areaSlug: AREA })),
			).toBe(true);
		});

		it('NO puede editar un recurso de otra área', () => {
			const actor = profile({
				role: 'director',
				areaSlug: AREA,
				id: 'director-id',
			});
			expect(
				canEdit(
					actor,
					resource({ ownerId: 'director-id', areaSlug: OTHER_AREA }),
				),
			).toBe(false);
		});
	});

	describe('subdirector', () => {
		it('puede editar un recurso propio', () => {
			const actor = profile({
				role: 'subdirector',
				areaSlug: AREA,
				id: 'subdirector-id',
			});
			expect(
				canEdit(actor, resource({ ownerId: 'subdirector-id', areaSlug: AREA })),
			).toBe(true);
		});

		it('NO puede editar un recurso de otro usuario en su misma área', () => {
			const actor = profile({
				role: 'subdirector',
				areaSlug: AREA,
				id: 'subdirector-id',
			});
			expect(
				canEdit(actor, resource({ ownerId: 'director-id', areaSlug: AREA })),
			).toBe(false);
		});

		// DOMAIN.md y la RLS de schema.sql ("staff update by scope") solo
		// miran ownerId para subdirector, sin comparar área. El invariante
		// que lo sostiene: el insert exige area_slug === auth_area(), así
		// que un recurso propio de un subdirector siempre está en su área.
		// Esta prueba documenta esa consistencia con la RLS real, no una
		// regla de negocio nueva sobre áreas cruzadas.
		it('un recurso propio se puede editar aunque su areaSlug no coincida con el del actor (mismo criterio que la RLS: solo importa ownerId)', () => {
			const actor = profile({
				role: 'subdirector',
				areaSlug: AREA,
				id: 'subdirector-id',
			});
			expect(
				canEdit(
					actor,
					resource({ ownerId: 'subdirector-id', areaSlug: OTHER_AREA }),
				),
			).toBe(true);
		});
	});
});
