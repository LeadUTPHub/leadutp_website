import type { GalleryFields, ValidationResult } from './validateGalleryInput';
import {
	validateOptionalGalleryFields,
	validateSlug,
	validateTitle,
} from './validateGalleryInput';

/** PATCH: ningún campo es requerido, pero el que venga se valida igual. */
export function validateGalleryPatch(input: GalleryFields): ValidationResult {
	if (input.title !== undefined) {
		const titleResult = validateTitle(input.title);
		if (!titleResult.ok) return titleResult;
	}

	if (input.slug !== undefined) {
		const slugResult = validateSlug(input.slug);
		if (!slugResult.ok) return slugResult;
	}

	return validateOptionalGalleryFields(input);
}
