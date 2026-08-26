import { describe, expect, it } from 'vitest';
import type { Event } from './events.types';
import {
	canRegisterForEvent,
	formatEventDate,
	formatEventTimeRange,
	getEventDateParts,
	getEventStatusLabel,
	getEventsByPillar,
	getFeaturedEvent,
	getPastEvents,
	getUpcomingEvents,
	groupEventsByMonth,
	hasEventEnded,
} from './events.utils';

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
	slug: 'evento',
	category: 'Categoría',
	badgeTone: 'primary',
	title: 'Evento',
	date: '2026-06-15',
	...overrides,
});

describe('hasEventEnded', () => {
	it('is false before the event end time (Lima, UTC-05:00)', () => {
		const event = makeEvent({ date: '2026-06-15', endTime: '20:00' });
		const now = new Date('2026-06-16T00:59:59Z');

		expect(hasEventEnded(event, now)).toBe(false);
	});

	it('is true after the event end time (Lima, UTC-05:00)', () => {
		const event = makeEvent({ date: '2026-06-15', endTime: '20:00' });
		const now = new Date('2026-06-16T01:00:01Z');

		expect(hasEventEnded(event, now)).toBe(true);
	});

	it('defaults to end of day when endTime is missing', () => {
		const event = makeEvent({ date: '2026-06-15' });
		const beforeMidnight = new Date('2026-06-16T04:59:00Z');
		const afterMidnight = new Date('2026-06-16T05:00:01Z');

		expect(hasEventEnded(event, beforeMidnight)).toBe(false);
		expect(hasEventEnded(event, afterMidnight)).toBe(true);
	});
});

describe('getFeaturedEvent', () => {
	it('returns the featured, non-cancelled event', () => {
		const featured = makeEvent({ slug: 'featured', featured: true });
		const events = [makeEvent({ slug: 'other' }), featured];

		expect(getFeaturedEvent(events)).toBe(featured);
	});

	it('ignores a featured event that was cancelled', () => {
		const events = [
			makeEvent({ slug: 'cancelled', featured: true, status: 'cancelled' }),
		];

		expect(getFeaturedEvent(events)).toBeUndefined();
	});

	it('returns undefined when no event is featured', () => {
		expect(getFeaturedEvent([makeEvent()])).toBeUndefined();
	});
});

describe('getUpcomingEvents / getPastEvents', () => {
	const now = new Date('2026-06-15T12:00:00Z');
	const past = makeEvent({
		slug: 'past',
		date: '2026-06-01',
		endTime: '10:00',
	});
	const soon = makeEvent({
		slug: 'soon',
		date: '2026-06-20',
		startTime: '10:00',
	});
	const later = makeEvent({
		slug: 'later',
		date: '2026-06-25',
		startTime: '10:00',
	});

	it('getUpcomingEvents excludes ended events and sorts by start date ascending', () => {
		expect(
			getUpcomingEvents([later, past, soon], now).map((e) => e.slug),
		).toEqual(['soon', 'later']);
	});

	it('getPastEvents excludes upcoming events and sorts by end date descending', () => {
		const anotherPast = makeEvent({
			slug: 'earlier-past',
			date: '2026-05-01',
			endTime: '10:00',
		});

		expect(
			getPastEvents([past, soon, anotherPast], now).map((e) => e.slug),
		).toEqual(['past', 'earlier-past']);
	});
});

describe('getEventsByPillar', () => {
	it('filters events that include the given pillar slug', () => {
		const matching = makeEvent({
			slug: 'matching',
			pillarSlugs: ['liderazgo'],
		});
		const other = makeEvent({
			slug: 'other',
			pillarSlugs: ['excelencia-academica'],
		});
		const none = makeEvent({ slug: 'none' });

		expect(
			getEventsByPillar([matching, other, none], 'liderazgo').map(
				(e) => e.slug,
			),
		).toEqual(['matching']);
	});
});

describe('canRegisterForEvent', () => {
	const now = new Date('2026-06-15T12:00:00Z');

	it('is true with a registration url, not cancelled, and not ended', () => {
		const event = makeEvent({
			date: '2026-06-20',
			registrationUrl: 'https://example.com',
		});

		expect(canRegisterForEvent(event, now)).toBe(true);
	});

	it('is false without a registration url', () => {
		const event = makeEvent({ date: '2026-06-20' });

		expect(canRegisterForEvent(event, now)).toBe(false);
	});

	it('is false when cancelled', () => {
		const event = makeEvent({
			date: '2026-06-20',
			registrationUrl: 'https://example.com',
			status: 'cancelled',
		});

		expect(canRegisterForEvent(event, now)).toBe(false);
	});

	it('is false when the event already ended', () => {
		const event = makeEvent({
			date: '2026-06-01',
			endTime: '10:00',
			registrationUrl: 'https://example.com',
		});

		expect(canRegisterForEvent(event, now)).toBe(false);
	});
});

describe('formatEventDate', () => {
	it('formats the date in Spanish, long form', () => {
		expect(formatEventDate('2026-06-15')).toBe('15 de junio de 2026');
	});
});

describe('formatEventTimeRange', () => {
	it('returns null without a start time', () => {
		expect(formatEventTimeRange(makeEvent())).toBeNull();
	});

	it('returns just the start time without an end time', () => {
		expect(formatEventTimeRange(makeEvent({ startTime: '18:00' }))).toBe(
			'18:00',
		);
	});

	it('returns a range with both start and end time', () => {
		expect(
			formatEventTimeRange(makeEvent({ startTime: '18:00', endTime: '20:00' })),
		).toBe('18:00 – 20:00');
	});
});

describe('getEventStatusLabel', () => {
	it('labels a cancelled event', () => {
		expect(getEventStatusLabel(makeEvent({ status: 'cancelled' }))).toBe(
			'Cancelado',
		);
	});

	it('labels a postponed event', () => {
		expect(getEventStatusLabel(makeEvent({ status: 'postponed' }))).toBe(
			'Reprogramado',
		);
	});

	it('returns null without a status', () => {
		expect(getEventStatusLabel(makeEvent())).toBeNull();
	});
});

describe('getEventDateParts', () => {
	it('extracts day, short/long month, and month key', () => {
		expect(getEventDateParts('2026-06-05')).toEqual({
			day: '05',
			monthShort: 'JUN',
			monthKey: '2026-06',
			monthLabel: 'JUNIO',
		});
	});
});

describe('groupEventsByMonth', () => {
	it('groups consecutive events by month, sorted by start date', () => {
		const juneEarly = makeEvent({ slug: 'june-early', date: '2026-06-05' });
		const juneLate = makeEvent({ slug: 'june-late', date: '2026-06-20' });
		const july = makeEvent({ slug: 'july', date: '2026-07-01' });

		const groups = groupEventsByMonth([july, juneLate, juneEarly]);

		expect(groups.map((g) => g.key)).toEqual(['2026-06', '2026-07']);
		expect(groups[0].events.map((e) => e.slug)).toEqual([
			'june-early',
			'june-late',
		]);
		expect(groups[1].events.map((e) => e.slug)).toEqual(['july']);
	});
});
