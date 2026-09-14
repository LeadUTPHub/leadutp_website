// POST /administrator/api/galleries/:id/photos (docs/API_CONTRACTS.md §4).
// Registra en Supabase una foto ya subida a Cloudinary (la subida en sí
// la hizo el navegador directo a Cloudinary, con la firma de T4.2).
export const prerender = false;

import type { APIRoute } from 'astro';
import { validateGalleryPhotoInput } from '../../../../../../domain/validateGalleryPhotoInput';
import { getContentRepositoryForRequest } from '../../../../../../infra/container';
import { json, readJsonBody, toPhotoResponseShape } from '../../_shared';

interface PostgrestError {
	code?: string;
}

export const POST: APIRoute = async (context) => {
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	const galleryId = context.params.id;
	if (!galleryId) return json({ error: 'Falta el id de la galería.' }, 400);

	const body = await readJsonBody<Record<string, unknown>>(context.request);
	if (!body) return json({ error: 'JSON inválido.' }, 400);

	const validation = validateGalleryPhotoInput(body);
	if (!validation.ok) return json({ error: validation.error }, 422);

	const repo = getContentRepositoryForRequest(context);
	try {
		const photo = await repo.createPhoto(galleryId, {
			cloudinaryPublicId: body.cloudinaryPublicId as string,
			secureUrl: body.secureUrl as string,
			width: (body.width as number | undefined) ?? null,
			height: (body.height as number | undefined) ?? null,
			alt: (body.alt as string | undefined) ?? null,
		});
		return json({ photo: toPhotoResponseShape(photo) }, 201);
	} catch (error) {
		// 23503 = foreign_key_violation: gallery_id no existe.
		if ((error as PostgrestError)?.code === '23503') {
			return json({ error: 'Galería no encontrada.' }, 404);
		}
		return json({ error: 'No autorizado para subir fotos a esta galería.' }, 403);
	}
};
