import { describe, expect, it } from 'vitest';
import { validateGalleryPhotoPatch } from './validateGalleryPhotoPatch';

// PATCH /administrator/api/galleries/:id/photos/:photoId — reordenar/editar alt.
describe('validateGalleryPhotoPatch', () => {
	it('acepta un patch vacío', () => {
		expect(validateGalleryPhotoPatch({})).toEqual({ ok: true });
	});

	it('acepta { alt, position }', () => {
		expect(validateGalleryPhotoPatch({ alt: 'nuevo alt', position: 0 })).toEqual({
			ok: true,
		});
	});

	it('rechaza alt que no es texto', () => {
		expect(validateGalleryPhotoPatch({ alt: 123 }).ok).toBe(false);
	});

	it('rechaza position que no es número', () => {
		expect(validateGalleryPhotoPatch({ position: 'primero' }).ok).toBe(false);
	});

	it('rechaza position negativo', () => {
		expect(validateGalleryPhotoPatch({ position: -1 }).ok).toBe(false);
	});
});
