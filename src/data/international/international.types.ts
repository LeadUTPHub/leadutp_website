export interface InternationalPhoto {
	src: string;
	alt: string;
}

export interface InternationalExperience {
	slug: string;
	country: string;
	/** Emoji de la bandera del país, p. ej. "🇺🇾". */
	flag: string;
	/** Continente donde se realizó el evento, p. ej. "Europa". */
	continent: string;
	eventName: string;
	photos: InternationalPhoto[];
}
