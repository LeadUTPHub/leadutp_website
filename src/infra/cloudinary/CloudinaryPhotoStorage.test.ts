import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudinaryPhotoStorage } from './CloudinaryPhotoStorage';

const ENV = {
	cloudName: 'leadutp',
	apiKey: '1234567890',
	apiSecret: 'test_secret_vector',
};

describe('CloudinaryPhotoStorage', () => {
	describe('sign()', () => {
		it('devuelve timestamp/signature/apiKey/cloudName/folder/allowedFormats/maxFileSize — forma exacta de docs/API_CONTRACTS.md', async () => {
			const storage = new CloudinaryPhotoStorage(ENV);
			const signed = await storage.sign('lead-utp/liderazgo/talent-room-2026-05');

			expect(signed).toMatchObject({
				apiKey: '1234567890',
				cloudName: 'leadutp',
				folder: 'lead-utp/liderazgo/talent-room-2026-05',
				allowedFormats: 'jpg,png,webp',
				maxFileSize: 10_485_760,
			});
			expect(typeof signed.timestamp).toBe('number');
			expect(signed.signature).toMatch(/^[0-9a-f]{40}$/);
		});

		it('la firma incluye allowed_formats (nombre real de Cloudinary) pero NO max_file_size', async () => {
			// Bug real (encontrado con las 2 imágenes de prueba de un
			// director, ver MEMORY.md): Cloudinary no incluye max_file_size
			// en su propio "string to sign" para subidas firmadas (confirmado
			// contra Cloudinary real: el 401 "Invalid Signature" que devuelve
			// muestra el string exacto que SÍ firmó, y max_file_size no
			// aparece ahí) — es un parámetro de *upload preset* (unsigned),
			// no de un upload firmado ad-hoc. Firmarlo invalida la firma para
			// TODA subida, sin importar formato ni tamaño del archivo.
			const storage = new CloudinaryPhotoStorage(ENV);
			const signed = await storage.sign('a/b/c');

			const { buildSignature } = await import('./buildSignature');
			const expected = buildSignature(
				{ folder: 'a/b/c', timestamp: signed.timestamp, allowed_formats: 'jpg,png,webp' },
				ENV.apiSecret,
			);
			expect(signed.signature).toBe(expected);

			const wrongWithMaxFileSize = buildSignature(
				{
					folder: 'a/b/c',
					timestamp: signed.timestamp,
					allowed_formats: 'jpg,png,webp',
					max_file_size: 10_485_760,
				},
				ENV.apiSecret,
			);
			expect(signed.signature).not.toBe(wrongWithMaxFileSize);
		});

		it('una firma calculada con las claves camelCase (equivocadas) NO coincide — guarda contra el bug de nombres', async () => {
			const storage = new CloudinaryPhotoStorage(ENV);
			const signed = await storage.sign('a/b/c');

			const { buildSignature } = await import('./buildSignature');
			const wrongCamelCase = buildSignature(
				{ folder: 'a/b/c', timestamp: signed.timestamp, allowedFormats: 'jpg,png,webp' },
				ENV.apiSecret,
			);
			expect(signed.signature).not.toBe(wrongCamelCase);
		});

		it('dos folders distintos producen firmas distintas', async () => {
			const storage = new CloudinaryPhotoStorage(ENV);
			// mismo timestamp forzado no es posible desde afuera, pero folders
			// distintos casi seguro producen timestamps distintos también —
			// lo que importa es que nunca coincidan por accidente de folder.
			const a = await storage.sign('folder-a');
			const b = await storage.sign('folder-b');
			expect(a.folder).not.toBe(b.folder);
			expect(a.signature).not.toBe(b.signature);
		});
	});

	describe('deliveryUrl()', () => {
		it('delega en buildCloudinaryUrl con el cloudName configurado', () => {
			const storage = new CloudinaryPhotoStorage(ENV);
			expect(storage.deliveryUrl('lead-utp/x/abc123', 640)).toBe(
				'https://res.cloudinary.com/leadutp/image/upload/f_auto,q_auto,w_640/lead-utp/x/abc123',
			);
		});
	});

	describe('destroy()', () => {
		const originalFetch = globalThis.fetch;

		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});
		afterEach(() => {
			globalThis.fetch = originalFetch;
		});

		it('llama a /image/destroy con public_id, api_key, timestamp y signature firmados', async () => {
			vi.mocked(globalThis.fetch).mockResolvedValue(
				new Response(JSON.stringify({ result: 'ok' }), { status: 200 }),
			);

			const storage = new CloudinaryPhotoStorage(ENV);
			await storage.destroy('lead-utp/x/abc123');

			expect(globalThis.fetch).toHaveBeenCalledTimes(1);
			const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
			expect(url).toBe('https://api.cloudinary.com/v1_1/leadutp/image/destroy');

			const body = init?.body as FormData;
			expect(body.get('public_id')).toBe('lead-utp/x/abc123');
			expect(body.get('api_key')).toBe('1234567890');
			expect(body.get('timestamp')).toEqual(expect.any(String));

			const { buildSignature } = await import('./buildSignature');
			const expectedSignature = buildSignature(
				{ public_id: 'lead-utp/x/abc123', timestamp: Number(body.get('timestamp')) },
				ENV.apiSecret,
			);
			expect(body.get('signature')).toBe(expectedSignature);
		});

		it('tira si Cloudinary responde result distinto de "ok"', async () => {
			vi.mocked(globalThis.fetch).mockResolvedValue(
				new Response(JSON.stringify({ result: 'not found' }), { status: 200 }),
			);

			const storage = new CloudinaryPhotoStorage(ENV);
			await expect(storage.destroy('no-existe')).rejects.toThrow();
		});

		it('tira si la petición de red falla', async () => {
			vi.mocked(globalThis.fetch).mockRejectedValue(new Error('network down'));

			const storage = new CloudinaryPhotoStorage(ENV);
			await expect(storage.destroy('x')).rejects.toThrow();
		});
	});
});
