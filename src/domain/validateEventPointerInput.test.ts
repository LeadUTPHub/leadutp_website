import { describe, expect, it } from 'vitest';
import { validateEventPointerInput } from './validateEventPointerInput';

// Reglas de docs/API_CONTRACTS.md §2 (POST /administrator/api/event-pointers).
const VALID_INPUT = {
	title: 'Talent Room',
	lumaUrl: 'https://luma.com/xxxx',
	eventDate: '2026-05-10T18:00:00Z',
	location: 'Auditorio UTP',
	imageUrl: 'https://res.cloudinary.com/leadutp/image/upload/test.jpg',
	shortDescription: 'Taller de talento y liderazgo estudiantil.',
	pillarSlug: 'liderazgo',
	featured: true,
	published: false,
};

describe('validateEventPointerInput', () => {
	it('acepta la tarjeta completa válida', () => {
		expect(validateEventPointerInput(VALID_INPUT)).toEqual({ ok: true });
	});

	it('acepta el mínimo: solo title + lumaUrl', () => {
		expect(
			validateEventPointerInput({
				title: 'Talent Room',
				lumaUrl: 'https://luma.com/xxxx',
			}),
		).toEqual({ ok: true });
	});

	it('rechaza sin title', () => {
		const result = validateEventPointerInput({
			...VALID_INPUT,
			title: undefined,
		});
		expect(result.ok).toBe(false);
	});

	it('rechaza un title de menos de 3 caracteres', () => {
		const result = validateEventPointerInput({ ...VALID_INPUT, title: 'Ta' });
		expect(result.ok).toBe(false);
	});

	it('rechaza un title de más de 120 caracteres', () => {
		const result = validateEventPointerInput({
			...VALID_INPUT,
			title: 'a'.repeat(121),
		});
		expect(result.ok).toBe(false);
	});

	it('rechaza sin lumaUrl', () => {
		const result = validateEventPointerInput({
			...VALID_INPUT,
			lumaUrl: undefined,
		});
		expect(result.ok).toBe(false);
	});

	it('rechaza un lumaUrl que no es de Luma', () => {
		const result = validateEventPointerInput({
			...VALID_INPUT,
			lumaUrl: 'https://evil.com/xxxx',
		});
		expect(result.ok).toBe(false);
	});

	it('acepta lu.ma además de luma.com', () => {
		expect(
			validateEventPointerInput({ ...VALID_INPUT, lumaUrl: 'https://lu.ma/xxxx' }),
		).toEqual({ ok: true });
	});

	it('rechaza un eventDate que no es una fecha ISO válida', () => {
		const result = validateEventPointerInput({
			...VALID_INPUT,
			eventDate: 'no-es-una-fecha',
		});
		expect(result.ok).toBe(false);
	});

	it('acepta eventDate ausente (opcional)', () => {
		expect(
			validateEventPointerInput({ ...VALID_INPUT, eventDate: undefined }),
		).toEqual({ ok: true });
	});

	it('rechaza un imageUrl que no empieza con https://', () => {
		const result = validateEventPointerInput({
			...VALID_INPUT,
			imageUrl: 'http://inseguro.com/foto.jpg',
		});
		expect(result.ok).toBe(false);
	});

	it('acepta imageUrl ausente (opcional)', () => {
		expect(
			validateEventPointerInput({ ...VALID_INPUT, imageUrl: undefined }),
		).toEqual({ ok: true });
	});

	it('rechaza shortDescription de más de 280 caracteres', () => {
		const result = validateEventPointerInput({
			...VALID_INPUT,
			shortDescription: 'a'.repeat(281),
		});
		expect(result.ok).toBe(false);
	});

	it('acepta shortDescription de exactamente 280 caracteres', () => {
		expect(
			validateEventPointerInput({
				...VALID_INPUT,
				shortDescription: 'a'.repeat(280),
			}),
		).toEqual({ ok: true });
	});

	it('rechaza un pillarSlug que no existe', () => {
		const result = validateEventPointerInput({
			...VALID_INPUT,
			pillarSlug: 'pilar-inventado',
		});
		expect(result.ok).toBe(false);
	});

	it('acepta pillarSlug ausente (opcional)', () => {
		expect(
			validateEventPointerInput({ ...VALID_INPUT, pillarSlug: undefined }),
		).toEqual({ ok: true });
	});

	it('rechaza featured que no es booleano', () => {
		const result = validateEventPointerInput({
			...VALID_INPUT,
			featured: 'sí',
		});
		expect(result.ok).toBe(false);
	});

	it('rechaza published que no es booleano', () => {
		const result = validateEventPointerInput({
			...VALID_INPUT,
			published: 'no',
		});
		expect(result.ok).toBe(false);
	});
});
