// Helpers compartidos por index.ts y [id].ts. El prefijo `_` lo excluye
// del ruteo de Astro (no es un endpoint).
import type { EventPointer } from '../../../../domain/ports/ContentRepository';

export function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

/** Forma de docs/API_CONTRACTS.md: sin `source` (no documentado ahí). */
export function toResponseShape(pointer: EventPointer) {
	return {
		id: pointer.id,
		title: pointer.title,
		lumaUrl: pointer.lumaUrl,
		eventDate: pointer.eventDate,
		location: pointer.location,
		imageUrl: pointer.imageUrl,
		shortDescription: pointer.shortDescription,
		pillarSlug: pointer.pillarSlug,
		areaSlug: pointer.areaSlug,
		ownerId: pointer.ownerId,
		featured: pointer.featured,
		published: pointer.published,
	};
}

export interface EventPointerRequestBody {
	title?: unknown;
	lumaUrl?: unknown;
	eventDate?: unknown;
	location?: unknown;
	imageUrl?: unknown;
	shortDescription?: unknown;
	pillarSlug?: unknown;
	areaSlug?: unknown;
	featured?: unknown;
	published?: unknown;
}

export async function readJsonBody(
	request: Request,
): Promise<EventPointerRequestBody | null> {
	try {
		return await request.json();
	} catch {
		return null;
	}
}
