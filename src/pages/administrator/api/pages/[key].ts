// GET/PUT /administrator/api/pages/:key (docs/API_CONTRACTS.md §5).
// El middleware ya exige sesión para todo /administrator/** salvo
// /administrator/login (ver src/middleware.ts) — acá solo queda validar
// forma y delegar la autorización real a la RLS (ARCHITECTURE.md §4).
//
// A diferencia de eventos y galerías, estos bloques son contenido
// INSTITUCIONAL: `areaSlug` va siempre en null y, por la semántica NULL de
// las políticas de schema.sql §9.2, solo un super_admin puede escribirlos
// (MEMORY.md D-13). El endpoint no chequea el rol — igual que en el resto
// del panel, quien decide es la RLS; un rechazo se traduce a 403.
export const prerender = false;

import type { APIRoute } from 'astro';
import type { PageBlock } from '../../../../domain/ports/ContentRepository';
import {
	isPageBlockKey,
	validatePageBlockData,
} from '../../../../domain/validatePageBlockData';
import { getContentRepositoryForRequest } from '../../../../infra/container';

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

/** Forma de docs/API_CONTRACTS.md §5: sin `source` ni `ownerId`. */
function toResponseShape(block: PageBlock) {
	return {
		key: block.key,
		data: block.data,
		areaSlug: block.areaSlug,
		published: block.published,
		updatedAt: block.updatedAt,
	};
}

export const GET: APIRoute = async (context) => {
	const key = context.params.key;
	// Una key fuera de la lista cerrada no es "no autorizado": simplemente
	// no existe como recurso. 404 antes de tocar la DB.
	if (!isPageBlockKey(key))
		return json({ error: 'Bloque no encontrado.' }, 404);

	const repo = getContentRepositoryForRequest(context);
	const block = await repo.getPageBlock(key);
	if (!block) return json({ error: 'Bloque no encontrado.' }, 404);

	return json({ block: toResponseShape(block) }, 200);
};

export const PUT: APIRoute = async (context) => {
	// Chequeo defensivo: el middleware ya garantiza sesión acá (mismo
	// patrón que el resto de /administrator/api/**).
	const profile = context.locals.profile;
	if (!profile) return json({ error: 'No autenticado.' }, 401);

	const key = context.params.key;
	if (!isPageBlockKey(key))
		return json({ error: 'Bloque no encontrado.' }, 404);

	let body: { data?: unknown; published?: unknown } | null;
	try {
		body = await context.request.json();
	} catch {
		return json({ error: 'JSON inválido.' }, 400);
	}
	if (!body || typeof body !== 'object') {
		return json({ error: 'JSON inválido.' }, 400);
	}

	if (body.data === undefined)
		return json({ error: 'data es requerido.' }, 422);

	if (body.published !== undefined && typeof body.published !== 'boolean') {
		return json({ error: 'published debe ser booleano.' }, 422);
	}

	const validation = validatePageBlockData(key, body.data);
	if (!validation.ok) return json({ error: validation.error }, 422);

	// `areaSlug`/`ownerId` no se leen del body aunque vengan: los fija el
	// repositorio (area null + owner = usuario de la sesión).
	const repo = getContentRepositoryForRequest(context);
	const block = await repo.savePageBlock(key, {
		data: body.data,
		published: body.published as boolean | undefined,
	});

	if (!block) {
		return json({ error: 'No autorizado para editar este bloque.' }, 403);
	}
	return json({ block: toResponseShape(block) }, 200);
};
