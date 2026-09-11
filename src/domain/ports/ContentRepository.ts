import type { ContentSource } from '../types';

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

export interface ContentRepository {
	/**
	 * Resuelve un bloque de contenido por clave, con la cadena de
	 * degradación ya aplicada (ver ARCHITECTURE.md §3 y §5).
	 */
	resolve<T>(key: string): Promise<ResolvedContent<T> | null>;
}
