import { describe, expect, it } from 'vitest';
import type { TeamMember } from '../../data/about';
import type { Project } from '../../data/projects';
import { buildAboutSnapshot, buildProjectsSnapshot } from './buildPageSnapshots';

// T5.5 — política pura del script `prebuild`: decide qué le corresponde a
// cada snapshot (`about.fallback.json` / `projects.fallback.json`) dado lo
// que ya había en disco + lo que se pudo leer de Supabase en este momento.
//
// Regla central (DoD de T5.5): si Supabase no respondió, el snapshot
// existente NO se toca. Si Supabase respondió pero la key ya no está
// publicada, el snapshot se limpia (no se queda con contenido viejo que ya
// no es la verdad actual — D-14c). El script (no este archivo) es quien
// decide si "limpiar" significa borrar el archivo.

const TEAM: TeamMember[] = [{ name: 'Ana Pérez', role: 'Presidenta' }];
const OTHER_TEAM: TeamMember[] = [{ name: 'Luis Gómez', role: 'Vicepresidente' }];

const PROJECT: Project = {
	slug: 'cv-matcher',
	name: 'CV Matcher',
	description: 'Mejora el CV de los miembros.',
	status: 'activo',
};

describe('buildAboutSnapshot', () => {
	it('sin snapshot previo y Supabase no respondió, no hay nada que persistir', () => {
		const result = buildAboutSnapshot({
			current: null,
			history: { ok: false },
			team: { ok: false },
		});

		expect(result).toBeNull();
	});

	it('Supabase no respondió: preserva el snapshot existente tal cual (no lo borra)', () => {
		const result = buildAboutSnapshot({
			current: { history: 'Historia vieja.', team: TEAM },
			history: { ok: false },
			team: { ok: false },
		});

		expect(result).toEqual({ history: 'Historia vieja.', team: TEAM });
	});

	it('Supabase respondió con historia nueva: la reemplaza', () => {
		const result = buildAboutSnapshot({
			current: { history: 'Historia vieja.', team: TEAM },
			history: { ok: true, value: 'Historia nueva.' },
			team: { ok: false },
		});

		expect(result).toEqual({ history: 'Historia nueva.', team: TEAM });
	});

	it('solo la historia falló al leerse: la junta se actualiza igual', () => {
		const result = buildAboutSnapshot({
			current: { history: 'Historia vieja.', team: TEAM },
			history: { ok: false },
			team: { ok: true, value: OTHER_TEAM },
		});

		expect(result).toEqual({ history: 'Historia vieja.', team: OTHER_TEAM });
	});

	it('la historia se despublicó (ok:true, value:null): se limpia del snapshot', () => {
		const result = buildAboutSnapshot({
			current: { history: 'Historia vieja.', team: TEAM },
			history: { ok: true, value: null },
			team: { ok: false },
		});

		expect(result).toEqual({ history: undefined, team: TEAM });
	});

	it('ambas keys se despublicaron: no queda nada que persistir (null → borrar archivo)', () => {
		const result = buildAboutSnapshot({
			current: { history: 'Historia vieja.', team: TEAM },
			history: { ok: true, value: null },
			team: { ok: true, value: null },
		});

		expect(result).toBeNull();
	});

	it('primera publicación, sin snapshot previo: arma uno desde cero', () => {
		const result = buildAboutSnapshot({
			current: null,
			history: { ok: true, value: 'LEAD UTP nació en 2023.' },
			team: { ok: true, value: TEAM },
		});

		expect(result).toEqual({ history: 'LEAD UTP nació en 2023.', team: TEAM });
	});

	it('sin snapshot previo y solo la junta está publicada', () => {
		const result = buildAboutSnapshot({
			current: null,
			history: { ok: true, value: null },
			team: { ok: true, value: TEAM },
		});

		expect(result).toEqual({ history: undefined, team: TEAM });
	});
});

describe('buildProjectsSnapshot', () => {
	it('sin snapshot previo y Supabase no respondió, no hay nada que persistir', () => {
		expect(buildProjectsSnapshot(null, { ok: false })).toBeNull();
	});

	it('Supabase no respondió: preserva el snapshot existente tal cual', () => {
		const result = buildProjectsSnapshot([PROJECT], { ok: false });
		expect(result).toEqual([PROJECT]);
	});

	it('Supabase respondió con la lista nueva: la reemplaza', () => {
		const nuevo = [{ ...PROJECT, slug: 'otro-proyecto' }];
		const result = buildProjectsSnapshot([PROJECT], { ok: true, value: nuevo });
		expect(result).toEqual(nuevo);
	});

	it('se despublicó (ok:true, value:null) con snapshot previo: limpia (null → borrar)', () => {
		const result = buildProjectsSnapshot([PROJECT], { ok: true, value: null });
		expect(result).toBeNull();
	});

	it('primera publicación, sin snapshot previo', () => {
		const result = buildProjectsSnapshot(null, { ok: true, value: [PROJECT] });
		expect(result).toEqual([PROJECT]);
	});

	it('lista publicada vacía es un valor válido, no "sin info"', () => {
		const result = buildProjectsSnapshot([PROJECT], { ok: true, value: [] });
		expect(result).toEqual([]);
	});
});
