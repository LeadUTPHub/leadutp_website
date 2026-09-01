export interface TeamMember {
	name: string;
	role: string;
}

export interface AcronymEntry {
	/** Letra del acrónimo, p. ej. "L". */
	letter: string;
	/** Palabra en inglés que representa la letra, p. ej. "Learn". */
	word: string;
	/** Traducción al español, p. ej. "Aprender". */
	translation: string;
}

/** Nombre del icono de lucide que acompaña al valor. */
export type AboutValueIcon = 'target' | 'lightbulb' | 'users' | 'star';

export interface AboutValue {
	icon: AboutValueIcon;
	title: string;
	description: string;
}

export interface AboutContent {
	/** Párrafo introductorio del hero. */
	intro: string;
	/** Significado de cada letra de LEAD. */
	acronym: AcronymEntry[];
	mission: string;
	vision: string;
	/** Valores que guían a la comunidad. */
	values: AboutValue[];
	history: string;
	team: TeamMember[];
}
