import { describe, expect, it } from 'vitest';
import { mapUserToProfile } from './mapUserToProfile';

describe('mapUserToProfile', () => {
	it('mapea un director con área a Profile', () => {
		const profile = mapUserToProfile({
			id: 'u1',
			app_metadata: {
				role: 'director',
				area_slug: 'liderazgo',
				is_active: true,
			},
		});

		expect(profile).toEqual({
			id: 'u1',
			fullName: null,
			role: 'director',
			areaSlug: 'liderazgo',
			isActive: true,
		});
	});

	it('mapea un super_admin sin área (area_slug null)', () => {
		const profile = mapUserToProfile({
			id: 'u2',
			app_metadata: { role: 'super_admin', area_slug: null, is_active: true },
		});

		expect(profile).toEqual({
			id: 'u2',
			fullName: null,
			role: 'super_admin',
			areaSlug: null,
			isActive: true,
		});
	});

	it('devuelve null si falta app_metadata (el Auth Hook no corrió o no hay profile)', () => {
		expect(mapUserToProfile({ id: 'u3' })).toBeNull();
		expect(mapUserToProfile({ id: 'u3', app_metadata: {} })).toBeNull();
	});

	it('devuelve null si el rol no es uno de los 3 válidos', () => {
		const profile = mapUserToProfile({
			id: 'u4',
			app_metadata: { role: 'invitado', area_slug: null, is_active: true },
		});

		expect(profile).toBeNull();
	});

	it('is_active ausente se trata como true por defecto', () => {
		const profile = mapUserToProfile({
			id: 'u5',
			app_metadata: { role: 'subdirector', area_slug: 'liderazgo' },
		});

		expect(profile?.isActive).toBe(true);
	});

	it('propaga is_active: false tal cual (la decisión de bloquear la toma el gateway, no este mapper)', () => {
		const profile = mapUserToProfile({
			id: 'u6',
			app_metadata: {
				role: 'subdirector',
				area_slug: 'liderazgo',
				is_active: false,
			},
		});

		expect(profile?.isActive).toBe(false);
	});
});
