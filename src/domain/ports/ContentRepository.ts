import type { AreaSlug, ContentSource } from '../types';

/**
 * Puerto para leer/escribir contenido administrable (punteros a Luma,
 * galerías, bloques de página). Las implementaciones reales viven en
 * src/infra/ (SupabaseContentRepository, FallbackContentRepository, ...).
 * Este archivo no importa nada externo — solo tipos de dominio.
 */
export interface ResolvedContent<T> {
	data: T;
	source: ContentSource;
}

/**
 * Tarjeta de evento curada a mano (Sprint 3 — ver DOMAIN.md "Puntero a
 * Luma"). `lumaUrl` es la única URL de registro/inscripción real; el
 * resto de campos de la tarjeta (fecha, ubicación, imagen, descripción)
 * los carga el staff, no vienen de la API de Luma.
 */
export interface EventPointer {
	id: string;
	title: string;
	lumaUrl: string;
	eventDate: string | null;
	location: string | null;
	imageUrl: string | null;
	shortDescription: string | null;
	pillarSlug: string | null;
	areaSlug: AreaSlug;
	ownerId: string;
	featured: boolean;
	published: boolean;
	source: ContentSource;
}

/**
 * `areaSlug`/`ownerId` nunca se aceptan del cliente (ver
 * docs/API_CONTRACTS.md) — el adaptador los fija desde la sesión.
 */
export interface NewEventPointer {
	title: string;
	lumaUrl: string;
	eventDate?: string | null;
	location?: string | null;
	imageUrl?: string | null;
	shortDescription?: string | null;
	pillarSlug?: string | null;
	featured?: boolean;
	published?: boolean;
}

export type EventPointerUpdate = Partial<NewEventPointer>;

/**
 * Galería "así se vivió el evento" (Sprint 4 — DOMAIN.md "Galería").
 * `body` es markdown; `happenedOn` es una fecha (`YYYY-MM-DD`) o `null`.
 */
export interface Gallery {
	id: string;
	title: string;
	slug: string;
	body: string | null;
	happenedOn: string | null;
	pillarSlug: string | null;
	areaSlug: AreaSlug;
	ownerId: string;
	published: boolean;
	source: ContentSource;
}

/** `GET /administrator/api/galleries` (docs/API_CONTRACTS.md §3). */
export interface GalleryWithPhotoCount extends Gallery {
	photoCount: number;
}

/** `areaSlug`/`ownerId` nunca se aceptan del cliente. */
export interface NewGallery {
	title: string;
	slug: string;
	body?: string | null;
	happenedOn?: string | null;
	pillarSlug?: string | null;
	published?: boolean;
}

export type GalleryUpdate = Partial<NewGallery>;

/** Foto de una galería, alojada en Cloudinary (DOMAIN.md "Foto"). */
export interface GalleryPhoto {
	id: string;
	galleryId: string;
	cloudinaryPublicId: string;
	secureUrl: string;
	width: number | null;
	height: number | null;
	alt: string | null;
	position: number;
	source: ContentSource;
}

export interface NewGalleryPhoto {
	cloudinaryPublicId: string;
	secureUrl: string;
	width?: number | null;
	height?: number | null;
	alt?: string | null;
}

export interface GalleryPhotoUpdate {
	alt?: string | null;
	position?: number;
}

/**
 * Bloque de contenido editable de una subpágina pública (Sprint 5 —
 * DOMAIN.md "PageBlock"). `key` es la identidad (PK en Postgres), de la
 * lista cerrada de `validatePageBlockData.ts`. `data` es jsonb sin forma
 * fija acá: el validador de dominio decide qué forma le toca a cada key.
 *
 * `areaSlug` es `null` para contenido institucional (Nosotros, Proyectos),
 * que no pertenece a ningún pilar — ver MEMORY.md D-13 y el patch 003.
 * Con `null`, la RLS solo deja crear/editar a super_admin.
 */
export interface PageBlock {
	key: string;
	data: unknown;
	areaSlug: AreaSlug | null;
	ownerId: string;
	published: boolean;
	source: ContentSource;
	updatedAt: string;
}

/** `key`, `areaSlug` y `ownerId` no vienen del cliente: los fija el server. */
export interface PageBlockInput {
	data: unknown;
	published?: boolean;
}

export interface ContentRepository {
	/**
	 * Resuelve un bloque de contenido por clave, con la cadena de
	 * degradación ya aplicada (ver ARCHITECTURE.md §3 y §5).
	 */
	resolve<T>(key: string): Promise<ResolvedContent<T> | null>;

