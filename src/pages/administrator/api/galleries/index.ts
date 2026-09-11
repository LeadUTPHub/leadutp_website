// GET/POST /administrator/api/galleries (docs/API_CONTRACTS.md §3).
export const prerender = false;

import type { APIRoute } from 'astro';
import { isAreaSlug, type AreaSlug } from '../../../../domain/types';
import { validateGalleryInput } from '../../../../domain/validateGalleryInput';
import { getContentRepositoryForRequest } from '../../../../infra/container';
import { GallerySlugConflictError } from '../../../../infra/supabase/SupabaseContentRepository';
import { json, readJsonBody, toGalleryResponseShape } from './_shared';

export const GET: APIRoute = async (context) => {
	const repo = getContentRepositoryForRequest(context);
	const galleries = await repo.listGalleries();
	return json({ galleries: galleries.map(toGalleryResponseShape) }, 200);
};

export const POST: APIRoute = async (context) => {
	// Chequeo defensivo: el middleware ya garantiza sesión acá.
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	const body = await readJsonBody<Record<string, unknown>>(context.request);
	if (!body) return json({ error: 'JSON inválido.' }, 400);

	const validation = validateGalleryInput(body);
	if (!validation.ok) return json({ error: validation.error }, 422);

	// areaSlug NO se acepta del cliente salvo para super_admin (mismo
	// criterio que event-pointers, ver T3.3).
	let areaSlug: AreaSlug;
	if (profile.role === 'super_admin') {
		if (!isAreaSlug(body.areaSlug)) {
			return json(
				{ error: 'areaSlug es requerido y debe ser un pilar válido.' },
				422,
			);
		}
		areaSlug = body.areaSlug;
	} else {
		if (!profile.areaSlug) {
			return json({ error: 'Tu perfil no tiene área asignada.' }, 403);
		}
		areaSlug = profile.areaSlug;
	}

	const repo = getContentRepositoryForRequest(context);
	try {
		const gallery = await repo.createGallery(
			{
				title: body.title as string,
				slug: body.slug as string,
				body: (body.body as string | undefined) ?? null,
				happenedOn: (body.happenedOn as string | undefined) ?? null,
				pillarSlug: (body.pillarSlug as string | undefined) ?? null,
				published: (body.published as boolean | undefined) ?? false,
			},
			areaSlug,
		);
		return json({ gallery: toGalleryResponseShape(gallery) }, 201);
	} catch (error) {
		if (error instanceof GallerySlugConflictError) {
			return json({ error: error.message }, 409);
		}
		return json({ error: 'No autorizado para crear esta galería.' }, 403);
	}
};
