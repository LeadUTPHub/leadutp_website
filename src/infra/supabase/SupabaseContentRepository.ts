import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	ContentRepository,
	EventPointer,
	EventPointerUpdate,
	Gallery,
	GalleryPhoto,
	GalleryPhotoUpdate,
	GalleryUpdate,
	GalleryWithPhotoCount,
	NewEventPointer,
	NewGallery,
	NewGalleryPhoto,
	ResolvedContent,
} from '../../domain/ports/ContentRepository';
import type { AreaSlug, ContentSource } from '../../domain/types';

const POINTERS_TABLE = 'luma_event_pointers';
const GALLERIES_TABLE = 'event_galleries';
const GALLERY_PHOTOS_TABLE = 'gallery_photos';

/** `slug` de `event_galleries` es `unique` — Postgres lo rechaza con el
 * código estándar de unique_violation (23505). El endpoint (T4.4) lo
 * traduce a 409, según docs/API_CONTRACTS.md §3. */
export class GallerySlugConflictError extends Error {
	constructor(slug: string) {
		super(`El slug "${slug}" ya existe.`);
		this.name = 'GallerySlugConflictError';
	}
}

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

interface GalleryRow {
	id: string;
	title: string;
	slug: string;
	body: string | null;
	happened_on: string | null;
	pillar_slug: string | null;
	area_slug: string;
	owner_id: string;
	published: boolean;
	source: string;
}

function mapRowToGallery(row: GalleryRow): Gallery {
	return {
		id: row.id,
		title: row.title,
		slug: row.slug,
		body: row.body,
		happenedOn: row.happened_on,
		pillarSlug: row.pillar_slug,
		areaSlug: row.area_slug as AreaSlug,
		ownerId: row.owner_id,
		published: row.published,
		source: row.source as ContentSource,
	};
}

interface GalleryPhotoRow {
	id: string;
	gallery_id: string;
	cloudinary_public_id: string;
	secure_url: string;
	width: number | null;
	height: number | null;
	alt: string | null;
	position: number;
	source: string;
}