	/**
	 * Punteros a Luma visibles para quien hace la consulta: la RLS decide
	 * el alcance (anon → solo `published`; staff → todo lo que su rol
	 * puede ver). El servidor no re-filtra.
	 */
	listPointers(): Promise<EventPointer[]>;
	/** `areaSlug` se fija a `auth_area()` del actor (o el que pase el super_admin). */
	createPointer(
		input: NewEventPointer,
		areaSlug: AreaSlug,
	): Promise<EventPointer>;
	/** `null` si la RLS rechaza el update o la fila no existe. */
	updatePointer(
		id: string,
		patch: EventPointerUpdate,
	): Promise<EventPointer | null>;
	/** `false` si la RLS rechaza el delete o la fila no existía. */
	deletePointer(id: string): Promise<boolean>;

	/**
	 * `true` si el actor puede editar/borrar esta galería o subirle fotos
	 * (mismo predicado que usa la RLS de `gallery_photos`, vía el RPC SQL
	 * `can_edit_gallery` de schema.sql §8 — no se duplica la lógica en TS).
	 * `false` también si la galería no existe.
	 */
	canEditGallery(galleryId: string): Promise<boolean>;

	/** `null` si no existe o la RLS no la deja leer (anon + no publicada). */
	getGallery(id: string): Promise<Gallery | null>;

	/** Igual alcance que `listPointers()`: la RLS decide qué ve quien pregunta. */
	listGalleries(): Promise<GalleryWithPhotoCount[]>;
	/** `areaSlug` se fija a `auth_area()` del actor (o el que pase el super_admin).
	 * Tira `GallerySlugConflictError` (ver SupabaseContentRepository.ts) si el
	 * `slug` ya existe — el endpoint lo traduce a 409. */
	createGallery(input: NewGallery, areaSlug: AreaSlug): Promise<Gallery>;
	/** `null` si la RLS rechaza el update o la fila no existe. */
	updateGallery(id: string, patch: GalleryUpdate): Promise<Gallery | null>;
	/** `false` si la RLS rechaza el delete o la fila no existía. Cascade en
	 * DB borra también sus `gallery_photos` — el llamador que necesite
	 * limpiar Cloudinary debe leer `listPhotos()` **antes** de llamar esto. */
	deleteGallery(id: string): Promise<boolean>;

	/** Ordenadas por `position` ascendente. */
	listPhotos(galleryId: string): Promise<GalleryPhoto[]>;
	/**
	 * Fotos de VARIAS galerías en una sola consulta (`IN (gallery_id)`),
	 * agrupadas en memoria por `galleryId` — evita el N+1 de llamar
	 * `listPhotos()` una vez por galería (ver `/eventos`, sección "Eventos
	 * realizados"). Cada array interno queda ordenado por `position`
	 * ascendente, igual que `listPhotos()`. Una `galleryId` sin fotos
	 * simplemente no aparece como key en el resultado. `[]` de entrada no
	 * dispara ninguna consulta y devuelve `{}`.
	 */
	listPhotosForGalleries(
		galleryIds: string[],
	): Promise<Record<string, GalleryPhoto[]>>;
	/** `position` se calcula como último + 1 (o 0 si es la primera). */
	createPhoto(galleryId: string, input: NewGalleryPhoto): Promise<GalleryPhoto>;
	/** `null` si la RLS rechaza el update o la fila no existe. */
	updatePhoto(
		galleryId: string,
		photoId: string,
		patch: GalleryPhotoUpdate,
	): Promise<GalleryPhoto | null>;
	/** Devuelve la fila borrada (no solo `boolean`): el llamador la necesita
	 * para el borrado best-effort del asset en Cloudinary. `null` si la RLS
	 * rechaza el delete o la fila no existía. */
	deletePhoto(galleryId: string, photoId: string): Promise<GalleryPhoto | null>;

	/** `null` si no existe o la RLS no lo deja leer (anon + no publicado). */
	getPageBlock(key: string): Promise<PageBlock | null>;
	/**
	 * Crea el bloque si no existe, o actualiza `data`/`published` si ya
	 * existe. **No reescribe `ownerId` en un update** (contrato §5: se fija
	 * en el primer PUT y no cambia) — eso además mantiene en pie la
	 * precondición del caveat de RLS de MEMORY.md L27.
	 * `null` si la RLS rechaza la escritura.
	 */
	savePageBlock(key: string, input: PageBlockInput): Promise<PageBlock | null>;
}
