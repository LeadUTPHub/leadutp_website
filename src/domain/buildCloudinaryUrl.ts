/**
 * URL de entrega de una imagen de Cloudinary, con transformaciones
 * responsive automáticas (ARCHITECTURE.md §2). `cloudinary_public_id`
 * es la fuente de verdad (DOMAIN.md, "Foto"); esta URL se deriva en
 * cada render, nunca se guarda.
 */
export function buildCloudinaryUrl(params: {
	cloudName: string;
	publicId: string;
	width: number;
}): string {
	const { cloudName, publicId, width } = params;
	return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}
