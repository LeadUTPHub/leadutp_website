import { describe, expect, it } from 'vitest';
import { datetimeLocalToIso, isoToDatetimeLocal } from './limaDateTime';

// Defecto B del BUG 2 (Sprint 6). OJO con el historial de este defecto:
// el diagnóstico original decía "corrimiento fijo de −5h", y era FALSO —
// venía de medir con un `curl` que mandaba el string naive del
// `datetime-local` directo al endpoint, saltándose la conversión
// `new Date(local).toISOString()` que el script del navegador sí hace.
// Por el camino real de la app no había ningún corrimiento.
//
// Lo que sí es real, y es lo que estas funciones resuelven: la ENTRADA se
// interpretaba en la zona horaria del navegador del director, mientras que
// la tarjeta pública está fija en 'America/Lima' (EventPointerCard.astro).
// Las dos coinciden solo mientras la máquina del director esté en UTC−5 —
// hoy calza por coincidencia de offset, no por diseño. Un director con la
// zona del sistema mal puesta, o cargando un evento desde el extranjero,
// tipea 18:00 y el sitio publica otra hora.
//
// Por eso estas funciones NO usan getters locales (`getHours`,
// `getFullYear`, ...) en ningún punto: solo `Date.UTC` y `getUTC*`. El
// resultado es el mismo corra donde corra — y las aserciones de acá se
// escriben contra `Date.UTC(...)` justamente para que el test no pase por
// casualidad en una máquina que ya está en UTC−5, como la del PO.

describe('datetimeLocalToIso', () => {
	it('interpreta el valor del input como hora de Lima, no de la máquina', () => {
		// 18:00 en Lima (UTC−5) es 23:00 UTC del mismo día.
		expect(Date.parse(datetimeLocalToIso('2026-12-20T18:00')!)).toBe(
			Date.UTC(2026, 11, 20, 23, 0, 0),
		);
	});

	it('cruza al día siguiente cuando corresponde', () => {
		// 20:00 de Lima ya es la 1:00 UTC del día siguiente.
		expect(Date.parse(datetimeLocalToIso('2026-12-20T20:00')!)).toBe(
			Date.UTC(2026, 11, 21, 1, 0, 0),
		);
	});

	it('la medianoche de Lima son las 05:00 UTC del mismo día', () => {
		expect(Date.parse(datetimeLocalToIso('2026-12-20T00:00')!)).toBe(
			Date.UTC(2026, 11, 20, 5, 0, 0),
		);
	});

	it('acepta segundos si el input los trae', () => {
		expect(Date.parse(datetimeLocalToIso('2026-12-20T18:00:30')!)).toBe(
			Date.UTC(2026, 11, 20, 23, 0, 30),
		);
	});

	it('devuelve un ISO en UTC (terminado en Z), que es lo que espera el endpoint', () => {
		expect(datetimeLocalToIso('2026-12-20T18:00')).toBe(
			'2026-12-20T23:00:00.000Z',
		);
	});

	it('devuelve null si el formato no es el de un datetime-local', () => {
		expect(datetimeLocalToIso('')).toBeNull();
		expect(datetimeLocalToIso('no-es-fecha')).toBeNull();
		expect(datetimeLocalToIso('2026-12-20')).toBeNull();
		expect(datetimeLocalToIso('2026-12-20T18:00:00.000Z')).toBeNull();
	});

	it('devuelve null si la fecha no existe en el calendario', () => {
		// Date.UTC normaliza en silencio (30 de febrero → 2 de marzo); acá no.
		expect(datetimeLocalToIso('2026-02-30T10:00')).toBeNull();
		expect(datetimeLocalToIso('2026-13-01T10:00')).toBeNull();
		expect(datetimeLocalToIso('2026-00-10T10:00')).toBeNull();
		expect(datetimeLocalToIso('2026-12-32T10:00')).toBeNull();
	});

	it('devuelve null si la hora está fuera de rango', () => {
		expect(datetimeLocalToIso('2026-12-20T24:00')).toBeNull();
		expect(datetimeLocalToIso('2026-12-20T18:60')).toBeNull();
	});

	it('acepta el 29 de febrero de un año bisiesto', () => {
		expect(Date.parse(datetimeLocalToIso('2028-02-29T09:30')!)).toBe(
			Date.UTC(2028, 1, 29, 14, 30, 0),
		);
	});
});

describe('isoToDatetimeLocal', () => {
	it('devuelve la hora de Lima, no la de la máquina', () => {
		expect(isoToDatetimeLocal('2026-12-20T23:00:00.000Z')).toBe(
			'2026-12-20T18:00',
		);
	});

	it('retrocede al día anterior cuando corresponde', () => {
		expect(isoToDatetimeLocal('2026-12-21T01:00:00.000Z')).toBe(
			'2026-12-20T20:00',
		);
	});

	it('acepta un ISO con offset explícito, no solo Z', () => {
		// El mismo instante escrito de otra forma tiene que dar lo mismo.
		expect(isoToDatetimeLocal('2026-12-20T23:00:00+00:00')).toBe(
			'2026-12-20T18:00',
		);
		expect(isoToDatetimeLocal('2026-12-20T18:00:00-05:00')).toBe(
			'2026-12-20T18:00',
		);
	});

	it('devuelve "" sin fecha o con una fecha imparseable', () => {
		expect(isoToDatetimeLocal(null)).toBe('');
		expect(isoToDatetimeLocal('')).toBe('');
		expect(isoToDatetimeLocal('no-es-fecha')).toBe('');
	});

	it('hace round-trip exacto con datetimeLocalToIso', () => {
		for (const valor of [
			'2026-12-20T18:00',
			'2026-12-20T00:00',
			'2026-12-20T23:59',
			'2028-02-29T09:30',
			'2026-01-01T00:00',
		]) {
			expect(isoToDatetimeLocal(datetimeLocalToIso(valor))).toBe(valor);
		}
	});

	it('es consistente con cómo la tarjeta pública formatea la fecha', () => {
		// EventPointerCard.astro formatea con timeZone: 'America/Lima'. Si el
		// prefill del panel y esa tarjeta no coincidieran, el director editaría
		// una hora distinta de la que el visitante ve — que es exactamente el
		// desacople que este fix cierra.
		const iso = datetimeLocalToIso('2026-12-20T18:00')!;
		const enLaTarjeta = new Intl.DateTimeFormat('es-PE', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
			timeZone: 'America/Lima',
		}).format(new Date(iso));
		expect(enLaTarjeta).toBe('18:00');
		expect(isoToDatetimeLocal(iso)).toBe('2026-12-20T18:00');
	});
});
