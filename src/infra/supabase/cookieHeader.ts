// Parser puro del header `Cookie` de la request. @supabase/ssr (versión
// no-deprecated de la API) pide `getAll(): {name, value}[]` en vez de
// get/set/remove sueltos — Astro no expone un "getAll" de las cookies
// entrantes, así que se arma acá desde el header crudo.
export function parseCookieHeader(
	header: string | null | undefined,
): { name: string; value: string }[] {
	if (!header) return [];

	return header
		.split(';')
		.map((pair) => pair.trim())
		.filter((pair) => pair.includes('='))
		.map((pair) => {
			const separatorIndex = pair.indexOf('=');
			const name = pair.slice(0, separatorIndex).trim();
			const value = pair.slice(separatorIndex + 1).trim();
			return { name, value: decodeURIComponent(value) };
		});
}
