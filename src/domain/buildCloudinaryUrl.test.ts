import { describe, expect, it } from 'vitest';
import { buildCloudinaryUrl } from './buildCloudinaryUrl';

// ARCHITECTURE.md §2: buildCloudinaryUrl(publicId, width) ->
// https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,w_<width>/<publicId>
describe('buildCloudinaryUrl', () => {
	it('arma la URL de entrega con f_auto,q_auto y el ancho pedido', () => {
		const url = buildCloudinaryUrl({
			cloudName: 'leadutp',
			publicId: 'lead-utp/liderazgo/talent-room-2026/abc123',
			width: 800,
		});
		expect(url).toBe(
			'https://res.cloudinary.com/leadutp/image/upload/f_auto,q_auto,w_800/lead-utp/liderazgo/talent-room-2026/abc123',
		);
	});

	it('cambia solo el ancho entre dos anchos distintos', () => {
		const base = { cloudName: 'leadutp', publicId: 'x/y/z' };
		const small = buildCloudinaryUrl({ ...base, width: 400 });
		const large = buildCloudinaryUrl({ ...base, width: 1200 });
		expect(small).toContain('w_400');
		expect(large).toContain('w_1200');
		expect(small).not.toBe(large);
	});
});
