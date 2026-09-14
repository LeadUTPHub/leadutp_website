import { isAreaSlug } from './types';

/**
 * Valida el body de POST/PATCH /administrator/api/galleries contra las
 * reglas de docs/API_CONTRACTS.md §3. `pillarSlug` usa `isAreaSlug`
 * (área = pilar, DOMAIN.md "Área"). `areaSlug`/`ownerId` no se validan
 * acá: ni siquiera se aceptan del cliente, los fija el servidor.
 */
export type ValidationResult = { ok: true } | { ok: false; error: string };

export interface GalleryFields {
	title?: unknown;
	slug?: unknown;
	body?: unknown;
	happenedOn?: unknown;
	pillarSlug?: unknown;
	published?: unknown;
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 140;

function fail(error: string): ValidationResult {
	return { ok: false, error };
}

export function validateTitle(title: unknown): ValidationResult {
	if (typeof title !== 'string') return fail('title debe ser texto.');
	if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
		return fail(
			`title debe tener entre ${TITLE_MIN_LENGTH} y ${TITLE_MAX_LENGTH} caracteres.`,
		);
	}
	return { ok: true };
}

export function validateSlug(slug: unknown): ValidationResult {
	if (typeof slug !== 'string') return fail('slug debe ser texto.');
	if (!SLUG_PATTERN.test(slug)) {
		return fail('slug solo puede tener minúsculas, números y guiones.');
	}
	return { ok: true };
}

/** Reglas de los campos siempre-opcionales, compartidas por POST y PATCH. */
export function validateOptionalGalleryFields(input: GalleryFields): ValidationResult {
	if (input.body !== undefined && input.body !== null && typeof input.body !== 'string') {
		return fail('body debe ser texto.');
	}

	if (input.happenedOn !== undefined && input.happenedOn !== null) {
		if (
			typeof input.happenedOn !== 'string' ||
			Number.isNaN(Date.parse(input.happenedOn))
		) {
			return fail('happenedOn debe ser una fecha válida.');
		}
	}

	if (
		input.pillarSlug !== undefined &&
		input.pillarSlug !== null &&
		!isAreaSlug(input.pillarSlug)
	) {
		return fail('pillarSlug no existe.');
	}

	if (input.published !== undefined && typeof input.published !== 'boolean') {
		return fail('published debe ser booleano.');
	}

	return { ok: true };
}

/** POST: title y slug son requeridos. */
export function validateGalleryInput(input: GalleryFields): ValidationResult {
	if (input.title === undefined) return fail('title es requerido.');
	const titleResult = validateTitle(input.title);
	if (!titleResult.ok) return titleResult;

	if (input.slug === undefined) return fail('slug es requerido.');
	const slugResult = validateSlug(input.slug);
	if (!slugResult.ok) return slugResult;

	return validateOptionalGalleryFields(input);
}
