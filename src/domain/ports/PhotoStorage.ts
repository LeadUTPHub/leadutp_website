/**
 * Puerto para el almacén de fotos (Cloudinary en la implementación real,
 * ver src/infra/). Este archivo no importa nada externo.
 */
export interface SignedUpload {
	timestamp: number;
	signature: string;
	apiKey: string;
	cloudName: string;
	folder: string;
	/** `"jpg,png,webp"` — el cliente debe mandarlo tal cual como `allowed_formats`
	 * en el upload a Cloudinary (snake_case, así se firmó) o la firma no valida. */
	allowedFormats: string;
	/** Bytes. El cliente debe mandarlo tal cual como `max_file_size` en el
	 * upload a Cloudinary (snake_case, así se firmó) o la firma no valida. */
	maxFileSize: number;
}

export interface StoredPhoto {
	publicId: string;
	secureUrl: string;
	width: number;
	height: number;
}

export interface PhotoStorage {
	/** Firma los parámetros de una subida directa desde el navegador. */
	sign(folder: string): Promise<SignedUpload>;
	/** Construye la URL de entrega (con transformaciones) para un publicId. */
	deliveryUrl(publicId: string, width: number): string;
	/**
	 * Borra un asset de Cloudinary (docs/API_CONTRACTS.md: borrado de
	 * galería/foto es best-effort — el llamador decide si un error acá
	 * bloquea el borrado en Supabase o solo se registra y se sigue).
	 */
	destroy(publicId: string): Promise<void>;
}
