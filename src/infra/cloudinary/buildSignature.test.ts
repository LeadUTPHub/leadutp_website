import { describe, expect, it } from 'vitest';
import { buildSignature } from './buildSignature';

// Vector de prueba generado independientemente con node:crypto (mismo
// algoritmo documentado por Cloudinary: SHA-1 de los params ordenados
// alfabéticamente, unidos por "&", con el secret pegado al final —
// https://cloudinary.com/documentation/authentication_signatures).
// Ya usado y verificado en producción por scripts/verify-cloudinary-upload.mjs
// (T0.4): misma fórmula, folder + timestamp.
describe('buildSignature', () => {
	it('coincide con el vector de prueba esperado por Cloudinary', () => {
		const signature = buildSignature(
			{ folder: 'lead-utp/liderazgo/talent-room-2026', timestamp: 1700000000 },
			'test_secret_vector',
		);
		expect(signature).toBe('1a5cad551411bebce8abc1a3affb6c8f2e9d4e10');
	});

	it('ordena los params alfabéticamente sin importar el orden de entrada', () => {
		const a = buildSignature({ timestamp: 1700000000, folder: 'x' }, 'secret');
		const b = buildSignature({ folder: 'x', timestamp: 1700000000 }, 'secret');
		expect(a).toBe(b);
	});

	it('un secret distinto produce una firma distinta', () => {
		const a = buildSignature({ folder: 'x', timestamp: 1 }, 'secret-a');
		const b = buildSignature({ folder: 'x', timestamp: 1 }, 'secret-b');
		expect(a).not.toBe(b);
	});

	it('un solo param cambiado produce una firma distinta', () => {
		const a = buildSignature({ folder: 'x', timestamp: 1 }, 'secret');
		const b = buildSignature({ folder: 'y', timestamp: 1 }, 'secret');
		expect(a).not.toBe(b);
	});

	it('devuelve siempre 40 caracteres hex (SHA-1)', () => {
		const signature = buildSignature({ folder: 'x', timestamp: 1 }, 'secret');
		expect(signature).toMatch(/^[0-9a-f]{40}$/);
	});
});
