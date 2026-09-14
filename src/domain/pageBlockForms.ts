/**
 * Mapeo entre las filas del formulario de /administrator/paginas (T5.3) y
 * la forma que valida `validatePageBlockData` (T5.1).
 *
 * Vive acá y no suelto en el <script> de la página porque tiene casos
 * borde reales: una fila vacía al final del formulario —lo más normal del
 * mundo al agregar un miembro y arrepentirse— produciría un 422
 * "data[2].name es requerido" imposible de interpretar para quien lo está
 * usando. Dominio puro: sin imports externos.
 *
 * Regla de diseño de `parse*`: se descarta la fila **completamente**
 * vacía, nunca una a medio llenar. Si alguien escribió un nombre y olvidó
 * el rol, tiene que ver el error del validador — no que su fila
 * desaparezca sin explicación.
 */

export interface TeamRow {
	name: string;
	role: string;
}

export interface ProjectRow {
	slug: string;
	name: string;
	description: string;
	status: string;
	link: string;
}

interface ParsedProject {
	slug: string;
	name: string;
	description: string;
	status: string;
	link?: string;
}

const DEFAULT_STATUS = 'activo';
const PROJECT_STATUSES = ['activo', 'finalizado', 'planificado'];

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseTeamRows(rows: TeamRow[]): TeamRow[] {
	return rows
		.map((row) => ({ name: text(row.name), role: text(row.role) }))
		.filter((row) => row.name !== '' || row.role !== '');
}

export function parseProjectRows(rows: ProjectRow[]): ParsedProject[] {
	return rows
		.map((row) => ({
			slug: text(row.slug),
			name: text(row.name),
			description: text(row.description),
			status: text(row.status) || DEFAULT_STATUS,
			link: text(row.link),
		}))
		// `status` siempre trae un valor (el <select> tiene default), así que
		// no cuenta como "la fila tiene contenido".
		.filter(
			(row) => row.slug !== '' || row.name !== '' || row.description !== '',
		)
		.map((row) => {
			const project: ParsedProject = {
				slug: row.slug,
				name: row.name,
				description: row.description,
				status: row.status,
			};
			if (row.link !== '') project.link = row.link;
			return project;
		});
}

/**
 * Prefill del formulario desde el `data` ya guardado. `data` es jsonb sin
 * garantía de forma (puede venir de una versión anterior del bloque), así
 * que esto tolera cualquier cosa en vez de romper la pantalla: lo peor que
 * pasa es que el director vea un campo vacío y lo vuelva a escribir.
 */
export function asTeamRows(data: unknown): TeamRow[] {
	if (!Array.isArray(data)) return [];
	return data.map((item) => ({
		name: isRecord(item) ? text(item.name) : '',
		role: isRecord(item) ? text(item.role) : '',
	}));
}

export function asProjectRows(data: unknown): ProjectRow[] {
	if (!Array.isArray(data)) return [];
	return data.map((item) => {
		if (!isRecord(item)) {
			return {
				slug: '',
				name: '',
				description: '',
				status: DEFAULT_STATUS,
				link: '',
			};
		}
		const status = text(item.status);
		return {
			slug: text(item.slug),
			name: text(item.name),
			description: text(item.description),
			status: PROJECT_STATUSES.includes(status) ? status : DEFAULT_STATUS,
			link: text(item.link),
		};
	});
}
