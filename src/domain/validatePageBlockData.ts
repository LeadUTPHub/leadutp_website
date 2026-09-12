/**
 * Valida el `data` jsonb de PUT /administrator/api/pages/:key contra la
 * forma que le corresponde a cada `key` (docs/API_CONTRACTS.md §5).
 *
 * La forma espeja los tipos de src/data/**\/*.types.ts, que son la fuente
 * de verdad de lo que las páginas públicas saben renderizar:
 *   nosotros.history → { body: string }   markdown (D-14d)
 *   nosotros.team    → TeamMember[]       src/data/about/about.types.ts
 *   proyectos.list   → Project[]          src/data/projects/projects.types.ts
 *
 * Este archivo NO importa esos tipos: el dominio es puro y no depende de
 * la capa de contenido del sitio público (misma regla que `isAreaSlug` en
 * types.ts, que replica los slugs en vez de importar src/data/pillars).
 * El test de contrato de T5.2 es el que ata ambos lados.
 *
 * `data` siempre es objeto o array, nunca un escalar suelto: aunque jsonb
 * acepta un string pelado, envolverlo deja lugar a crecer sin migración.
 */
export type ValidationResult = { ok: true } | { ok: false; error: string };

/** Lista cerrada del contrato §5. Una key fuera de acá se rechaza. */
export const PAGE_BLOCK_KEYS = [
	'nosotros.history',
	'nosotros.team',
	'proyectos.list',
] as const;

export type PageBlockKey = (typeof PAGE_BLOCK_KEYS)[number];

export function isPageBlockKey(value: unknown): value is PageBlockKey {
	return (
		typeof value === 'string' && PAGE_BLOCK_KEYS.includes(value as PageBlockKey)
	);
}

const PROJECT_STATUSES = ['activo', 'finalizado', 'planificado'] as const;
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const NAME_MAX_LENGTH = 140;
const DESCRIPTION_MAX_LENGTH = 600;

function fail(error: string): ValidationResult {
	return { ok: false, error };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Texto presente, no vacío y dentro del límite. `path` va en el error. */
function validateText(
	value: unknown,
	path: string,
	maxLength: number,
): ValidationResult {
	if (value === undefined || value === null)
		return fail(`${path} es requerido.`);
	if (typeof value !== 'string') return fail(`${path} debe ser texto.`);
	if (value.trim().length === 0) return fail(`${path} no puede estar vacío.`);
	if (value.length > maxLength) {
		return fail(`${path} no puede superar los ${maxLength} caracteres.`);
	}
	return { ok: true };
}

/**
 * `link` se renderiza como href en /proyectos sin sanitizar, así que la
 * lista de esquemas permitidos es una defensa real, no cosmética: solo
 * https:// externo o una ruta interna que empiece con "/" (y no con "//",
 * que es protocol-relative y saldría del sitio).
 */
function validateLink(value: unknown, path: string): ValidationResult {
	if (value === undefined || value === null) return { ok: true };
	if (typeof value !== 'string') return fail(`${path} debe ser texto.`);
	if (value.startsWith('https://')) return { ok: true };
	if (value.startsWith('/') && !value.startsWith('//')) return { ok: true };
	return fail(
		`${path} debe empezar con https:// o ser una ruta interna (/...).`,
	);
}

function validateHistory(data: unknown): ValidationResult {
	if (!isPlainObject(data)) {
		return fail('data debe ser un objeto { body }.');
	}
	return validateText(data.body, 'data.body', Number.MAX_SAFE_INTEGER);
}

function validateTeam(data: unknown): ValidationResult {
	if (!Array.isArray(data)) return fail('data debe ser un array de miembros.');

	for (const [index, member] of data.entries()) {
		const path = `data[${index}]`;
		if (!isPlainObject(member)) return fail(`${path} debe ser un objeto.`);

		const name = validateText(member.name, `${path}.name`, NAME_MAX_LENGTH);
		if (!name.ok) return name;

		const role = validateText(member.role, `${path}.role`, NAME_MAX_LENGTH);
		if (!role.ok) return role;
	}

	return { ok: true };
}

function validateProjects(data: unknown): ValidationResult {
	if (!Array.isArray(data)) return fail('data debe ser un array de proyectos.');

	const seenSlugs = new Set<string>();

	for (const [index, project] of data.entries()) {
		const path = `data[${index}]`;
		if (!isPlainObject(project)) return fail(`${path} debe ser un objeto.`);

		const slug = validateText(project.slug, `${path}.slug`, NAME_MAX_LENGTH);
		if (!slug.ok) return slug;
		if (!SLUG_PATTERN.test(project.slug as string)) {
			return fail(
				`${path}.slug solo puede tener minúsculas, números y guiones.`,
			);
		}
		if (seenSlugs.has(project.slug as string)) {
			return fail(`${path}.slug está repetido: "${project.slug as string}".`);
		}
		seenSlugs.add(project.slug as string);

		const name = validateText(project.name, `${path}.name`, NAME_MAX_LENGTH);
		if (!name.ok) return name;

		const description = validateText(
			project.description,
			`${path}.description`,
			DESCRIPTION_MAX_LENGTH,
		);
		if (!description.ok) return description;

		if (
			!PROJECT_STATUSES.includes(
				project.status as (typeof PROJECT_STATUSES)[number],
			)
		) {
			return fail(
				`${path}.status debe ser uno de: ${PROJECT_STATUSES.join(', ')}.`,
			);
		}

		const link = validateLink(project.link, `${path}.link`);
		if (!link.ok) return link;
	}

	return { ok: true };
}

/** Punto de entrada: despacha al validador de forma según la `key`. */
export function validatePageBlockData(
	key: unknown,
	data: unknown,
): ValidationResult {
	if (!isPageBlockKey(key)) {
		return fail(
			`key inválida. Valores permitidos: ${PAGE_BLOCK_KEYS.join(', ')}.`,
		);
	}

	switch (key) {
		case 'nosotros.history':
			return validateHistory(data);
		case 'nosotros.team':
			return validateTeam(data);
		case 'proyectos.list':
			return validateProjects(data);
	}
}
