import { describe, expect, it } from 'vitest';
import { parseCookieHeader } from './cookieHeader';

describe('parseCookieHeader', () => {
	it('devuelve [] para un header vacío o ausente', () => {
		expect(parseCookieHeader('')).toEqual([]);
		expect(parseCookieHeader(null)).toEqual([]);
	});

	it('parsea un solo par name=value', () => {
		expect(parseCookieHeader('sb-access-token=abc123')).toEqual([
			{ name: 'sb-access-token', value: 'abc123' },
		]);
	});

	it('parsea varios pares separados por "; "', () => {
		expect(parseCookieHeader('a=1; b=2; c=3')).toEqual([
			{ name: 'a', value: '1' },
			{ name: 'b', value: '2' },
			{ name: 'c', value: '3' },
		]);
	});

	it('decodifica valores URL-encoded (Supabase codifica en base64url con "=" y "%")', () => {
		expect(parseCookieHeader('a=hola%20mundo')).toEqual([
			{ name: 'a', value: 'hola mundo' },
		]);
	});

	it('ignora entradas malformadas sin "="', () => {
		expect(parseCookieHeader('a=1; malformada; b=2')).toEqual([
			{ name: 'a', value: '1' },
			{ name: 'b', value: '2' },
		]);
	});
});
