import { describe, expect, it } from 'vitest';
import {
	asProjectRows,
	asTeamRows,
	parseProjectRows,
	parseTeamRows,
} from './pageBlockForms';

// T5.3 — mapeo entre las filas del formulario de /administrator/paginas y
// la forma que espera validatePageBlockData (T5.1).
//
// La razón de que esto exista como módulo puro y testeado, en vez de vivir
// suelto en el <script> de la página: una fila vacía al final del
// formulario (el caso más normal del mundo al agregar un miembro y
// arrepentirse) produciría un 422 "data[2].name es requerido" que el
// usuario no puede interpretar. Descartar filas en blanco es lógica con
// casos borde, no presentación.

describe('parseTeamRows', () => {
	it('mapea filas completas', () => {
		expect(
			parseTeamRows([{ name: 'Ana Pérez', role: 'Directora de Liderazgo' }]),
		).toEqual([{ name: 'Ana Pérez', role: 'Directora de Liderazgo' }]);
	});

	it('descarta filas completamente vacías', () => {
		expect(
			parseTeamRows([
				{ name: 'Ana Pérez', role: 'Directora' },
				{ name: '', role: '' },
				{ name: '   ', role: '  ' },
			]),
		).toEqual([{ name: 'Ana Pérez', role: 'Directora' }]);
	});

	it('recorta espacios', () => {
		expect(parseTeamRows([{ name: '  Ana  ', role: '  Directora ' }])).toEqual([
			{ name: 'Ana', role: 'Directora' },
		]);
	});

	it('CONSERVA una fila a medio llenar para que el validador la rechace', () => {
		// No se descarta: si el usuario escribió un nombre y olvidó el rol,
		// tiene que ver el error, no que su fila desaparezca en silencio.
		expect(parseTeamRows([{ name: 'Ana', role: '' }])).toEqual([
			{ name: 'Ana', role: '' },
		]);
	});

	it('devuelve array vacío si todas las filas están vacías', () => {
		expect(parseTeamRows([{ name: '', role: '' }])).toEqual([]);
	});
});

describe('parseProjectRows', () => {
	const ROW = {
		slug: 'cv-matcher',
		name: 'CV Matcher',
		description: 'Mejora el CV de los miembros.',
		status: 'activo',
		link: '',
	};

	it('mapea una fila completa y omite link vacío', () => {
		expect(parseProjectRows([ROW])).toEqual([
			{
				slug: 'cv-matcher',
				name: 'CV Matcher',
				description: 'Mejora el CV de los miembros.',
				status: 'activo',
			},
		]);
	});

	it('incluye link cuando tiene valor', () => {
		expect(
			parseProjectRows([{ ...ROW, link: 'https://leadutp.org/cv' }])[0].link,
		).toBe('https://leadutp.org/cv');
	});

	it('descarta filas completamente vacías', () => {
		expect(
			parseProjectRows([
				ROW,
				{ slug: '', name: '', description: '', status: 'activo', link: '' },
			]),
		).toEqual([
			{
				slug: 'cv-matcher',
				name: 'CV Matcher',
				description: 'Mejora el CV de los miembros.',
				status: 'activo',
			},
		]);
	});

	it('una fila con solo status elegido cuenta como vacía', () => {
		// `status` tiene un valor por defecto en el <select>, así que no
		// alcanza para considerar que la fila tiene contenido.
		expect(
			parseProjectRows([
				{ slug: '', name: '', description: '', status: 'planificado', link: '' },
			]),
		).toEqual([]);
	});

	it('recorta espacios', () => {
		expect(parseProjectRows([{ ...ROW, name: '  CV Matcher  ' }])[0].name).toBe(
			'CV Matcher',
		);
	});
});

describe('asTeamRows — prefill desde el bloque guardado', () => {
	it('convierte data válida en filas', () => {
		expect(asTeamRows([{ name: 'Ana', role: 'Directora' }])).toEqual([
			{ name: 'Ana', role: 'Directora' },
		]);
	});

	it('devuelve [] si data no es un array (bloque con forma inesperada)', () => {
		expect(asTeamRows(null)).toEqual([]);
		expect(asTeamRows({ name: 'Ana' })).toEqual([]);
		expect(asTeamRows('texto')).toEqual([]);
	});

	it('tolera campos faltantes sin romper la pantalla', () => {
		expect(asTeamRows([{ name: 'Ana' }, {}])).toEqual([
			{ name: 'Ana', role: '' },
			{ name: '', role: '' },
		]);
	});

	it('ignora elementos que no son objetos', () => {
		expect(asTeamRows(['Ana', 42])).toEqual([
			{ name: '', role: '' },
			{ name: '', role: '' },
		]);
	});
});

describe('asProjectRows — prefill desde el bloque guardado', () => {
	it('convierte data válida en filas, con link vacío si no tiene', () => {
		expect(
			asProjectRows([
				{
					slug: 'cv-matcher',
					name: 'CV Matcher',
					description: 'Desc',
					status: 'activo',
				},
			]),
		).toEqual([
			{
				slug: 'cv-matcher',
				name: 'CV Matcher',
				description: 'Desc',
				status: 'activo',
				link: '',
			},
		]);
	});

	it('devuelve [] si data no es un array', () => {
		expect(asProjectRows(null)).toEqual([]);
		expect(asProjectRows({})).toEqual([]);
	});

	it('cae a "activo" si el status guardado no es válido', () => {
		expect(
			asProjectRows([
				{ slug: 'x', name: 'X', description: 'd', status: 'pausado' },
			])[0].status,
		).toBe('activo');
	});
});
