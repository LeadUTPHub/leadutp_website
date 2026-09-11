import { createHash } from 'node:crypto';

/**
 * Firma de subida directa a Cloudinary (DISENO_TECNICO.md §2.1, opción B):
 * SHA-1 de los parámetros ordenados alfabéticamente y unidos por "&", con
 * el secret pegado al final — sin SDK, algoritmo documentado por Cloudinary
 * (https://cloudinary.com/documentation/authentication_signatures). Mismo
 * patrón ya verificado en producción por scripts/verify-cloudinary-upload.mjs
 * (T0.4). No es dominio puro (usa `node:crypto`, no listado en
 * ARCHITECTURE.md §2 como regla de dominio) — vive en infra, junto al
 * adaptador que la usa (T4.3), mismo criterio que
 * src/infra/supabase/cookieHeader.ts en Sprint 2.
 */
export function buildSignature(
	params: Record<string, string | number>,
	secret: string,
): string {
	const toSign = Object.keys(params)
		.sort()
		.map((key) => `${key}=${params[key]}`)
		.join('&');

	return createHash('sha1')
		.update(toSign + secret)
		.digest('hex');
}
