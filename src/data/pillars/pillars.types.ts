import type { ImageMetadata } from 'astro';

export type PillarSlug =
	| 'desarrollo-profesional'
	| 'liderazgo'
	| 'excelencia-femenina'
	| 'desarrollo-del-capitulo'
	| 'excelencia-academica'
	| 'lead-academia';

export type PillarTone = 'primary' | 'secondary' | 'optional-1' | 'optional-2' | 'optional-3';

export interface PillarInitiative {
	title: string;
	description: string;
}

export interface PillarMoment {
	image: ImageMetadata;
	imageAlt: string;
}

export interface PillarTestimonial {
	quote: string;
	name: string;
	role: string;
}

export interface PillarMetric {
	value: string;
	label: string;
	context?: string;
}

export interface Pillar {
	slug: PillarSlug;
	name: string;
	shortDescription: string;
	intro: string;
	description: string;
	tone: PillarTone;
	image?: ImageMetadata;
	imageAlt?: string;
	imageIsTemporary?: boolean;
	initiatives: PillarInitiative[];
	moments?: PillarMoment[];
	testimonials?: PillarTestimonial[];
	metrics?: PillarMetric[];
}
