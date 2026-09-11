import type { AuthGateway } from '../domain/ports/AuthGateway';
import type { ContentRepository } from '../domain/ports/ContentRepository';
import type { PhotoStorage } from '../domain/ports/PhotoStorage';
import { NoopAuthGateway } from './noop/NoopAuthGateway';
import { NoopContentRepository } from './noop/NoopContentRepository';
import { NoopPhotoStorage } from './noop/NoopPhotoStorage';

/**
 * Composition root (ARCHITECTURE.md §2). La UI (páginas públicas y del
 * panel) pide sus dependencias acá — nunca importa un adaptador concreto
 * directamente.
 *
 * Sprint 0: solo hay adaptadores no-op, para probar que el cableado
 * funciona sin ningún SDK real todavía. A partir de Sprint 2 (Auth),
 * Sprint 3 (contenido) y Sprint 4 (fotos), cada get* empieza a devolver
 * el adaptador real correspondiente.
 */
export function getContentRepository(): ContentRepository {
	return new NoopContentRepository();
}

export function getPhotoStorage(): PhotoStorage {
	return new NoopPhotoStorage();
}

export function getAuthGateway(): AuthGateway {
	return new NoopAuthGateway();
}
