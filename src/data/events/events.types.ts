import type { ImageMetadata } from 'astro';
import type { PillarSlug } from '../pillars';

export type EventBadgeTone = 'primary' | 'secondary' | 'optional';

export type EventStatus = 'cancelled' | 'postponed';

export interface Event {
	slug: string;
	category: string;
	badgeTone: EventBadgeTone;
	title: string;
	description?: string;
	date: string;
	startTime?: string;
	endTime?: string;
	location?: string;
	image?: ImageMetadata;
	imageAlt?: string;
	imageIsTemporary?: boolean;
	registrationUrl?: string;
	featured?: boolean;
	status?: EventStatus;
	pillarSlugs?: PillarSlug[];
}

export interface EventMonthGroup {
	key: string;
	label: string;
	events: Event[];
}
