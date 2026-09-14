import { describe, expect, it } from 'vitest';
import { validateEventPointerPatch } from './validateEventPointerPatch';

// PATCH /administrator/api/event-pointers/:id (docs/API_CONTRACTS.md §2):
// "Campos parciales de los de arriba (menos areaSlug/ownerId)" — a
// diferencia de POST, ningún campo es requerido, pero el que venga se
// valida con las mismas reglas.
describe('validateEventPointerPatch', () => {
	it('acepta un patch vacío (sin campos que cambiar)', () => {
		expect(validateEventPointerPatch({})).toEqual({ ok: true });
	});

	it('acepta un patch parcial válido sin title ni lumaUrl', () => {
		expect(
			validateEventPointerPatch({ location: 'Nueva sede', featured: true }),
		).toEqual({ ok: true });
	});

	it('valida title con las mismas reglas si viene presente', () => {
		const result = validateEventPointerPatch({ title: 'Ta' });
		expect(result.ok).toBe(false);
	});

	it('valida lumaUrl con las mismas reglas si viene presente', () => {
		const result = validateEventPointerPatch({ lumaUrl: 'https://evil.com/x' });
		expect(result.ok).toBe(false);
	});

	it('rechaza un shortDescription de más de 280 caracteres', () => {
		const result = validateEventPointerPatch({
			shortDescription: 'a'.repeat(281),
		});
		expect(result.ok).toBe(false);
	});

	it('rechaza un pillarSlug inexistente', () => {
		const result = validateEventPointerPatch({ pillarSlug: 'no-existe' });
		expect(result.ok).toBe(false);
	});

	it('acepta title y lumaUrl válidos juntos', () => {
		expect(
			validateEventPointerPatch({
				title: 'Nuevo título',
				lumaUrl: 'https://luma.com/nuevo',
			}),
		).toEqual({ ok: true });
	});
});
