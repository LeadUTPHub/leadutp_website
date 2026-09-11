import type {
	PhotoStorage,
	SignedUpload,
} from '../../domain/ports/PhotoStorage';

/**
 * Implementación no-op del puerto PhotoStorage. Se reemplaza por
 * CloudinaryPhotoStorage en Sprint 4 (ver ARCHITECTURE.md §2).
 */
export class NoopPhotoStorage implements PhotoStorage {
	async sign(folder: string): Promise<SignedUpload> {
		void folder;
		throw new Error('PhotoStorage no configurado todavía (Sprint 4).');
	}

	deliveryUrl(publicId: string, width: number): string {
		return `about:blank#noop-${publicId}-${width}`;
	}
}
