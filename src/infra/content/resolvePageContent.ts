import type { AboutContent, TeamMember } from '../../data/about';
import type { Project } from '../../data/projects';
import type { ResolvedContent } from '../../domain/ports/ContentRepository';
import type { ContentSource } from '../../domain/types';
import { validatePageBlockData } from '../../domain/validatePageBlockData';

/**
 * Cadena de degradación de DOMAIN.md ("resolveContent"):
 *   (1) Supabase en vivo → (2) snapshot *.fallback.json → (3) *.data.ts
 *   → (4) estado vacío curado.
 *
 * Vive en infra y no en domain porque compone fuentes concretas (el
 * repositorio, el snapshot en disco, los .data.ts de la capa de contenido
 * público). El dominio solo aporta el validador de forma.
 *
 * Regla clave: un `data` guardado en Supabase con forma inválida —por
 * ejemplo escrito antes de un cambio de validador— NO llega al sitio
 * público ni rompe el build. Se ignora y se sigue bajando por la cadena,
 * igual que si Supabase no hubiera respondido. `validatePageBlockData` es
 * el mismo validador que usa el endpoint al guardar, así que ambos lados
 * no se pueden desincronizar.
 *
 * Nota sobre `source`: el snapshot conserva `'static'` como procedencia
 * (regla 5 de trazabilidad). Es contenido congelado en el repo, no una
 * lectura en vivo — decir `'supabase'` sería mentir sobre su frescura.
 */

export interface AboutSnapshot {
	history?: unknown;
	team?: unknown;
}

interface ResolveAboutInput {
	historyBlock: ResolvedContent<unknown> | null;
	teamBlock: ResolvedContent<unknown> | null;
	snapshot: AboutSnapshot | null;
	staticAbout: AboutContent;
}

export interface ResolvedAbout {
	content: AboutContent;
	historySource: ContentSource;
	teamSource: ContentSource;
}

/** `data` del bloque solo si pasa el validador de su key. */
function validBlockData(
	block: ResolvedContent<unknown> | null,
	key: string,
): unknown | null {
	if (!block) return null;
	return validatePageBlockData(key, block.data).ok ? block.data : null;
}

function historyFrom(data: unknown): string | null {
	// Ya validado como { body: string } por validatePageBlockData.
	return (data as { body: string }).body;
}

export function resolveAbout(input: ResolveAboutInput): ResolvedAbout {
	const { historyBlock, teamBlock, snapshot, staticAbout } = input;

	// ── Historia ──────────────────────────────────────────────────────
	let history = staticAbout.history;
	let historySource: ContentSource = 'static';

	const liveHistory = validBlockData(historyBlock, 'nosotros.history');
	if (liveHistory !== null) {
		history = historyFrom(liveHistory) ?? undefined;
		historySource = historyBlock!.source;
	} else if (
		snapshot &&
		validatePageBlockData('nosotros.history', { body: snapshot.history }).ok
	) {
		history = snapshot.history as string;
	}

	// ── Junta directiva ───────────────────────────────────────────────
	let team = staticAbout.team;
	let teamSource: ContentSource = 'static';

	const liveTeam = validBlockData(teamBlock, 'nosotros.team');
	if (liveTeam !== null) {
		team = liveTeam as TeamMember[];
		teamSource = teamBlock!.source;
	} else if (
		snapshot &&
		validatePageBlockData('nosotros.team', snapshot.team).ok
	) {
		team = snapshot.team as TeamMember[];
	}

	return {
		// Intro, acrónimo, misión, visión y valores siguen viniendo del
		// .data.ts y no son editables desde el panel (D-14b).
		content: { ...staticAbout, history, team },
		historySource,
		teamSource,
	};
}

interface ResolveProjectsInput {
	block: ResolvedContent<unknown> | null;
	snapshot: unknown | null;
	staticProjects: Project[];
}

export interface ResolvedProjects {
	projects: Project[];
	source: ContentSource;
}

export function resolveProjects(input: ResolveProjectsInput): ResolvedProjects {
	const { block, snapshot, staticProjects } = input;

	const live = validBlockData(block, 'proyectos.list');
	if (live !== null) {
		return { projects: live as Project[], source: block!.source };
	}

	if (snapshot !== null && validatePageBlockData('proyectos.list', snapshot).ok) {
		return { projects: snapshot as Project[], source: 'static' };
	}

	return { projects: staticProjects, source: 'static' };
}
