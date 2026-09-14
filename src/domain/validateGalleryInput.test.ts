import { describe, expect, it } from 'vitest';
import { validateGalleryInput } from './validateGalleryInput';

// Reglas de docs/API_CONTRACTS.md §3 (POST /administrator/api/galleries).
const VALID_INPUT = {
	title: 'Así se vivió el Talent Room',
	slug: 'talent-room-2026-05',
	body: 'Texto en **markdown**',
	happenedOn: '2026-05-10',
	pillarSlug: 'liderazgo',
	published: false,
};

describe('validateGalleryInput', () => {
	it('acepta la entrada completa válida', () => {
		expect(validateGalleryInput(VALID_INPUT)).toEqual({ ok: true });
	});

	it('acepta el mínimo: solo title + slug', () => {
		expect(
			validateGalleryInput({ title: 'Así se vivió', slug: 'asi-se-vivio' }),
		).toEqual({ ok: true });
	});

	it('rechaza sin title', () => {
		expect(validateGalleryInput({ ...VALID_INPUT, title: undefined }).ok).toBe(false);
	});

	it('rechaza un title de menos de 3 caracteres', () => {
		expect(validateGalleryInput({ ...VALID_INPUT, title: 'Ta' }).ok).toBe(false);
	});

	it('rechaza un title de más de 140 caracteres', () => {
		expect(
			validateGalleryInput({ ...VALID_INPUT, title: 'a'.repeat(141) }).ok,
		).toBe(false);
	});

	it('rechaza sin slug', () => {
		expect(validateGalleryInput({ ...VALID_INPUT, slug: undefined }).ok).toBe(false);
	});

	it('rechaza un slug con mayúsculas o caracteres inválidos', () => {
		expect(validateGalleryInput({ ...VALID_INPUT, slug: 'Talent Room!' }).ok).toBe(
			false,
		);
	});

	it('acepta un slug con guiones y números', () => {
		expect(
			validateGalleryInput({ ...VALID_INPUT, slug: 'talent-room-2026-05' }),
		).toEqual({ ok: true });
	});

	it('rechaza un happenedOn que no es una fecha válida', () => {
		expect(
			validateGalleryInput({ ...VALID_INPUT, happenedOn: 'no-es-fecha' }).ok,
		).toBe(false);
	});

	it('acepta happenedOn ausente (opcional)', () => {
		expect(
			validateGalleryInput({ ...VALID_INPUT, happenedOn: undefined }),
		).toEqual({ ok: true });
	});

	it('rechaza un pillarSlug que no existe', () => {
		expect(
			validateGalleryInput({ ...VALID_INPUT, pillarSlug: 'no-existe' }).ok,
		).toBe(false);
	});

	it('rechaza published que no es booleano', () => {
		expect(validateGalleryInput({ ...VALID_INPUT, published: 'sí' }).ok).toBe(false);
	});

	it('rechaza body que no es texto', () => {
		expect(validateGalleryInput({ ...VALID_INPUT, body: 123 }).ok).toBe(false);
	});
});
