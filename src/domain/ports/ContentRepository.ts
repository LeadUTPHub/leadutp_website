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
}
