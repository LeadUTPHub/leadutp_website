import type { Event, EventMonthGroup } from './events.types';
import type { PillarSlug } from '../pillars';

export const EVENT_TIME_ZONE = 'America/Lima';
const EVENT_TIME_OFFSET = '-05:00';
const END_OF_DAY = '23:59:59.999';

const createUtcDate = (date: string) => new Date(`${date}T00:00:00Z`);

const fullDateFormatter = new Intl.DateTimeFormat('es-PE', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC',
});

const monthFormatter = new Intl.DateTimeFormat('es-PE', {
	month: 'long',
	timeZone: 'UTC',
});

const shortMonthFormatter = new Intl.DateTimeFormat('es-PE', {
	month: 'short',
	timeZone: 'UTC',
});

const normalizeTime = (time: string) => time.length === 5 ? `${time}:00` : time;

const createLimaInstant = (date: string, time: string) => (
	new Date(`${date}T${normalizeTime(time)}${EVENT_TIME_OFFSET}`)
);

const getEventStartInstant = (event: Event) => (
	createLimaInstant(event.date, event.startTime ?? '00:00:00')
);

export const getEventEndInstant = (event: Event) => (
	createLimaInstant(event.date, event.endTime ?? END_OF_DAY)
);

export const hasEventEnded = (event: Event, now = new Date()) => (
	now.getTime() > getEventEndInstant(event).getTime()
);

export const getFeaturedEvent = (source: Event[]) => (
	source.find((event) => event.featured && event.status !== 'cancelled')
);

export const getUpcomingEvents = (source: Event[], now = new Date()) => (
	source
		.filter((event) => !hasEventEnded(event, now))
		.toSorted((first, second) => getEventStartInstant(first).getTime() - getEventStartInstant(second).getTime())
);

export const getPastEvents = (source: Event[], now = new Date()) => (
	source
		.filter((event) => hasEventEnded(event, now))
		.toSorted((first, second) => getEventEndInstant(second).getTime() - getEventEndInstant(first).getTime())
);

export const getEventsByPillar = (source: Event[], pillarSlug: PillarSlug) => (
	source.filter((event) => event.pillarSlugs?.includes(pillarSlug))
);

export const canRegisterForEvent = (event: Event, now = new Date()) => (
	Boolean(event.registrationUrl)
	&& event.status !== 'cancelled'
	&& !hasEventEnded(event, now)
);

export const formatEventDate = (date: string) => fullDateFormatter.format(createUtcDate(date));

export const formatEventTimeRange = (event: Event) => {
	if (!event.startTime) return null;
	if (!event.endTime) return event.startTime;

	return `${event.startTime} – ${event.endTime}`;
};

export const getEventStatusLabel = (event: Event) => {
	if (event.status === 'cancelled') return 'Cancelado';
	if (event.status === 'postponed') return 'Reprogramado';

	return null;
};

export const getEventDateParts = (date: string) => {
	const parsedDate = createUtcDate(date);

	return {
		day: String(parsedDate.getUTCDate()).padStart(2, '0'),
		monthShort: shortMonthFormatter.format(parsedDate).replace('.', '').toUpperCase(),
		monthKey: date.slice(0, 7),
		monthLabel: monthFormatter.format(parsedDate).toUpperCase(),
	};
};

export const groupEventsByMonth = (source: Event[]): EventMonthGroup[] => (
	source
		.toSorted((first, second) => getEventStartInstant(first).getTime() - getEventStartInstant(second).getTime())
		.reduce<EventMonthGroup[]>((groups, event) => {
			const { monthKey, monthLabel } = getEventDateParts(event.date);
			const currentGroup = groups.at(-1);

			if (currentGroup?.key === monthKey) {
				currentGroup.events.push(event);
			} else {
				groups.push({ key: monthKey, label: monthLabel, events: [event] });
			}

			return groups;
		}, [])
);
