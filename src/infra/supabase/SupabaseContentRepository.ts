import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	ContentRepository,
	EventPointer,
	EventPointerUpdate,
	NewEventPointer,
	ResolvedContent,
} from '../../domain/ports/ContentRepository';
import type { AreaSlug, ContentSource } from '../../domain/types';

const POINTERS_TABLE = 'luma_event_pointers';

interface EventPointerRow {
	id: string;
	title: string;
	luma_url: string;
	event_date: string | null;
	location: string | null;
	image_url: string | null;
	short_description: string | null;
	pillar_slug: string | null;
	area_slug: string;
	owner_id: string;
	featured: boolean;
	published: boolean;
	source: string;
}

function mapRowToPointer(row: EventPointerRow): EventPointer {
	return {
		id: row.id,
		title: row.title,
		lumaUrl: row.luma_url,
		eventDate: row.event_date,
		location: row.location,
		imageUrl: row.image_url,
		shortDescription: row.short_description,
		pillarSlug: row.pillar_slug,
		areaSlug: row.area_slug as AreaSlug,
		ownerId: row.owner_id,
		featured: row.featured,
		published: row.published,
		source: row.source as ContentSource,
	};
}

/**
 * Adaptador real del puerto ContentRepository (Sprint 3: solo punteros a
 * Luma; `resolve<T>` genérico queda para Sprint 5, page_blocks). No
 * re-filtra por rol/área: el `client` recibido ya trae (o no) la sesión
 * del actor, y Postgres aplica la RLS de database/schema.sql §9.2.
 *
 * `client` se inyecta ya construido (anon o autenticado) — quien arme la
 * sesión real (cookies de Astro vs. signInWithPassword en un test) es
 * responsabilidad de quien instancia este adaptador, no de esta clase.
 */
export class SupabaseContentRepository implements ContentRepository {
	constructor(private readonly client: SupabaseClient) {}

	async resolve<T>(key: string): Promise<ResolvedContent<T> | null> {
		void key;
		// Sprint 5 implementa la lectura de page_blocks acá. Hasta entonces,
		// degrada a null — el CompositeContentRepository sigue a
		// fallback/static/vacío sin romper el build.
		return null;
	}

	async listPointers(): Promise<EventPointer[]> {
		const { data, error } = await this.client
			.from(POINTERS_TABLE)
			.select('*')
			.order('event_date', { ascending: true, nullsFirst: false });

		if (error) {
			throw new Error(`No se pudieron listar los punteros: ${error.message}`);
		}
		return (data ?? []).map((row) => mapRowToPointer(row as EventPointerRow));
	}

	async createPointer(
		input: NewEventPointer,
		areaSlug: AreaSlug,
	): Promise<EventPointer> {
		// getSession() lee el estado local del cliente en vez de validar por
		// red (getUser()): más liviano, y evita el estado compartido de
		// storage entre clientes de test concurrentes que hizo fallar esto
		// bajo `pnpm vitest run` con la suite completa (T3.2, ver MEMORY.md).
		const { data: sessionData, error: sessionError } =
			await this.client.auth.getSession();
		if (sessionError || !sessionData.session?.user) {
			throw new Error('No hay sesión válida para crear un puntero.');
		}
		const ownerId = sessionData.session.user.id;

		const { data, error } = await this.client
			.from(POINTERS_TABLE)
			.insert({
				title: input.title,
				luma_url: input.lumaUrl,
				event_date: input.eventDate ?? null,
				location: input.location ?? null,
				image_url: input.imageUrl ?? null,
				short_description: input.shortDescription ?? null,
				pillar_slug: input.pillarSlug ?? null,
				area_slug: areaSlug,
				owner_id: ownerId,
				featured: input.featured ?? false,
				published: input.published ?? false,
			})
			.select('*')
			.single();

		if (error) {
			throw new Error(`No se pudo crear el puntero: ${error.message}`);
		}
		return mapRowToPointer(data as EventPointerRow);
	}

	async updatePointer(
		id: string,
		patch: EventPointerUpdate,
	): Promise<EventPointer | null> {
		const row: Record<string, unknown> = {};
		if (patch.title !== undefined) row.title = patch.title;
		if (patch.lumaUrl !== undefined) row.luma_url = patch.lumaUrl;
		if (patch.eventDate !== undefined) row.event_date = patch.eventDate;
		if (patch.location !== undefined) row.location = patch.location;
		if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
		if (patch.shortDescription !== undefined)
			row.short_description = patch.shortDescription;
		if (patch.pillarSlug !== undefined) row.pillar_slug = patch.pillarSlug;
		if (patch.featured !== undefined) row.featured = patch.featured;
		if (patch.published !== undefined) row.published = patch.published;

		const { data, error } = await this.client
			.from(POINTERS_TABLE)
			.update(row)
			.eq('id', id)
			.select('*');

		if (error) {
			throw new Error(`No se pudo actualizar el puntero: ${error.message}`);
		}
		// La RLS no tira error en un update sin filas afectadas: simplemente
		// no devuelve nada. Eso es "no autorizado o no existe" para quien
		// llama — ambos casos son indistinguibles y no deben serlo (evita
		// filtrar si el id existe en otra área).
		if (!data || data.length === 0) return null;
		return mapRowToPointer(data[0] as EventPointerRow);
	}

	async deletePointer(id: string): Promise<boolean> {
		const { data, error } = await this.client
			.from(POINTERS_TABLE)
			.delete()
			.eq('id', id)
			.select('id');

		if (error) {
			throw new Error(`No se pudo borrar el puntero: ${error.message}`);
		}
		return Boolean(data && data.length > 0);
	}
}
