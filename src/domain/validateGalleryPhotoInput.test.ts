import { describe, expect, it } from 'vitest';
import { validateGalleryPhotoInput } from './validateGalleryPhotoInput';

// Reglas de docs/API_CONTRACTS.md §4 (POST /administrator/api/galleries/:id/photos).
const VALID_INPUT = {
	cloudinaryPublicId: 'lead-utp/liderazgo/talent-room-2026-05/abc123',
	secureUrl: 'https://res.cloudinary.com/leadutp/image/upload/v1/abc123.jpg',
	width: 1600,
	height: 1067,
	alt: 'Ponencia durante Talent Room',
};

describe('validateGalleryPhotoInput', () => {
	it('acepta la entrada completa válida', () => {
		expect(validateGalleryPhotoInput(VALID_INPUT)).toEqual({ ok: true });
	});

	it('acepta el mínimo: solo cloudinaryPublicId + secureUrl', () => {
		expect(
			validateGalleryPhotoInput({
				cloudinaryPublicId: 'x/y/z',
				secureUrl: 'https://res.cloudinary.com/x.jpg',
			}),
		).toEqual({ ok: true });
	});

	it('rechaza sin cloudinaryPublicId', () => {
		expect(
			validateGalleryPhotoInput({ ...VALID_INPUT, cloudinaryPublicId: undefined }).ok,
		).toBe(false);
	});

	it('rechaza sin secureUrl', () => {
		expect(
			validateGalleryPhotoInput({ ...VALID_INPUT, secureUrl: undefined }).ok,
		).toBe(false);
	});

	it('rechaza un secureUrl que no es https://', () => {
		expect(
			validateGalleryPhotoInput({
				...VALID_INPUT,
				secureUrl: 'http://res.cloudinary.com/x.jpg',
			}).ok,
		).toBe(false);
	});

	it('rechaza width/height que no son números', () => {
		expect(validateGalleryPhotoInput({ ...VALID_INPUT, width: 'grande' }).ok).toBe(
			false,
		);
	});

	it('rechaza alt que no es texto', () => {
		expect(validateGalleryPhotoInput({ ...VALID_INPUT, alt: 123 }).ok).toBe(false);
	});
});
