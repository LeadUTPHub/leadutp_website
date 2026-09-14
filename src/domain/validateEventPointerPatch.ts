import type { EventPointerFields, ValidationResult } from './validateEventPointerInput';
import {
	validateLumaUrl,
	validateOptionalFields,
	validateTitle,
} from './validateEventPointerInput';

/**
 * PATCH: a diferencia de POST, ningún campo es requerido (docs/API_CONTRACTS.md
 * §2: "Campos parciales de los de arriba, menos areaSlug/ownerId") — pero
 * el que venga se valida con las mismas reglas que en la creación.
 */
export function validateEventPointerPatch(input: EventPointerFields): ValidationResult {
	if (input.title !== undefined) {
		const titleResult = validateTitle(input.title);
		if (!titleResult.ok) return titleResult;
	}

	if (input.lumaUrl !== undefined) {
		const lumaUrlResult = validateLumaUrl(input.lumaUrl);
		if (!lumaUrlResult.ok) return lumaUrlResult;
	}

	return validateOptionalFields(input);
}
