import type {
	ContentRepository,
	EventPointer,
	EventPointerUpdate,
	NewEventPointer,
	ResolvedContent,
} from '../../domain/ports/ContentRepository';
import type { AreaSlug } from '../../domain/types';

/**
 * Implementación no-op del puerto ContentRepository. Sprint 0 no conecta
 * Supabase todavía — este adaptador prueba que la capa infra puede
 * cablearse sin ningún SDK real. Se reemplaza por SupabaseContentRepository
 * + FallbackContentRepository en Sprint 3+ (ver ARCHITECTURE.md §2).
 * Degradación elegante: listas vacías / rechazo, nunca un throw.
 */
export class NoopContentRepository implements ContentRepository {
	async resolve<T>(key: string): Promise<ResolvedContent<T> | null> {
		void key;
		return null;
	}

	async listPointers(): Promise<EventPointer[]> {
		return [];
	}

	async createPointer(
		input: NewEventPointer,
		areaSlug: AreaSlug,
	): Promise<EventPointer> {
		void input;
		void areaSlug;
		throw new Error('NoopContentRepository no persiste — sin backend conectado.');
	}

	async updatePointer(
		id: string,
		patch: EventPointerUpdate,
	): Promise<EventPointer | null> {
		void id;
		void patch;
		return null;
	}

	async deletePointer(id: string): Promise<boolean> {
		void id;
		return false;
	}
}
