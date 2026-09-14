import { describe, expect, it } from 'vitest';
import { validateGalleryPatch } from './validateGalleryPatch';

describe('validateGalleryPatch', () => {
	it('acepta un patch vacío', () => {
		expect(validateGalleryPatch({})).toEqual({ ok: true });
	});

	it('acepta un patch parcial sin title ni slug', () => {
		expect(validateGalleryPatch({ published: true })).toEqual({ ok: true });
	});

	it('valida title con las mismas reglas si viene presente', () => {
		expect(validateGalleryPatch({ title: 'Ta' }).ok).toBe(false);
	});

	it('valida slug con las mismas reglas si viene presente', () => {
		expect(validateGalleryPatch({ slug: 'No Válido' }).ok).toBe(false);
	});

	it('rechaza un pillarSlug inexistente', () => {
		expect(validateGalleryPatch({ pillarSlug: 'no-existe' }).ok).toBe(false);
	});
});
