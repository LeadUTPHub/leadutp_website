import { isAreaSlug } from './types';

/**
 * Valida el body de POST/PATCH /administrator/api/event-pointers contra
 * las reglas de docs/API_CONTRACTS.md §2. `pillarSlug` usa `isAreaSlug`
 * porque área = pilar (DOMAIN.md, "Área") — no valida `areaSlug` en sí:
 * ese campo ni siquiera se acepta del cliente (lo fija el servidor).
 *
 * Las mismas reglas de `lumaUrl`/`imageUrl`/`shortDescription` están
 * duplicadas como CHECK constraints en database/schema.sql — este
 * validador solo da un error 422 legible antes de llegar a Postgres.
 *
 * `validateEventPointerPatch` (validateEventPointerPatch.ts) reusa
 * `validateOptionalFields` para no duplicar estas reglas: la única
 * diferencia entre crear y editar es si `title`/`lumaUrl` son requeridos.
 */
export type ValidationResult = { ok: true } | { ok: false; error: string };

export interface EventPointerFields {
	title?: unknown;
	lumaUrl?: unknown;
	eventDate?: unknown;
	location?: unknown;
	imageUrl?: unknown;
	shortDescription?: unknown;
	pillarSlug?: unknown;
	featured?: unknown;
	published?: unknown;
}

const LUMA_URL_PATTERN = /^https:\/\/(lu\.ma|luma\.com)\//i;
const IMAGE_URL_PATTERN = /^https:\/\//i;
const SHORT_DESCRIPTION_MAX_LENGTH = 280;
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 120;

function fail(error: string): ValidationResult {
	return { ok: false, error };
}

function validateTitle(title: unknown): ValidationResult {
	if (typeof title !== 'string') return fail('title debe ser texto.');
	if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
		return fail(
			`title debe tener entre ${TITLE_MIN_LENGTH} y ${TITLE_MAX_LENGTH} caracteres.`,
		);
	}
	return { ok: true };
}

function validateLumaUrl(lumaUrl: unknown): ValidationResult {
	if (typeof lumaUrl !== 'string') return fail('lumaUrl debe ser texto.');
	if (!LUMA_URL_PATTERN.test(lumaUrl)) {
		return fail('lumaUrl debe ser una URL de lu.ma o luma.com.');
	}
	return { ok: true };
}

/** Reglas de los campos que siempre son opcionales, tanto en POST como
 * en PATCH — validadas solo si vienen presentes (no `undefined`/`null`). */
export function validateOptionalFields(input: EventPointerFields): ValidationResult {
	if (input.eventDate !== undefined && input.eventDate !== null) {
		if (
			typeof input.eventDate !== 'string' ||
			Number.isNaN(Date.parse(input.eventDate))
		) {
			return fail('eventDate debe ser una fecha ISO válida.');
		}
	}

	if (
		input.location !== undefined &&
		input.location !== null &&
		typeof input.location !== 'string'
	) {
		return fail('location debe ser texto.');
	}

	if (input.imageUrl !== undefined && input.imageUrl !== null) {
		if (typeof input.imageUrl !== 'string' || !IMAGE_URL_PATTERN.test(input.imageUrl)) {
			return fail('imageUrl debe ser una URL https://.');
		}
	}

	if (input.shortDescription !== undefined && input.shortDescription !== null) {
		if (typeof input.shortDescription !== 'string') {
			return fail('shortDescription debe ser texto.');
		}
		if (input.shortDescription.length > SHORT_DESCRIPTION_MAX_LENGTH) {
			return fail(
				`shortDescription no puede superar ${SHORT_DESCRIPTION_MAX_LENGTH} caracteres.`,
			);
		}
	}

	if (
		input.pillarSlug !== undefined &&
		input.pillarSlug !== null &&
		!isAreaSlug(input.pillarSlug)
	) {
		return fail('pillarSlug no existe.');
	}

	if (input.featured !== undefined && typeof input.featured !== 'boolean') {
		return fail('featured debe ser booleano.');
	}

	if (input.published !== undefined && typeof input.published !== 'boolean') {
		return fail('published debe ser booleano.');
	}

	return { ok: true };
}

/** POST: title y lumaUrl son requeridos. */
export function validateEventPointerInput(input: EventPointerFields): ValidationResult {
	if (input.title === undefined) return fail('title es requerido.');
	const titleResult = validateTitle(input.title);
	if (!titleResult.ok) return titleResult;

	if (input.lumaUrl === undefined) return fail('lumaUrl es requerido.');
	const lumaUrlResult = validateLumaUrl(input.lumaUrl);
	if (!lumaUrlResult.ok) return lumaUrlResult;

	return validateOptionalFields(input);
}

export { validateTitle, validateLumaUrl };
