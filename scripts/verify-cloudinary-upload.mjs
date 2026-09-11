#!/usr/bin/env node
/**
 * Verificación manual de Cloudinary (Sprint 0, T0.4).
 *
 * NO es parte del build ni de CI. Se corre a mano, una sola vez, para
 * confirmar que CLOUD_NAME + API_KEY + API_SECRET funcionan de verdad:
 * firma, sube una imagen de 1x1 px a `lead-utp/_test/`, confirma la
 * subida y la borra. No deja rastro en la cuenta de Cloudinary.
 *
 * Uso:
 *   node --env-file=.env scripts/verify-cloudinary-upload.mjs
 *
 * Requiere en .env: PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
 * CLOUDINARY_API_SECRET.
 */

import { createHash } from 'node:crypto';

const CLOUD_NAME = process.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

for (const [name, value] of Object.entries({
	PUBLIC_CLOUDINARY_CLOUD_NAME: CLOUD_NAME,
	CLOUDINARY_API_KEY: API_KEY,
	CLOUDINARY_API_SECRET: API_SECRET,
})) {
	if (!value) {
		console.error(`✗ Falta ${name} en el entorno. Corre con --env-file=.env`);
		process.exit(1);
	}
}

// Firma de Cloudinary: SHA-1 de "param1=value1&param2=value2...api_secret"
// con los parámetros ordenados alfabéticamente (sin incluir file/api_key).
// https://cloudinary.com/documentation/authentication_signatures
function signParams(params, secret) {
	const toSign = Object.keys(params)
		.sort()
		.map((key) => `${key}=${params[key]}`)
		.join('&');

	return createHash('sha1')
		.update(toSign + secret)
		.digest('hex');
}

// PNG 1x1 transparente, embebido — no depende de ningún archivo del repo.
const ONE_PX_PNG_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function main() {
	const timestamp = Math.floor(Date.now() / 1000);
	const folder = 'lead-utp/_test';
	const signature = signParams({ folder, timestamp }, API_SECRET);

	const form = new FormData();
	form.set('file', `data:image/png;base64,${ONE_PX_PNG_BASE64}`);
	form.set('api_key', API_KEY);
	form.set('timestamp', String(timestamp));
	form.set('folder', folder);
	form.set('signature', signature);

	console.log(`→ Subiendo imagen de prueba a ${CLOUD_NAME}/${folder}/ ...`);

	const uploadRes = await fetch(
		`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
		{ method: 'POST', body: form },
	);
	const uploadBody = await uploadRes.json();

	if (!uploadRes.ok) {
		console.error('✗ Falló la subida:', uploadBody);
		process.exit(1);
	}

	console.log(`✓ Subida OK: ${uploadBody.public_id} (${uploadBody.secure_url})`);

	// Limpieza: borrar el asset de prueba.
	const destroyTimestamp = Math.floor(Date.now() / 1000);
	const destroySignature = signParams(
		{ public_id: uploadBody.public_id, timestamp: destroyTimestamp },
		API_SECRET,
	);
	const destroyForm = new FormData();
	destroyForm.set('public_id', uploadBody.public_id);
	destroyForm.set('api_key', API_KEY);
	destroyForm.set('timestamp', String(destroyTimestamp));
	destroyForm.set('signature', destroySignature);

	console.log('→ Borrando imagen de prueba...');
	const destroyRes = await fetch(
		`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
		{ method: 'POST', body: destroyForm },
	);
	const destroyBody = await destroyRes.json();

	if (destroyBody.result !== 'ok') {
		console.warn(
			`⚠ La imagen se subió pero no se pudo confirmar el borrado: ${JSON.stringify(destroyBody)}. Bórrala a mano en el dashboard de Cloudinary: ${uploadBody.public_id}`,
		);
		process.exit(1);
	}

	console.log('✓ Borrado OK. Cloudinary configurado correctamente.');
}

main().catch((error) => {
	console.error('✗ Error inesperado:', error);
	process.exit(1);
});
