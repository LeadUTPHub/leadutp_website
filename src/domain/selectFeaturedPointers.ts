import type { EventPointer } from './ports/ContentRepository';

/**
 * Qué se muestra en /eventos (público), junto al embed de Luma (T3.5).
 * Defensa en profundidad: la RLS de `anon` ya filtra `published = true`
 * (schema.sql §9.2), pero esta regla no depende solo de eso — y aplica
 * `featured`, que la RLS no conoce.
 */
export function selectFeaturedPointers(pointers: EventPointer[]): EventPointer[] {
	return pointers.filter((pointer) => pointer.featured && pointer.published);
}
