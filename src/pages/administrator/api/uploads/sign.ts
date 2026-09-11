// POST /administrator/api/uploads/sign (docs/API_CONTRACTS.md §4).
// El middleware ya exige sesión para todo /administrator/** salvo
// /administrator/login (ver src/middleware.ts). La autorización real es
// canEditGallery() (RPC can_edit_gallery, mismo predicado que la RLS de
// gallery_photos) — este endpoint no reimplementa la regla.
export const prerender = false;

import type { APIRoute } from 'astro';
import { getContentRepositoryForRequest, getPhotoStorage } from '../../../../infra/container';

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

export const POST: APIRoute = async (context) => {
	// Chequeo defensivo: el middleware ya garantiza sesión acá.
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	let body: { galleryId?: unknown };
	try {
		body = await context.request.json();
	} catch {
		return json({ error: 'JSON inválido.' }, 400);
	}

	const galleryId = body.galleryId;
	if (typeof galleryId !== 'string' || !galleryId) {
		return json({ error: 'galleryId es requerido.' }, 422);
	}

	const repo = getContentRepositoryForRequest(context);

	// getGallery primero: además de dar el 404 correcto, trae area_slug/slug
	// para construir el folder — no hace falta una segunda lectura.
	const gallery = await repo.getGallery(galleryId);
	if (!gallery) return json({ error: 'Galería no encontrada.' }, 404);

	const canEdit = await repo.canEditGallery(galleryId);
	if (!canEdit) {
		return json({ error: 'No autorizado para editar esta galería.' }, 403);
	}

	const folder = `lead-utp/${gallery.areaSlug}/${gallery.slug}`;

	try {
		const signed = await getPhotoStorage().sign(folder);
		return json(signed, 200);
	} catch {
		return json({ error: 'Cloudinary no está configurado.' }, 503);
	}
};
