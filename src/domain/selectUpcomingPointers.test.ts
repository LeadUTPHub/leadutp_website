import { describe, expect, it } from 'vitest';
import type { EventPointer } from './ports/ContentRepository';
import {
	isPointerUpcoming,
	selectUpcomingPointers,
} from './selectUpcomingPointers';

// Cambio de alcance (2026-09-14, post-Sprint 5): /eventos público deja de
// mostrar el embed/link genérico a Luma — "Próximos eventos" pasa a ser
// SOLO la lista de punteros published && no vencidos (ya no exige
// `featured`, a diferencia de la regla anterior de T3.5/selectFeaturedPointers).
// Ver MEMORY.md D-16.

const NOW = new Date('2026-06-15T12:00:00Z');

function pointer(overrides: Partial<EventPointer>): EventPointer {
	return {
		id: 'p1',
		title: 'Talent Room',
		lumaUrl: 'https://luma.com/xxxx',
		eventDate: '2026-06-20T18:00:00Z',
		location: 'Auditorio UTP',
		imageUrl: null,
		shortDescription: null,
		pillarSlug: 'liderazgo',
		areaSlug: 'liderazgo',
		ownerId: 'owner-1',
		featured: false,
		published: true,
		source: 'supabase',
		...overrides,
	};
}

describe('selectUpcomingPointers', () => {
	it('incluye un puntero published con fecha futura', () => {
		const result = selectUpcomingPointers(
			[pointer({ id: 'a', eventDate: '2026-06-20T18:00:00Z' })],
			NOW,
		);
		expect(result.map((p) => p.id)).toEqual(['a']);
	});

	it('excluye un puntero published pero con fecha ya pasada (vencido)', () => {
		const result = selectUpcomingPointers(
			[pointer({ id: 'a', eventDate: '2026-06-01T18:00:00Z' })],
			NOW,
		);
		expect(result).toHaveLength(0);
	});

	it('incluye un puntero published sin eventDate (no hay forma de saber que venció)', () => {
		const result = selectUpcomingPointers(
			[pointer({ id: 'a', eventDate: null })],
			NOW,
		);
		expect(result.map((p) => p.id)).toEqual(['a']);
	});

	it('excluye un puntero no published aunque tenga fecha futura', () => {
		const result = selectUpcomingPointers(
			[
				pointer({
					id: 'a',
					published: false,
					eventDate: '2026-06-20T18:00:00Z',
				}),
			],
			NOW,
		);
		expect(result).toHaveLength(0);
	});

	it('ya no exige featured (a diferencia de la regla anterior)', () => {
		const result = selectUpcomingPointers(
			[pointer({ id: 'a', featured: false, published: true })],
			NOW,
		);
		expect(result.map((p) => p.id)).toEqual(['a']);
	});

	it('incluye un evento exactamente en el instante "now" (todavía no venció)', () => {
		const result = selectUpcomingPointers(
			[pointer({ id: 'a', eventDate: NOW.toISOString() })],
			NOW,
		);
		expect(result.map((p) => p.id)).toEqual(['a']);
	});

	it('devuelve [] si no hay punteros', () => {
		expect(selectUpcomingPointers([], NOW)).toEqual([]);
	});

	it('conserva el orden de entrada (la repo ya ordena por event_date)', () => {
		const result = selectUpcomingPointers(
			[
				pointer({ id: 'a', eventDate: '2026-06-20T18:00:00Z' }),
				pointer({ id: 'b', eventDate: '2026-06-01T18:00:00Z' }), // vencido
				pointer({ id: 'c', eventDate: '2026-07-01T18:00:00Z' }),
			],
			NOW,
		);
		expect(result.map((p) => p.id)).toEqual(['a', 'c']);
	});

	it('sin `now` explícito usa la fecha real (humo, no determinista)', () => {
		const farFuture = pointer({
			id: 'a',
			eventDate: '2999-01-01T00:00:00Z',
		});
		expect(selectUpcomingPointers([farFuture]).map((p) => p.id)).toEqual(['a']);
	});
});

// Defecto A del BUG 2 (Sprint 6): el panel aceptaba una fecha pasada en
// silencio, mostraba "Publicado", y el evento quedaba invisible para
// siempre en /eventos sin que nada se lo dijera al director. El panel
// necesita poder decir "esto ya venció" — y esa respuesta tiene que salir
// de la MISMA regla que usa el sitio público, no de una copia que pueda
// desincronizarse. Por eso la regla se extrae acá y `selectUpcomingPointers`
// pasa a ser su consumidor, no su dueño.
describe('isPointerUpcoming', () => {
	it('es true para una fecha futura', () => {
		expect(
			isPointerUpcoming(pointer({ eventDate: '2026-06-20T18:00:00Z' }), NOW),
		).toBe(true);
	});

	it('es false para una fecha ya pasada', () => {
		expect(
			isPointerUpcoming(pointer({ eventDate: '2026-06-01T18:00:00Z' }), NOW),
		).toBe(false);
	});

	it('es true sin eventDate (no hay forma de saber que venció)', () => {
		expect(isPointerUpcoming(pointer({ eventDate: null }), NOW)).toBe(true);
	});

	it('es true en el instante exacto del evento', () => {
		expect(
			isPointerUpcoming(pointer({ eventDate: NOW.toISOString() }), NOW),
		).toBe(true);
	});

	it('mira SOLO la fecha, no `published` — de eso se ocupa quien la use', () => {
		expect(
			isPointerUpcoming(
				pointer({ published: false, eventDate: '2026-06-20T18:00:00Z' }),
				NOW,
			),
		).toBe(true);
	});

	it('es false si la fecha guardada no se puede parsear (dato corrupto)', () => {
		expect(isPointerUpcoming(pointer({ eventDate: 'no-es-fecha' }), NOW)).toBe(
			false,
		);
	});

	it('es la misma regla que aplica selectUpcomingPointers', () => {
		const candidatos = [
			pointer({ id: 'a', eventDate: '2026-06-20T18:00:00Z' }),
			pointer({ id: 'b', eventDate: '2026-06-01T18:00:00Z' }),
			pointer({ id: 'c', eventDate: null }),
		];
		expect(selectUpcomingPointers(candidatos, NOW).map((p) => p.id)).toEqual(
			candidatos.filter((p) => isPointerUpcoming(p, NOW)).map((p) => p.id),
		);
	});
});
