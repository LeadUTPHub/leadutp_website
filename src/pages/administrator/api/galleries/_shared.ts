// Helpers compartidos por los endpoints de galerías/fotos. El prefijo
// `_` lo excluye del ruteo de Astro (ver MEMORY.md L21).
import type {
	Gallery,
	GalleryPhoto,
	GalleryWithPhotoCount,
} from '../../../../domain/ports/ContentRepository';

export function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

export async function readJsonBody<T>(request: Request): Promise<T | null> {
	try {
		return await request.json();
	} catch {
		return null;
	}
}

/** Forma de docs/API_CONTRACTS.md §3: sin `source` (no documentado ahí). */
export function toGalleryResponseShape(gallery: Gallery | GalleryWithPhotoCount) {
	const shape: Record<string, unknown> = {
		id: gallery.id,
		title: gallery.title,
		slug: gallery.slug,
		body: gallery.body,
		happenedOn: gallery.happenedOn,
		pillarSlug: gallery.pillarSlug,
		areaSlug: gallery.areaSlug,
		ownerId: gallery.ownerId,
		published: gallery.published,
	};
	if ('photoCount' in gallery) shape.photoCount = gallery.photoCount;
	return shape;
}

/** Forma de docs/API_CONTRACTS.md §4: sin `source`. */
export function toPhotoResponseShape(photo: GalleryPhoto) {
	return {
		id: photo.id,
		galleryId: photo.galleryId,
		cloudinaryPublicId: photo.cloudinaryPublicId,
		secureUrl: photo.secureUrl,
		width: photo.width,
		height: photo.height,
		alt: photo.alt,
		position: photo.position,
	};
}
