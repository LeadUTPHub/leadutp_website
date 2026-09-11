import type {
	ContentRepository,
	ResolvedContent,
} from '../../domain/ports/ContentRepository';

/**
 * Implementación no-op del puerto ContentRepository. Sprint 0 no conecta
 * Supabase todavía — este adaptador prueba que la capa infra puede
 * cablearse sin ningún SDK real. Se reemplaza por SupabaseContentRepository
 * + FallbackContentRepository en Sprint 3+ (ver ARCHITECTURE.md §2).
 */
export class NoopContentRepository implements ContentRepository {
	async resolve<T>(key: string): Promise<ResolvedContent<T> | null> {
		void key;
		return null;
	}
}
