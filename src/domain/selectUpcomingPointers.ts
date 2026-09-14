import type { EventPointer } from './ports/ContentRepository';

/**
 * Qué se muestra en "Próximos eventos" de /eventos (público), desde el
 * cambio de alcance del 2026-09-14 (MEMORY.md D-16): ya no hay embed/link
 * genérico a Luma — la sección es SOLO la lista de punteros publicados y
 * no vencidos. A diferencia de la regla anterior (T3.5, ver el ya
 * eliminado selectFeaturedPointers.ts), ya no exige `featured`: todo
 * puntero publicado con fecha futura (o sin fecha) se muestra.
 *
 * Defensa en profundidad: la RLS de `anon` ya filtra `published = true`
 * (schema.sql §9.2), pero esta regla no depende solo de eso.
 *
 * Un puntero sin `eventDate` (campo opcional) se trata como "no vencido"
 * — no hay forma de saber que ya pasó, y ocultarlo sería más incorrecto
 * que mostrarlo.
 */
export function selectUpcomingPointers(
	pointers: EventPointer[],
	now: Date = new Date(),
): EventPointer[] {
	return pointers.filter(
		(pointer) =>
			pointer.published &&
			(pointer.eventDate === null ||
				new Date(pointer.eventDate).getTime() >= now.getTime()),
	);
}
