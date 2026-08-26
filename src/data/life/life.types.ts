export interface LifePhoto {
	src: string;
	alt: string;
}

export interface LifeEvent {
	slug: string;
	year: string;
	eventName: string;
	photos: LifePhoto[];
}
