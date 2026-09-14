import { describe, expect, it } from 'vitest';
import {
	PAGE_BLOCK_KEYS,
	isPageBlockKey,
	validatePageBlockData,
} from './validatePageBlockData';

// Contrato: docs/API_CONTRACTS.md §5 (PUT /administrator/api/pages/:key).
// La forma de `data` espeja los tipos de src/data/**/*.types.ts:
//   nosotros.team  → TeamMember[]  ({ name, role }, D-14e)
//   proyectos.list → Project[]     (bloque único, D-14f)
//
// `nosotros.history` NO es una key válida (Cambio 3, 2026-09-14, D-18):
// la historia se quedó fija en about.data.ts, editable solo por
// desarrollador en código. Se sacó a propósito de la lista cerrada —no
// solo se le quitó la UI del panel— para que ni el endpoint ni esta
// validación puedan aceptarla nunca, aunque alguien la llame directo.

describe('PAGE_BLOCK_KEYS / isPageBlockKey', () => {
	it('es la lista cerrada de 2 keys del contrato', () => {
		expect([...PAGE_BLOCK_KEYS]).toEqual(['nosotros.team', 'proyectos.list']);
	});

	it('reconoce las keys válidas', () => {
		expect(isPageBlockKey('nosotros.team')).toBe(true);
		expect(isPageBlockKey('proyectos.list')).toBe(true);
	});

	it('rechaza una key fuera de la lista, incluida nosotros.history (D-18)', () => {
		expect(isPageBlockKey('nosotros.history')).toBe(false);
		expect(isPageBlockKey('nosotros.mission')).toBe(false);
		expect(isPageBlockKey('')).toBe(false);
		expect(isPageBlockKey(null)).toBe(false);
		expect(isPageBlockKey(42)).toBe(false);
	});
});

describe('validatePageBlockData — key desconocida', () => {
	it('rechaza una key que no está en la lista cerrada', () => {
		expect(validatePageBlockData('proyectos.destacados', {}).ok).toBe(false);
	});

	it('rechaza nosotros.history aunque el body tenga forma válida (D-18)', () => {
		expect(
			validatePageBlockData('nosotros.history', {
				body: 'LEAD UTP nació en 2023.',
			}).ok,
		).toBe(false);
	});
});

describe('validatePageBlockData — nosotros.team', () => {
	const MEMBER = { name: 'Ana Pérez', role: 'Directora de Liderazgo' };

	it('acepta un array de miembros válidos', () => {
		expect(validatePageBlockData('nosotros.team', [MEMBER])).toEqual({
			ok: true,
		});
	});

	it('acepta un array vacío (la sección se oculta sola en /nosotros)', () => {
		expect(validatePageBlockData('nosotros.team', [])).toEqual({ ok: true });
	});

	it('rechaza un objeto en vez de un array', () => {
		expect(validatePageBlockData('nosotros.team', MEMBER).ok).toBe(false);
	});

	it('rechaza un miembro sin name', () => {
		expect(
			validatePageBlockData('nosotros.team', [{ role: 'Directora' }]).ok,
		).toBe(false);
	});

	it('rechaza un miembro sin role', () => {
		expect(validatePageBlockData('nosotros.team', [{ name: 'Ana' }]).ok).toBe(
			false,
		);
	});

	it('rechaza name o role vacíos', () => {
		expect(
			validatePageBlockData('nosotros.team', [{ ...MEMBER, name: '  ' }]).ok,
		).toBe(false);
		expect(
			validatePageBlockData('nosotros.team', [{ ...MEMBER, role: '' }]).ok,
		).toBe(false);
	});

	it('rechaza un elemento que no es objeto', () => {
		expect(validatePageBlockData('nosotros.team', ['Ana Pérez']).ok).toBe(
			false,
		);
	});

	it('indica el índice del miembro inválido', () => {
		const result = validatePageBlockData('nosotros.team', [
			MEMBER,
			{ name: 'Ana' },
		]);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain('[1]');
	});
});

