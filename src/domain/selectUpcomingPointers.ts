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
/**
 * ¿La fecha de este puntero todavía no venció? Mira SOLO la fecha — de
 * `published` se ocupa quien la use.
 *
 * Vive separada (defecto A del BUG 2, Sprint 6) porque el panel necesita
 * responder "¿por qué mi evento no se ve en la web?" con exactamente la
 * misma regla que aplica el sitio público. Copiar la condición en
 * /administrator/eventos habría funcionado hoy y se habría desincronizado
 * a la primera vez que alguien ajuste el criterio de vencimiento.
 *
 * Una fecha guardada que no se puede parsear se trata como vencida: es un
 * dato roto, y mostrarlo como "próximo" en el sitio público sería peor que
 * ocultarlo (el caso `null` es distinto — ahí no hay fecha que romper).
 */
export function isPointerUpcoming(
	pointer: EventPointer,
	now: Date = new Date(),
): boolean {
	if (pointer.eventDate === null) return true;
	const time = new Date(pointer.eventDate).getTime();
	if (Number.isNaN(time)) return false;
	return time >= now.getTime();
}

export function selectUpcomingPointers(
	pointers: EventPointer[],
	now: Date = new Date(),
): EventPointer[] {
	return pointers.filter(
		(pointer) => pointer.published && isPointerUpcoming(pointer, now),
	);
}
