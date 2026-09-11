// Tipos de dominio puros. Ver DOMAIN.md para el glosario completo.
// Cero imports externos: ni Astro, ni SDKs, ni otras capas.

export type Role = 'director' | 'subdirector' | 'super_admin';

/** El "área" del sistema de roles mapea 1:1 a los slugs de los 6 pilares. */
export type AreaSlug =
	| 'desarrollo-profesional'
	| 'liderazgo'
	| 'excelencia-femenina'
	| 'desarrollo-del-capitulo'
	| 'excelencia-academica'
	| 'lead-academia';

/** Runtime de AreaSlug, para validar valores que llegan como string (ej.
 * body de un POST) sin importar src/data/pillars (capa de contenido del
 * sitio público, no de dominio). */
export const AREA_SLUGS: readonly AreaSlug[] = [
	'desarrollo-profesional',
	'liderazgo',
	'excelencia-femenina',
	'desarrollo-del-capitulo',
	'excelencia-academica',
	'lead-academia',
];

export function isAreaSlug(value: unknown): value is AreaSlug {
	return typeof value === 'string' && AREA_SLUGS.includes(value as AreaSlug);
}

export type ContentSource = 'supabase' | 'cloudinary' | 'static';

export interface Profile {
	id: string;
	fullName: string | null;
	role: Role;
	/** null solo si role === 'super_admin'. */
	areaSlug: AreaSlug | null;
	isActive: boolean;
}

export interface OwnedResource {
	ownerId: string;
	areaSlug: AreaSlug;
}
