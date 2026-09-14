// GET/PATCH/DELETE /administrator/api/galleries/:id (docs/API_CONTRACTS.md §3).
// GET no está en el contrato original pero lo necesita T4.5 (pantalla de
// edición: galería + sus fotos) — mismo criterio de autorización que el
// resto (RLS delega, `getGallery` ya respeta "staff reads all" / "public
// reads published").
export const prerender = false;

import type { APIRoute } from 'astro';
import { validateGalleryPatch } from '../../../../domain/validateGalleryPatch';
import { getContentRepositoryForRequest, getPhotoStorage } from '../../../../infra/container';
import { GallerySlugConflictError } from '../../../../infra/supabase/SupabaseContentRepository';
import { json, readJsonBody, toGalleryResponseShape, toPhotoResponseShape } from './_shared';

export const GET: APIRoute = async (context) => {
	const id = context.params.id;
	if (!id) return json({ error: 'Falta el id.' }, 400);

	const repo = getContentRepositoryForRequest(context);
	const gallery = await repo.getGallery(id);
	if (!gallery) return json({ error: 'Galería no encontrada.' }, 404);

	const photos = await repo.listPhotos(id);
	return json(
		{
			gallery: toGalleryResponseShape(gallery),
			photos: photos.map(toPhotoResponseShape),
		},
		200,
	);
};

export const PATCH: APIRoute = async (context) => {
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	const id = context.params.id;
	if (!id) return json({ error: 'Falta el id.' }, 400);

	const body = await readJsonBody<Record<string, unknown>>(context.request);
	if (!body) return json({ error: 'JSON inválido.' }, 400);

	const validation = validateGalleryPatch(body);
	if (!validation.ok) return json({ error: validation.error }, 422);

	const repo = getContentRepositoryForRequest(context);
	try {
		const updated = await repo.updateGallery(id, {
			...(body.title !== undefined && { title: body.title as string }),
			...(body.slug !== undefined && { slug: body.slug as string }),
			...(body.body !== undefined && { body: body.body as string | null }),
			...(body.happenedOn !== undefined && {
				happenedOn: body.happenedOn as string | null,
			}),
			...(body.pillarSlug !== undefined && {
				pillarSlug: body.pillarSlug as string | null,
			}),
			...(body.published !== undefined && { published: body.published as boolean }),
		});

		// Mismo criterio que event-pointers: RLS no distingue "no existe" de
		// "no autorizado" en un update sin filas afectadas — tampoco nosotros.
		if (!updated) return json({ error: 'No encontrado o no autorizado.' }, 404);
		return json({ gallery: toGalleryResponseShape(updated) }, 200);
	} catch (error) {
		if (error instanceof GallerySlugConflictError) {
			return json({ error: error.message }, 409);
		}
		throw error;
	}
};

export const DELETE: APIRoute = async (context) => {
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	const id = context.params.id;
	if (!id) return json({ error: 'Falta el id.' }, 400);

	const repo = getContentRepositoryForRequest(context);

	// Las fotos se leen ANTES de borrar la galería: el cascade en DB se
	// lleva las filas de gallery_photos, así que después ya no tendríamos
	// sus cloudinary_public_id para la limpieza best-effort.
	const photos = await repo.listPhotos(id);

	const deleted = await repo.deleteGallery(id);
	if (!deleted) return json({ error: 'No encontrado o no autorizado.' }, 404);

	const photoStorage = getPhotoStorage();
	await Promise.all(
		photos.map(async (photo) => {
			try {
				await photoStorage.destroy(photo.cloudinaryPublicId);
			} catch (error) {
				// Best-effort (docs/API_CONTRACTS.md §3): se registra y se sigue,
				// nunca bloquea el borrado ya confirmado en Supabase.
				console.error(
					`No se pudo borrar el asset de Cloudinary ${photo.cloudinaryPublicId}:`,
					error,
				);
			}
		}),
	);

	return new Response(null, { status: 204 });
};