function mapRowToGalleryPhoto(row: GalleryPhotoRow): GalleryPhoto {
	return {
		id: row.id,
		galleryId: row.gallery_id,
		cloudinaryPublicId: row.cloudinary_public_id,
		secureUrl: row.secure_url,
		width: row.width,
		height: row.height,
		alt: row.alt,
		position: row.position,
		source: row.source as ContentSource,
	};
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

	/** getSession() lee el estado local del cliente (sin red) — ver el
	 * porqué en createPointer/MEMORY.md L22. Reusado por createGallery. */
	private async getSessionUserId(): Promise<string> {
		const { data, error } = await this.client.auth.getSession();
		if (error || !data.session?.user) {
			throw new Error('No hay sesión válida.');
		}
		return data.session.user.id;
	}

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

	async canEditGallery(galleryId: string): Promise<boolean> {
		const { data, error } = await this.client.rpc('can_edit_gallery', {
			g_id: galleryId,
		});
		if (error) {
			throw new Error(`No se pudo evaluar can_edit_gallery: ${error.message}`);
		}
		return Boolean(data);
	}

	async getGallery(id: string): Promise<Gallery | null> {
		const { data, error } = await this.client
			.from(GALLERIES_TABLE)
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			throw new Error(`No se pudo leer la galería: ${error.message}`);
		}
		if (!data) return null;
		return mapRowToGallery(data as GalleryRow);
	}

	async listGalleries(): Promise<GalleryWithPhotoCount[]> {
		const { data, error } = await this.client
			.from(GALLERIES_TABLE)
			.select('*, gallery_photos(count)')
			.order('happened_on', { ascending: false, nullsFirst: false });

		if (error) {
			throw new Error(`No se pudieron listar las galerías: ${error.message}`);
		}
		return (data ?? []).map((row) => {
			const photoCountRow = row as GalleryRow & {
				gallery_photos: { count: number }[];
			};
			return {
				...mapRowToGallery(photoCountRow),
				photoCount: photoCountRow.gallery_photos?.[0]?.count ?? 0,
			};
		});
	}

	async createGallery(input: NewGallery, areaSlug: AreaSlug): Promise<Gallery> {
		const ownerId = await this.getSessionUserId();

		const { data, error } = await this.client
			.from(GALLERIES_TABLE)
			.insert({
				title: input.title,
				slug: input.slug,
				body: input.body ?? null,
				happened_on: input.happenedOn ?? null,
				pillar_slug: input.pillarSlug ?? null,
				area_slug: areaSlug,
				owner_id: ownerId,
				published: input.published ?? false,
			})
			.select('*')
			.single();

		if (error) {
			if (error.code === '23505') throw new GallerySlugConflictError(input.slug);
			throw new Error(`No se pudo crear la galería: ${error.message}`);
		}
		return mapRowToGallery(data as GalleryRow);
	}

	async updateGallery(id: string, patch: GalleryUpdate): Promise<Gallery | null> {
		const row: Record<string, unknown> = {};
		if (patch.title !== undefined) row.title = patch.title;
		if (patch.slug !== undefined) row.slug = patch.slug;
		if (patch.body !== undefined) row.body = patch.body;
		if (patch.happenedOn !== undefined) row.happened_on = patch.happenedOn;
		if (patch.pillarSlug !== undefined) row.pillar_slug = patch.pillarSlug;
		if (patch.published !== undefined) row.published = patch.published;

		const { data, error } = await this.client
			.from(GALLERIES_TABLE)
			.update(row)
			.eq('id', id)
			.select('*');

		if (error) {
			if (error.code === '23505') {
				throw new GallerySlugConflictError(String(patch.slug));
			}
			throw new Error(`No se pudo actualizar la galería: ${error.message}`);
		}
		if (!data || data.length === 0) return null;
		return mapRowToGallery(data[0] as GalleryRow);
	}

	async deleteGallery(id: string): Promise<boolean> {
		const { data, error } = await this.client
			.from(GALLERIES_TABLE)
			.delete()
			.eq('id', id)
			.select('id');

		if (error) {
			throw new Error(`No se pudo borrar la galería: ${error.message}`);
		}
		return Boolean(data && data.length > 0);
	}

	async listPhotos(galleryId: string): Promise<GalleryPhoto[]> {
		const { data, error } = await this.client
			.from(GALLERY_PHOTOS_TABLE)
			.select('*')
			.eq('gallery_id', galleryId)
			.order('position', { ascending: true });

		if (error) {
			throw new Error(`No se pudieron listar las fotos: ${error.message}`);
		}
		return (data ?? []).map((row) => mapRowToGalleryPhoto(row as GalleryPhotoRow));
	}

	async createPhoto(galleryId: string, input: NewGalleryPhoto): Promise<GalleryPhoto> {
		const { data: lastPhoto, error: lastPhotoError } = await this.client
			.from(GALLERY_PHOTOS_TABLE)
			.select('position')
			.eq('gallery_id', galleryId)
			.order('position', { ascending: false })
			.limit(1)
			.maybeSingle();
		if (lastPhotoError) {
			throw new Error(`No se pudo calcular la posición: ${lastPhotoError.message}`);
		}
		const position = lastPhoto ? lastPhoto.position + 1 : 0;

		const { data, error } = await this.client
			.from(GALLERY_PHOTOS_TABLE)
			.insert({
				gallery_id: galleryId,
				cloudinary_public_id: input.cloudinaryPublicId,
				secure_url: input.secureUrl,
				width: input.width ?? null,
				height: input.height ?? null,
				alt: input.alt ?? null,
				position,
			})
			.select('*')
			.single();

		if (error) {
			throw new Error(`No se pudo registrar la foto: ${error.message}`);
		}
		return mapRowToGalleryPhoto(data as GalleryPhotoRow);
	}

	async updatePhoto(
		galleryId: string,
		photoId: string,
		patch: GalleryPhotoUpdate,
	): Promise<GalleryPhoto | null> {
		const row: Record<string, unknown> = {};
		if (patch.alt !== undefined) row.alt = patch.alt;
		if (patch.position !== undefined) row.position = patch.position;

		const { data, error } = await this.client
			.from(GALLERY_PHOTOS_TABLE)
			.update(row)
			.eq('id', photoId)
			.eq('gallery_id', galleryId)
			.select('*');

		if (error) {
			throw new Error(`No se pudo actualizar la foto: ${error.message}`);
		}
		if (!data || data.length === 0) return null;
		return mapRowToGalleryPhoto(data[0] as GalleryPhotoRow);
	}

	async deletePhoto(galleryId: string, photoId: string): Promise<GalleryPhoto | null> {
		const { data, error } = await this.client
			.from(GALLERY_PHOTOS_TABLE)
			.delete()
			.eq('id', photoId)
			.eq('gallery_id', galleryId)
			.select('*');

		if (error) {
			throw new Error(`No se pudo borrar la foto: ${error.message}`);
		}
		if (!data || data.length === 0) return null;
		return mapRowToGalleryPhoto(data[0] as GalleryPhotoRow);
	}
}
