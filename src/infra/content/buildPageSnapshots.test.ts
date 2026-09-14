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
//
// `about.fallback.json` ya NO cubre la historia (Cambio 3, 2026-09-14,
// D-18): `nosotros.history` se sacó de la lista cerrada de
// validatePageBlockData.ts, así que nunca puede volver a ser un
// `FetchOutcome` válido — snapshotearla sería perseguir algo que nunca
// va a pasar. Solo queda la junta.

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
			team: { ok: false },
		});

		expect(result).toBeNull();
	});

	it('Supabase no respondió: preserva el snapshot existente tal cual (no lo borra)', () => {
		const result = buildAboutSnapshot({
			current: { team: TEAM },
			team: { ok: false },
		});

		expect(result).toEqual({ team: TEAM });
	});

	it('Supabase respondió con junta nueva: la reemplaza', () => {
		const result = buildAboutSnapshot({
			current: { team: TEAM },
			team: { ok: true, value: OTHER_TEAM },
		});

		expect(result).toEqual({ team: OTHER_TEAM });
	});

	it('la junta se despublicó (ok:true, value:null): no queda nada que persistir', () => {
		const result = buildAboutSnapshot({
			current: { team: TEAM },
			team: { ok: true, value: null },
		});

		expect(result).toBeNull();
	});

	it('primera publicación, sin snapshot previo: arma uno desde cero', () => {
		const result = buildAboutSnapshot({
			current: null,
			team: { ok: true, value: TEAM },
		});

		expect(result).toEqual({ team: TEAM });
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
