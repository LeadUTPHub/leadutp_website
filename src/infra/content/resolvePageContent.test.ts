import { describe, expect, it } from 'vitest';
import { about } from '../../data/about';
import type { Project } from '../../data/projects';
import { resolveAbout, resolveProjects } from './resolvePageContent';

// T5.4 — cadena de degradación de DOMAIN.md ("resolveContent"):
//   (1) Supabase en vivo → (2) snapshot *.fallback.json → (3) *.data.ts
//   → (4) estado vacío curado.
//
// La parte que importa probar acá no es el camino feliz, sino que un
// `data` con forma inválida guardado en Supabase (por ejemplo, escrito
// antes de un cambio de validador) NO llegue al sitio público ni rompa el
// build: se ignora y se sigue bajando por la cadena.

const PROJECT: Project = {
	slug: 'cv-matcher',
	name: 'CV Matcher',
	description: 'Mejora el CV de los miembros.',
	status: 'activo',
};

describe('resolveAbout', () => {
	it('sin nada en Supabase ni snapshot, usa about.data.ts', () => {
		const result = resolveAbout({
			historyBlock: null,
			teamBlock: null,
			snapshot: null,
			staticAbout: about,
		});

		expect(result.content.mission).toBe(about.mission);
		expect(result.content.history).toBe(about.history);
		expect(result.content.team).toEqual(about.team);
		expect(result.historySource).toBe('static');
		expect(result.teamSource).toBe('static');
	});

	it('la historia SIEMPRE viene de about.data.ts, ignora Supabase (Cambio 3, D-18: nosotros.history ya no es una key válida)', () => {
		const result = resolveAbout({
			historyBlock: {
				data: { body: 'LEAD UTP nació en 2023.' },
				source: 'supabase',
			},
			teamBlock: null,
			snapshot: null,
			staticAbout: about,
		});

		// validatePageBlockData('nosotros.history', ...) rechaza por key
		// inválida antes de mirar la forma — este historyBlock, aunque tenga
		// forma perfectamente válida, nunca llega a usarse.
		expect(result.content.history).toBe(about.history);
		expect(result.historySource).toBe('static');
	});

	it('usa la junta de Supabase cuando existe', () => {
		const team = [{ name: 'Ana Pérez', role: 'Presidenta' }];
		const result = resolveAbout({
			historyBlock: null,
			teamBlock: { data: team, source: 'supabase' },
			snapshot: null,
			staticAbout: about,
		});

		expect(result.content.team).toEqual(team);
		expect(result.teamSource).toBe('supabase');
	});

	it('NUNCA toca misión/visión/valores/acrónimo (D-14b: siguen estáticos)', () => {
		const result = resolveAbout({
			historyBlock: {
				data: { body: 'Historia nueva' },
				source: 'supabase',
			},
			teamBlock: { data: [{ name: 'Ana', role: 'Presidenta' }], source: 'supabase' },
			snapshot: null,
			staticAbout: about,
		});

		expect(result.content.intro).toBe(about.intro);
		expect(result.content.mission).toBe(about.mission);
		expect(result.content.vision).toBe(about.vision);
		expect(result.content.values).toEqual(about.values);
		expect(result.content.acronym).toEqual(about.acronym);
	});

	it('ignora un bloque con forma inválida y sigue bajando por la cadena', () => {
		const result = resolveAbout({
			// `body` numérico: no pasa validatePageBlockData.
			historyBlock: { data: { body: 42 }, source: 'supabase' },
			// Un miembro sin `role`: tampoco pasa.
			teamBlock: { data: [{ name: 'Ana' }], source: 'supabase' },
			snapshot: null,
			staticAbout: about,
		});

		expect(result.content.history).toBe(about.history);
		expect(result.content.team).toEqual(about.team);
		expect(result.historySource).toBe('static');
		expect(result.teamSource).toBe('static');
	});

	it('usa el snapshot de junta cuando Supabase no respondió (la historia sigue ignorando el snapshot, mismo motivo)', () => {
		const result = resolveAbout({
			historyBlock: null,
			teamBlock: null,
			snapshot: {
				history: 'Historia del snapshot',
				team: [{ name: 'Ana', role: 'Presidenta' }],
			},
			staticAbout: about,
		});

		expect(result.content.history).toBe(about.history);
		expect(result.content.team).toEqual([{ name: 'Ana', role: 'Presidenta' }]);
		expect(result.historySource).toBe('static');
		expect(result.teamSource).toBe('static');
	});

	it('Supabase gana sobre el snapshot (junta — la historia ya no tiene este camino)', () => {
		const result = resolveAbout({
			historyBlock: null,
			teamBlock: { data: [{ name: 'Ana', role: 'Presidenta' }], source: 'supabase' },
			snapshot: { team: [{ name: 'Otra', role: 'Vicepresidenta' }] },
			staticAbout: about,
		});

		expect(result.content.team).toEqual([{ name: 'Ana', role: 'Presidenta' }]);
		expect(result.teamSource).toBe('supabase');
	});

	it('una junta vacía en Supabase es un valor válido (oculta la sección)', () => {
		const result = resolveAbout({
			historyBlock: null,
			teamBlock: { data: [], source: 'supabase' },
			snapshot: null,
			staticAbout: about,
		});

		expect(result.content.team).toEqual([]);
		expect(result.teamSource).toBe('supabase');
	});

	it('ignora un snapshot con forma inválida', () => {
		const result = resolveAbout({
			historyBlock: null,
			teamBlock: null,
			snapshot: { history: 42, team: 'no es array' } as never,
			staticAbout: about,
		});

		expect(result.content.history).toBe(about.history);
		expect(result.content.team).toEqual(about.team);
	});
});

describe('resolveProjects', () => {
	it('sin nada, usa projects.data.ts', () => {
		const result = resolveProjects({
			block: null,
			snapshot: null,
			staticProjects: [PROJECT],
		});

		expect(result.projects).toEqual([PROJECT]);
		expect(result.source).toBe('static');
	});

	it('usa la lista de Supabase cuando existe', () => {
		const result = resolveProjects({
			block: { data: [PROJECT], source: 'supabase' },
			snapshot: null,
			staticProjects: [],
		});

		expect(result.projects).toEqual([PROJECT]);
		expect(result.source).toBe('supabase');
	});

	it('una lista vacía en Supabase es un valor válido (estado vacío curado)', () => {
		const result = resolveProjects({
			block: { data: [], source: 'supabase' },
			snapshot: null,
			staticProjects: [PROJECT],
		});

		expect(result.projects).toEqual([]);
		expect(result.source).toBe('supabase');
	});

	it('ignora una lista inválida de Supabase y cae al estático', () => {
		const result = resolveProjects({
			block: { data: [{ ...PROJECT, status: 'pausado' }], source: 'supabase' },
			snapshot: null,
			staticProjects: [PROJECT],
		});

		expect(result.projects).toEqual([PROJECT]);
		expect(result.source).toBe('static');
	});

	it('usa el snapshot cuando Supabase no respondió', () => {
		const result = resolveProjects({
			block: null,
			snapshot: [PROJECT],
			staticProjects: [],
		});

		expect(result.projects).toEqual([PROJECT]);
		expect(result.source).toBe('static');
	});

	it('termina en estado vacío si no hay ninguna fuente', () => {
		const result = resolveProjects({
			block: null,
			snapshot: null,
			staticProjects: [],
		});

		expect(result.projects).toEqual([]);
		expect(result.source).toBe('static');
	});
});
