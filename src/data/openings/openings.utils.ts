/**
 * Convierte la URL de un formulario de Google Forms en su versión embebible
 * (agrega `embedded=true` sin duplicar ni pisar el resto de la query string).
 */
export const getEmbeddedFormUrl = (url: string) => {
	const embedUrl = new URL(url);
	embedUrl.searchParams.set('embedded', 'true');
	return embedUrl.toString();
};
