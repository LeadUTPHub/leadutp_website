import { about } from '../../data/about';
import { projects } from '../../data/projects';
import type { ResolvedContent } from '../../domain/ports/ContentRepository';
import { getContentRepository } from '../container';
import type { AboutSnapshot, ResolvedAbout, ResolvedProjects } from './resolvePageContent';
import { resolveAbout, resolveProjects } from './resolvePageContent';

/**
 * Glue de I/O de la cadena de degradación (T5.4). La política de qué
 * fuente gana vive en resolvePageContent.ts, que es puro y testeado —
 * acá solo se buscan las fuentes.
 *
 * Los snapshots se leen con `import.meta.glob` y no con `node:fs` ni un
 * `import` directo a propósito: el glob devuelve `{}` si el archivo no
 * existe, en vez de romper el build. Hoy esos archivos todavía no existen
 * (los genera el script `prebuild` de T5.5) y el build tiene que pasar
 * igual — de hecho ese es justamente el caso que la cadena debe soportar.
 */
const snapshotModules = import.meta.glob<unknown>(
	'../../data/**/*.fallback.json',
	{ eager: true, import: 'default' },
);

function readSnapshot<T>(fileName: string): T | null {
	const entry = Object.entries(snapshotModules).find(([path]) =>
		path.endsWith(`/${fileName}`),
	);
	return entry ? (entry[1] as T) : null;
}

/**
 * Lectura en vivo, tolerante a fallos: si Supabase no responde, está mal
 * configurado o la RLS no deja leer, devuelve `null` y la cadena sigue al
 * snapshot. El build NUNCA puede romperse por esto (regla inquebrantable
 * 4 + D-02).
 */
async function safeResolve(key: string): Promise<ResolvedContent<unknown> | null> {
	try {
		return await getContentRepository().resolve<unknown>(key);
	} catch {
		return null;
	}
}

export async function loadAboutContent(): Promise<ResolvedAbout> {
	const [historyBlock, teamBlock] = await Promise.all([
		safeResolve('nosotros.history'),
		safeResolve('nosotros.team'),
	]);

	return resolveAbout({
		historyBlock,
		teamBlock,
		snapshot: readSnapshot<AboutSnapshot>('about.fallback.json'),
		staticAbout: about,
	});
}

export async function loadProjects(): Promise<ResolvedProjects> {
	return resolveProjects({
		block: await safeResolve('proyectos.list'),
		snapshot: readSnapshot<unknown>('projects.fallback.json'),
		staticProjects: projects,
	});
}
