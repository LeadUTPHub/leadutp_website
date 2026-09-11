// GET/POST /administrator/api/event-pointers (docs/API_CONTRACTS.md §2).
// El middleware ya exige sesión para todo /administrator/** salvo
// /administrator/login (ver src/middleware.ts) — acá solo queda validar
// forma y delegar la autorización real a la RLS (ARCHITECTURE.md §4).
export const prerender = false;

import type { APIRoute } from 'astro';
import { isAreaSlug, type AreaSlug } from '../../../../domain/types';
import { validateEventPointerInput } from '../../../../domain/validateEventPointerInput';
import { getContentRepositoryForRequest } from '../../../../infra/container';
import { json, readJsonBody, toResponseShape } from './_shared';

export const GET: APIRoute = async (context) => {
	const repo = getContentRepositoryForRequest(context);
	const pointers = await repo.listPointers();
	return json({ pointers: pointers.map(toResponseShape) }, 200);
};

export const POST: APIRoute = async (context) => {
	// Chequeo defensivo: el middleware ya garantiza sesión acá (mismo
	// patrón que src/pages/administrator/index.astro).
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	const body = await readJsonBody(context.request);
	if (!body) return json({ error: 'JSON inválido.' }, 400);

	const validation = validateEventPointerInput(body);
	if (!validation.ok) return json({ error: validation.error }, 422);

	// areaSlug NO se acepta del cliente salvo para super_admin, que no
	// tiene área propia y debe indicar en cuál crea (docs/API_CONTRACTS.md).
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
		const pointer = await repo.createPointer(
			{
				title: body.title as string,
				lumaUrl: body.lumaUrl as string,
				eventDate: (body.eventDate as string | undefined) ?? null,
				location: (body.location as string | undefined) ?? null,
				imageUrl: (body.imageUrl as string | undefined) ?? null,
				shortDescription: (body.shortDescription as string | undefined) ?? null,
				pillarSlug: (body.pillarSlug as string | undefined) ?? null,
				featured: (body.featured as boolean | undefined) ?? false,
				published: (body.published as boolean | undefined) ?? false,
			},
			areaSlug,
		);
		return json({ pointer: toResponseShape(pointer) }, 201);
	} catch {
		// La RLS rechazó el insert (ej. super_admin puso un areaSlug válido
		// pero no coincide con lo que exige la policy, o cualquier otro
		// rechazo no anticipado por la validación de forma).
		return json({ error: 'No autorizado para crear este puntero.' }, 403);
	}
};