describe('validatePageBlockData — proyectos.list', () => {
	const PROJECT = {
		slug: 'cv-matcher',
		name: 'CV Matcher',
		description: 'Herramienta para mejorar el CV de los miembros.',
		status: 'activo',
	};

	it('acepta un array de proyectos válidos', () => {
		expect(validatePageBlockData('proyectos.list', [PROJECT])).toEqual({
			ok: true,
		});
	});

	it('acepta un array vacío (la página muestra su estado vacío)', () => {
		expect(validatePageBlockData('proyectos.list', [])).toEqual({ ok: true });
	});

	it('acepta link https:// opcional', () => {
		expect(
			validatePageBlockData('proyectos.list', [
				{ ...PROJECT, link: 'https://leadutp.org/cv-matcher' },
			]),
		).toEqual({ ok: true });
	});

	it('acepta un link interno que empieza con /', () => {
		expect(
			validatePageBlockData('proyectos.list', [
				{ ...PROJECT, link: '/pilares/liderazgo' },
			]),
		).toEqual({ ok: true });
	});

	it('rechaza link javascript: (XSS — href se renderiza sin sanitizar)', () => {
		expect(
			validatePageBlockData('proyectos.list', [
				{ ...PROJECT, link: 'javascript:alert(1)' },
			]).ok,
		).toBe(false);
	});

	it('rechaza link http:// y data:', () => {
		expect(
			validatePageBlockData('proyectos.list', [
				{ ...PROJECT, link: 'http://inseguro.com' },
			]).ok,
		).toBe(false);
		expect(
			validatePageBlockData('proyectos.list', [
				{ ...PROJECT, link: 'data:text/html,<b>x</b>' },
			]).ok,
		).toBe(false);
	});

	it('rechaza link protocol-relative //evil.com (se iría del sitio)', () => {
		expect(
			validatePageBlockData('proyectos.list', [
				{ ...PROJECT, link: '//evil.com' },
			]).ok,
		).toBe(false);
	});

	it('rechaza un status fuera de la unión ProjectStatus', () => {
		expect(
			validatePageBlockData('proyectos.list', [
				{ ...PROJECT, status: 'pausado' },
			]).ok,
		).toBe(false);
	});

	it('acepta los 3 status válidos', () => {
		for (const status of ['activo', 'finalizado', 'planificado']) {
			expect(
				validatePageBlockData('proyectos.list', [{ ...PROJECT, status }]),
			).toEqual({ ok: true });
		}
	});

	it('rechaza un slug con mayúsculas o espacios', () => {
		expect(
			validatePageBlockData('proyectos.list', [
				{ ...PROJECT, slug: 'CV Matcher' },
			]).ok,
		).toBe(false);
	});

	it('rechaza slugs duplicados (el slug es la identidad del proyecto)', () => {
		expect(
			validatePageBlockData('proyectos.list', [
				PROJECT,
				{ ...PROJECT, name: 'Otro' },
			]).ok,
		).toBe(false);
	});

	it('rechaza sin name o sin description', () => {
		expect(
			validatePageBlockData('proyectos.list', [{ ...PROJECT, name: undefined }])
				.ok,
		).toBe(false);
		expect(
			validatePageBlockData('proyectos.list', [
				{ ...PROJECT, description: undefined },
			]).ok,
		).toBe(false);
	});

	it('rechaza name o description vacíos', () => {
		expect(
			validatePageBlockData('proyectos.list', [{ ...PROJECT, name: '   ' }]).ok,
		).toBe(false);
		expect(
			validatePageBlockData('proyectos.list', [{ ...PROJECT, description: '' }])
				.ok,
		).toBe(false);
	});

	it('indica el índice del proyecto inválido', () => {
		const result = validatePageBlockData('proyectos.list', [
			PROJECT,
			{ ...PROJECT, slug: 'otro', status: 'pausado' },
		]);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain('[1]');
	});
});
