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
