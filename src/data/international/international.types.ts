export interface InternationalPhoto {
	src: string;
	alt: string;
}

export interface InternationalExperience {
	slug: string;
	country: string;
	eventName: string;
	photos: InternationalPhoto[];
}
