import { describe, expect, it } from 'vitest';
import { easeOutCubic, formatCountValue } from './homeStatsCounter';

describe('formatCountValue', () => {
	it('progress = 1 devuelve exactamente el target, sin decimales', () => {
		expect(formatCountValue(1, { target: 100 })).toBe('100');
	});

	it('aplica el sufijo en progress = 1', () => {
		expect(formatCountValue(1, { target: 100, suffix: '+' })).toBe('100+');
	});

	it('aplica el prefijo', () => {
		expect(formatCountValue(1, { target: 100, prefix: '$' })).toBe('$100');
	});

	it('aplica prefijo y sufijo juntos', () => {
		expect(formatCountValue(1, { target: 50, prefix: '~', suffix: '%' })).toBe(
			'~50%',
		);
	});

	it('progress = 0 devuelve 0', () => {
		expect(formatCountValue(0, { target: 100 })).toBe('0');
	});

	it('progress intermedio redondea al entero correspondiente', () => {
		expect(formatCountValue(0.5, { target: 100 })).toBe('50');
		expect(formatCountValue(0.25, { target: 100 })).toBe('25');
	});

	it('valores >= 1000 usan separador de miles es-PE', () => {
		const result = formatCountValue(1, { target: 1500 });
		const esPE = new Intl.NumberFormat('es-PE').format(1500);
		expect(result).toBe(esPE);
		// Debe incluir un separador (algún carácter no numérico), no "1500".
		expect(result).not.toBe('1500');
		expect(result).toMatch(/\D/);
	});

	it('preserva prefijo/sufijo junto al separador de miles', () => {
		const esPE = new Intl.NumberFormat('es-PE').format(1500);
		expect(formatCountValue(1, { target: 1500, suffix: '+' })).toBe(
			`${esPE}+`,
		);
	});

	it('progress > 1 se acota a 1 (no lanza, devuelve el target)', () => {
		expect(() => formatCountValue(1.5, { target: 100 })).not.toThrow();
		expect(formatCountValue(1.5, { target: 100 })).toBe('100');
	});

	it('progress < 0 se acota a 0 (no lanza, devuelve 0)', () => {
		expect(() => formatCountValue(-0.3, { target: 100 })).not.toThrow();
		expect(formatCountValue(-0.3, { target: 100 })).toBe('0');
	});

	it('progress no finito cae a 0 sin lanzar', () => {
		expect(() => formatCountValue(NaN, { target: 100 })).not.toThrow();
		expect(formatCountValue(NaN, { target: 100 })).toBe('0');
	});
});

describe('easeOutCubic', () => {
	it('easeOutCubic(0) === 0', () => {
		expect(easeOutCubic(0)).toBe(0);
	});

	it('easeOutCubic(1) === 1', () => {
		expect(easeOutCubic(1)).toBe(1);
	});

	it('es monótona creciente en (0, 1)', () => {
		expect(easeOutCubic(0.25)).toBeLessThan(easeOutCubic(0.5));
		expect(easeOutCubic(0.5)).toBeLessThan(easeOutCubic(0.75));
	});

	it('desacelera al final (más avance al inicio que al final)', () => {
		// Curva "out": en la primera mitad avanza más que en la segunda.
		expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
	});

	it('acota entradas fuera de [0, 1] sin lanzar', () => {
		expect(() => easeOutCubic(-1)).not.toThrow();
		expect(easeOutCubic(-1)).toBe(0);
		expect(easeOutCubic(2)).toBe(1);
	});
});
