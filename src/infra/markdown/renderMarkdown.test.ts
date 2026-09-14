import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './renderMarkdown';

// gallery.body se guarda como markdown (database/schema.sql: "body text
// -- markdown") pero hasta ahora nunca se parseaba — se mostraba literal
// en GalleryEventCard.astro. Este módulo lo parsea de verdad, sanitizando
// la salida: el body lo escribe staff autenticado (no un visitante), pero
// termina embebido en una página estática servida a todo el público, así
// que igual conviene no confiar ciegamente en el HTML crudo que produzca
// el markdown (ej. una cuenta comprometida, o un <script> pegado sin querer).
describe('renderMarkdown', () => {
	it('convierte negrita', () => {
		expect(renderMarkdown('esto es **importante**')).toContain(
			'<strong>importante</strong>',
		);
	});

	it('convierte cursiva', () => {
		expect(renderMarkdown('esto es *importante*')).toContain('<em>importante</em>');
	});

	it('convierte un link y le agrega rel/target seguros', () => {
		const html = renderMarkdown('mira [este link](https://luma.com/xxxx)');
		expect(html).toContain('href="https://luma.com/xxxx"');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it('convierte texto plano en un párrafo', () => {
		expect(renderMarkdown('hola mundo')).toBe('<p>hola mundo</p>\n');
	});

	it('elimina <script> por completo (sanitización)', () => {
		const html = renderMarkdown('texto <script>alert(1)</script> normal');
		expect(html).not.toContain('<script');
		expect(html).not.toContain('alert(1)');
	});

	it('elimina atributos onerror/onclick de cualquier tag colado', () => {
		const html = renderMarkdown('<img src=x onerror="alert(1)">');
		expect(html).not.toContain('onerror');
		expect(html).not.toContain('<img');
	});

	it('elimina iframes', () => {
		const html = renderMarkdown('<iframe src="https://evil.example"></iframe>');
		expect(html).not.toContain('<iframe');
	});

	it('devuelve string vacío para input vacío', () => {
		expect(renderMarkdown('')).toBe('');
	});
});
