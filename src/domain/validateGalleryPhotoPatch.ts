import type { ValidationResult } from './validateGalleryPhotoInput';

export interface GalleryPhotoPatchFields {
	alt?: unknown;
	position?: unknown;
}

function fail(error: string): ValidationResult {
	return { ok: false, error };
}

/** PATCH .../photos/:photoId — reordenar (`position`) y editar `alt`. */
export function validateGalleryPhotoPatch(input: GalleryPhotoPatchFields): ValidationResult {
	if (input.alt !== undefined && input.alt !== null && typeof input.alt !== 'string') {
		return fail('alt debe ser texto.');
	}

	if (input.position !== undefined) {
		if (typeof input.position !== 'number' || input.position < 0) {
			return fail('position debe ser un número mayor o igual a 0.');
		}
	}

	return { ok: true };
}
