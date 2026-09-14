/**
 * Valida el body de POST /administrator/api/galleries/:id/photos
 * (docs/API_CONTRACTS.md §4). La foto ya está subida a Cloudinary en
 * este punto — esto solo valida el registro en Supabase.
 */
export type ValidationResult = { ok: true } | { ok: false; error: string };

export interface GalleryPhotoFields {
	cloudinaryPublicId?: unknown;
	secureUrl?: unknown;
	width?: unknown;
	height?: unknown;
	alt?: unknown;
}

const SECURE_URL_PATTERN = /^https:\/\//i;

function fail(error: string): ValidationResult {
	return { ok: false, error };
}

/** Reglas de los campos siempre-opcionales, compartidas con el patch. */
export function validateOptionalPhotoFields(input: GalleryPhotoFields): ValidationResult {
	if (
		input.width !== undefined &&
		input.width !== null &&
		typeof input.width !== 'number'
	) {
		return fail('width debe ser un número.');
	}

	if (
		input.height !== undefined &&
		input.height !== null &&
		typeof input.height !== 'number'
	) {
		return fail('height debe ser un número.');
	}

	if (input.alt !== undefined && input.alt !== null && typeof input.alt !== 'string') {
		return fail('alt debe ser texto.');
	}

	return { ok: true };
}

export function validateGalleryPhotoInput(input: GalleryPhotoFields): ValidationResult {
	if (typeof input.cloudinaryPublicId !== 'string' || !input.cloudinaryPublicId) {
		return fail('cloudinaryPublicId es requerido.');
	}

	if (typeof input.secureUrl !== 'string' || !SECURE_URL_PATTERN.test(input.secureUrl)) {
		return fail('secureUrl es requerido y debe ser https://.');
	}

	return validateOptionalPhotoFields(input);
}
