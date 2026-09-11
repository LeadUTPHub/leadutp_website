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
}
