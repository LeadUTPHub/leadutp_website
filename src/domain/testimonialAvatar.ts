/**
 * Iniciales y color de avatar para testimonios (dominio puro).
 *
 * Regla inquebrantable 3 (AGENTS.md): sin imports externos, DOM ni
 * aleatoriedad. `colorIndex` es determinístico para que el mismo nombre
 * produzca siempre el mismo color entre builds y renders.
 */

export interface InitialsAvatar {
	initials: string;
	colorIndex: number;
}

/** Nombre vacío o solo espacios: iniciales "?" y colorIndex 0 (sin lanzar). */
const EMPTY_NAME_AVATAR: InitialsAvatar = {
	initials: '?',
	colorIndex: 0,
};

function firstInitial(word: string): string {
	const trimmed = word.trim();
	if (trimmed.length === 0) return '';
	const first = trimmed.codePointAt(0);
	if (first === undefined) return '';
	return String.fromCodePoint(first).toLocaleUpperCase('es-PE');
}

function initialsFromWords(words: string[]): string {
	if (words.length === 0) return EMPTY_NAME_AVATAR.initials;
	if (words.length === 1) return firstInitial(words[0]!);
	if (words.length === 2) {
		return firstInitial(words[0]!) + firstInitial(words[1]!);
	}
	return firstInitial(words[0]!) + firstInitial(words[words.length - 1]!);
}

/** Suma de códigos UTF-16 de cada carácter, módulo 6 → paleta fija 0–5. */
function colorIndexFromName(name: string): number {
	let sum = 0;
	for (let i = 0; i < name.length; i++) {
		sum += name.charCodeAt(i);
	}
	return sum % 6;
}

/**
 * Deriva iniciales y un índice de color estable a partir del nombre completo.
 *
 * - Dos palabras (p. ej. nombre + apellido): primera letra de cada una → "CG".
 * - Una palabra: una sola inicial → "A".
 * - Tres o más palabras: primera y última palabra → "MT".
 * - Tildes y ñ se conservan al extraer la inicial (locale es-PE al mayúscular).
 * - `fullName` vacío o solo espacios: `{ initials: "?", colorIndex: 0 }`.
 */
export function getInitialsAvatar(fullName: string): InitialsAvatar {
	const normalized = fullName.trim();
	if (normalized.length === 0) {
		return { ...EMPTY_NAME_AVATAR };
	}

	const words = normalized.split(/\s+/).filter((part) => part.length > 0);
	const initials = initialsFromWords(words);
	const colorIndex = colorIndexFromName(normalized);

	return {
		initials: initials.length > 0 ? initials : EMPTY_NAME_AVATAR.initials,
		colorIndex,
	};
}
