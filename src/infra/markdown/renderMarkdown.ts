import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// gallery.body es markdown escrito por staff autenticado (director/
// subdirector/super_admin), pero el resultado se embebe en una página
// ESTÁTICA servida a todo el público (/eventos, build-time) — igual se
// sanitiza el HTML resultante: una cuenta comprometida o un <script>
// pegado sin querer no debe terminar corriendo en el navegador de un
// visitante. Sin SDK de Cloudinary/Supabase acá — no es purity de
// dominio (marked/sanitize-html son librerías externas), por eso vive
// en infra, mismo criterio que src/infra/cloudinary/buildSignature.ts.
const ALLOWED_TAGS = [
	'p',
	'strong',
	'em',
	'a',
	'ul',
	'ol',
	'li',
	'br',
	'code',
	'blockquote',
];

export function renderMarkdown(markdown: string): string {
	if (!markdown) return '';

	const rawHtml = marked.parse(markdown, { async: false }) as string;

	return sanitizeHtml(rawHtml, {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: { a: ['href', 'target', 'rel'] },
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', {
				target: '_blank',
				rel: 'noopener noreferrer',
			}),
		},
	});
}
