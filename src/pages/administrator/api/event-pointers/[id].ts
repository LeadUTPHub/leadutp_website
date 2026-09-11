// PATCH/DELETE /administrator/api/event-pointers/:id (docs/API_CONTRACTS.md §2).
// areaSlug/ownerId nunca se aceptan acá — solo la RLS decide si el
// actor puede tocar esta fila (ARCHITECTURE.md §4).
export const prerender = false;

import type { APIRoute } from 'astro';
import { validateEventPointerPatch } from '../../../../domain/validateEventPointerPatch';
import { getContentRepositoryForRequest } from '../../../../infra/container';
import { json, readJsonBody, toResponseShape } from './_shared';

export const PATCH: APIRoute = async (context) => {
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	const id = context.params.id;
	if (!id) return json({ error: 'Falta el id.' }, 400);

	const body = await readJsonBody(context.request);
	if (!body) return json({ error: 'JSON inválido.' }, 400);

	const validation = validateEventPointerPatch(body);
	if (!validation.ok) return json({ error: validation.error }, 422);

	const repo = getContentRepositoryForRequest(context);
	const updated = await repo.updatePointer(id, {
		...(body.title !== undefined && { title: body.title as string }),
		...(body.lumaUrl !== undefined && { lumaUrl: body.lumaUrl as string }),
		...(body.eventDate !== undefined && {
			eventDate: body.eventDate as string | null,
		}),
		...(body.location !== undefined && { location: body.location as string | null }),
		...(body.imageUrl !== undefined && { imageUrl: body.imageUrl as string | null }),
		...(body.shortDescription !== undefined && {
			shortDescription: body.shortDescription as string | null,
		}),
		...(body.pillarSlug !== undefined && {
			pillarSlug: body.pillarSlug as string | null,
		}),
		...(body.featured !== undefined && { featured: body.featured as boolean }),
		...(body.published !== undefined && { published: body.published as boolean }),
	});

	// La RLS no distingue "no existe" de "no autorizado" (updatePointer
	// devuelve null en ambos casos) — tampoco lo hacemos nosotros, para
	// no filtrar si el id existe en un área ajena.
	if (!updated) return json({ error: 'No encontrado o no autorizado.' }, 404);
	return json({ pointer: toResponseShape(updated) }, 200);
};

export const DELETE: APIRoute = async (context) => {
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	const id = context.params.id;
	if (!id) return json({ error: 'Falta el id.' }, 400);

	const repo = getContentRepositoryForRequest(context);
	const deleted = await repo.deletePointer(id);

	if (!deleted) return json({ error: 'No encontrado o no autorizado.' }, 404);
	return new Response(null, { status: 204 });
};
