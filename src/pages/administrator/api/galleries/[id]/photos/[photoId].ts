// PATCH/DELETE /administrator/api/galleries/:id/photos/:photoId
// (docs/API_CONTRACTS.md §4).
export const prerender = false;

import type { APIRoute } from 'astro';
import { validateGalleryPhotoPatch } from '../../../../../../domain/validateGalleryPhotoPatch';
import {
	getContentRepositoryForRequest,
	getPhotoStorage,
} from '../../../../../../infra/container';
import { json, readJsonBody, toPhotoResponseShape } from '../../_shared';

export const PATCH: APIRoute = async (context) => {
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	const galleryId = context.params.id;
	const photoId = context.params.photoId;
	if (!galleryId || !photoId) return json({ error: 'Faltan ids.' }, 400);

	const body = await readJsonBody<Record<string, unknown>>(context.request);
	if (!body) return json({ error: 'JSON inválido.' }, 400);

	const validation = validateGalleryPhotoPatch(body);
	if (!validation.ok) return json({ error: validation.error }, 422);

	const repo = getContentRepositoryForRequest(context);
	const updated = await repo.updatePhoto(galleryId, photoId, {
		...(body.alt !== undefined && { alt: body.alt as string | null }),
		...(body.position !== undefined && { position: body.position as number }),
	});

	if (!updated) return json({ error: 'No encontrado o no autorizado.' }, 404);
	return json({ photo: toPhotoResponseShape(updated) }, 200);
};

export const DELETE: APIRoute = async (context) => {
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	const galleryId = context.params.id;
	const photoId = context.params.photoId;
	if (!galleryId || !photoId) return json({ error: 'Faltan ids.' }, 400);

	const repo = getContentRepositoryForRequest(context);
	const deleted = await repo.deletePhoto(galleryId, photoId);
	if (!deleted) return json({ error: 'No encontrado o no autorizado.' }, 404);

	try {
		await getPhotoStorage().destroy(deleted.cloudinaryPublicId);
	} catch (error) {
		// Best-effort (docs/API_CONTRACTS.md §4): la fila ya se borró en
		// Supabase, un fallo acá solo se registra.
		console.error(
			`No se pudo borrar el asset de Cloudinary ${deleted.cloudinaryPublicId}:`,
			error,
		);
	}

	return new Response(null, { status: 204 });
};
