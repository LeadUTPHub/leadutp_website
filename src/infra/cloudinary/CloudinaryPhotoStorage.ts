import { buildCloudinaryUrl } from '../../domain/buildCloudinaryUrl';
import type { PhotoStorage, SignedUpload } from '../../domain/ports/PhotoStorage';
import { buildSignature } from './buildSignature';

export interface CloudinaryEnv {
	cloudName: string;
	apiKey: string;
	apiSecret: string;
}

// Límites de seguridad de la subida (DISENO_TECNICO.md §2.2). El servidor
// los fija — el cliente no los puede cambiar sin invalidar la firma.
// 10 MB alcanza de sobra para fotos de evento tomadas con celular
// (Cloudinary igual recomprime en la entrega vía f_auto/q_auto).
const ALLOWED_FORMATS = 'jpg,png,webp';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Adaptador real del puerto PhotoStorage (DISENO_TECNICO.md §2.1, opción
 * B). Sin SDK `cloudinary` — solo `buildSignature` (node:crypto) y, en el
 * navegador, un `fetch` directo a Cloudinary (eso lo hace el cliente, no
 * esta clase).
 *
 * OJO con los nombres al firmar: `allowed_formats` (snake_case) es el
 * nombre de parámetro **real de Cloudinary** — es lo que Cloudinary va a
 * recibir como campo del form-data y lo que usa para recalcular la firma
 * en su servidor. La respuesta de este método (y la de nuestra propia
 * API) lo expone como `allowedFormats` (camelCase, nuestra convención —
 * igual que `apiKey`/`cloudName`), pero firmar con esa clave camelCase
 * produciría una firma que Cloudinary rechazaría en cuanto el cliente
 * subiera el archivo (test dedicado a este caso: "guarda contra el bug
 * de nombres").
 *
 * `max_file_size` NUNCA se firma ni se manda a Cloudinary (bug real
 * encontrado subiendo 2 fotos reales — ver MEMORY.md): es un parámetro
 * de *upload preset* (unsigned), no de un upload firmado ad-hoc.
 * Cloudinary no lo incluye en su propio cálculo de firma — firmarlo
 * invalida la firma para TODA subida, y mandarlo sin firmar no lo
 * hace cumplir tampoco (Cloudinary lo ignora en silencio, confirmado
 * subiendo un archivo de 10MB con max_file_size=1MB: 200 OK). El límite
 * de tamaño se sigue exponiendo en `maxFileSize` — pero es el CLIENTE
 * quien lo hace cumplir antes de subir (ver galerias/[id].astro), no
 * Cloudinary.
 */
export class CloudinaryPhotoStorage implements PhotoStorage {
	constructor(private readonly env: CloudinaryEnv) {}

	async sign(folder: string): Promise<SignedUpload> {
		const timestamp = Math.floor(Date.now() / 1000);
		const signature = buildSignature(
			{ folder, timestamp, allowed_formats: ALLOWED_FORMATS },
			this.env.apiSecret,
		);

		return {
			timestamp,
			signature,
			apiKey: this.env.apiKey,
			cloudName: this.env.cloudName,
			folder,
			allowedFormats: ALLOWED_FORMATS,
			maxFileSize: MAX_FILE_SIZE_BYTES,
		};
	}

	deliveryUrl(publicId: string, width: number): string {
		return buildCloudinaryUrl({ cloudName: this.env.cloudName, publicId, width });
	}

	async destroy(publicId: string): Promise<void> {
		const timestamp = Math.floor(Date.now() / 1000);
		const signature = buildSignature({ public_id: publicId, timestamp }, this.env.apiSecret);

		const form = new FormData();
		form.set('public_id', publicId);
		form.set('api_key', this.env.apiKey);
		form.set('timestamp', String(timestamp));
		form.set('signature', signature);

		const response = await fetch(
			`https://api.cloudinary.com/v1_1/${this.env.cloudName}/image/destroy`,
			{ method: 'POST', body: form },
		);
		const body = (await response.json()) as { result?: string };

		if (body.result !== 'ok') {
			throw new Error(
				`Cloudinary no pudo borrar ${publicId}: ${body.result ?? 'respuesta inesperada'}.`,
			);
		}
	}
}
