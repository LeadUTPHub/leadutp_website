import { describe, expect, it } from 'vitest';
import { getInitialsAvatar } from './testimonialAvatar';

describe('getInitialsAvatar', () => {
	it('"Carlos Gamonal" → CG y colorIndex fijo', () => {
		expect(getInitialsAvatar('Carlos Gamonal')).toEqual({
			initials: 'CG',
			colorIndex: 3,
		});
	});

	it('"Ana" → una sola inicial', () => {
		expect(getInitialsAvatar('Ana').initials).toBe('A');
	});

	it('"María José López Torres" → primera y última palabra', () => {
		expect(getInitialsAvatar('María José López Torres').initials).toBe('MT');
	});

	it('"Ñandú Ñoño" no rompe y respeta ñ', () => {
		const result = getInitialsAvatar('Ñandú Ñoño');
		expect(result.initials).toBe('ÑÑ');
		expect(result.colorIndex).toBeGreaterThanOrEqual(0);
		expect(result.colorIndex).toBeLessThanOrEqual(5);
	});

	it('el mismo nombre dos veces produce el mismo colorIndex', () => {
		const name = 'Carlos Gamonal';
		const first = getInitialsAvatar(name);
		const second = getInitialsAvatar(name);
		expect(first.colorIndex).toBe(second.colorIndex);
		expect(first).toEqual(second);
	});

	it('nombre vacío no lanza excepción', () => {
		expect(() => getInitialsAvatar('')).not.toThrow();
		expect(getInitialsAvatar('')).toEqual({ initials: '?', colorIndex: 0 });
	});

	it('solo espacios no lanza excepción', () => {
		expect(() => getInitialsAvatar('   \t  ')).not.toThrow();
		expect(getInitialsAvatar('   \t  ')).toEqual({
			initials: '?',
			colorIndex: 0,
		});
	});

	it('colorIndex siempre está en el rango 0–5', () => {
		const samples = [
			'Carlos Gamonal',
			'Ana',
			'María José López Torres',
			'Ñandú Ñoño',
			'Z',
		];
		for (const name of samples) {
			const { colorIndex } = getInitialsAvatar(name);
			expect(colorIndex).toBeGreaterThanOrEqual(0);
			expect(colorIndex).toBeLessThanOrEqual(5);
		}
	});
});
