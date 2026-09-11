import { describe, expect, it } from 'vitest';
import type { EventPointer } from './ports/ContentRepository';
import { selectFeaturedPointers } from './selectFeaturedPointers';

// T3.5: "/eventos" público solo muestra punteros published && featured,
// junto al embed de Luma. La RLS de anon ya filtra published=true (schema.sql
// §9.2, "public reads published"), pero esta regla no confía solo en eso
// —defensa en profundidad— y además aplica el filtro de featured, que la
// RLS no conoce.
function pointer(overrides: Partial<EventPointer>): EventPointer {
	return {
		id: 'p1',
		title: 'Talent Room',
		lumaUrl: 'https://luma.com/xxxx',
		eventDate: '2026-05-10T18:00:00Z',
		location: 'Auditorio UTP',
		imageUrl: null,
		shortDescription: null,
		pillarSlug: 'liderazgo',
		areaSlug: 'liderazgo',
		ownerId: 'owner-1',
		featured: true,
		published: true,
		source: 'supabase',
		...overrides,
	};
}

describe('selectFeaturedPointers', () => {
	it('incluye un puntero published && featured', () => {
		const result = selectFeaturedPointers([
			pointer({ id: 'a', featured: true, published: true }),
		]);
		expect(result.map((p) => p.id)).toEqual(['a']);
	});

	it('excluye un puntero featured pero no published (borrador)', () => {
		const result = selectFeaturedPointers([
			pointer({ id: 'a', featured: true, published: false }),
		]);
		expect(result).toHaveLength(0);
	});

	it('excluye un puntero published pero no featured', () => {
		const result = selectFeaturedPointers([
			pointer({ id: 'a', featured: false, published: true }),
		]);
		expect(result).toHaveLength(0);
	});

	it('devuelve [] si no hay punteros', () => {
		expect(selectFeaturedPointers([])).toEqual([]);
	});

	it('conserva el orden de entrada (la repo ya ordena por event_date)', () => {
		const result = selectFeaturedPointers([
			pointer({ id: 'a', featured: true, published: true }),
			pointer({ id: 'b', featured: false, published: true }),
			pointer({ id: 'c', featured: true, published: true }),
		]);
		expect(result.map((p) => p.id)).toEqual(['a', 'c']);
	});
});
