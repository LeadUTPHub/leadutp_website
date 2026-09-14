import type { TeamMember } from '../../data/about';
import type { Project } from '../../data/projects';

/**
 * Resultado de intentar leer, en este momento, una key de `page_blocks` en
 * vivo — lo usa el script `prebuild` (T5.5), no el build en sí (eso es
 * `safeResolve()` en `loadPageContent.ts`, que ya tiene su propia
 * degradación a `null`).
 *
 *   { ok: false }             Supabase no respondió (red, config, o la
 *                             fila tenía una forma inválida — el script es
 *                             quien la valida antes de armar esto). No hay
 *                             info confiable para esta key: se preserva lo
 *                             que ya había en el snapshot, tal cual.
 *   { ok: true, value: null } Supabase respondió, pero no hay una fila
 *                             publicada (nunca se creó, o está en
 *                             borrador). El snapshot para esta key se
 *                             limpia — ya no representa la verdad actual
 *                             (D-14c: despublicar algo en vivo lo saca del
 *                             sitio en el próximo build; el snapshot no
 *                             debería quedar "más publicado" que la fuente
 *                             real).
 *   { ok: true, value: T }    Hay una fila publicada y válida: se vuelve
 *                             el nuevo valor persistido.
 *
 * Puro y sin I/O a propósito, mismo patrón que `resolvePageContent.ts`: el
 * script hace el fetch/lectura de disco/escritura; este archivo solo
 * decide qué le corresponde a cada snapshot.
 */
export type FetchOutcome<T> = { ok: true; value: T | null } | { ok: false };

/** `undefined` de salida = "no persistir esta key" (a diferencia de `null`
 * de entrada en `FetchOutcome`, que es "confirmado sin publicar"). */
function resolveField<T>(current: T | undefined, fetch: FetchOutcome<T>): T | undefined {
	if (!fetch.ok) return current;
	return fetch.value ?? undefined;
}

export interface AboutSnapshotContent {
	history?: string;
	team?: TeamMember[];
}

export interface BuildAboutSnapshotInput {
	current: AboutSnapshotContent | null;
	history: FetchOutcome<string>;
	team: FetchOutcome<TeamMember[]>;
}

/**
 * `null` de salida = no queda nada que persistir — el script debe borrar
 * `about.fallback.json` si existía, no escribir un `{}` vacío.
 */
export function buildAboutSnapshot(
	input: BuildAboutSnapshotInput,
): AboutSnapshotContent | null {
	const history = resolveField(input.current?.history, input.history);
	const team = resolveField(input.current?.team, input.team);
	if (history === undefined && team === undefined) return null;
	return { history, team };
}

/** Mismo contrato que `buildAboutSnapshot`, para `projects.fallback.json`
 * (un único valor por archivo en vez de dos campos combinados). */
export function buildProjectsSnapshot(
	current: Project[] | null,
	fetch: FetchOutcome<Project[]>,
): Project[] | null {
	return resolveField(current ?? undefined, fetch) ?? null;
}
