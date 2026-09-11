import { describe, expect, it } from 'vitest';
import { buildLumaLinks } from './lumaLinks';

describe('buildLumaLinks', () => {
	it('devuelve embedUrl: null cuando falta en la config', () => {
		const links = buildLumaLinks({ calendarUrl: 'https://luma.com/leadutp_' });

		expect(links).toEqual({
			calendarUrl: 'https://luma.com/leadutp_',
			embedUrl: null,
		});
	});

	it('devuelve ambas URLs cuando las dos están configuradas', () => {
		const links = buildLumaLinks({
			calendarUrl: 'https://luma.com/leadutp_',
			embedUrl: 'https://luma.com/embed/calendar/leadutp_/events',
		});

		expect(links).toEqual({
			calendarUrl: 'https://luma.com/leadutp_',
			embedUrl: 'https://luma.com/embed/calendar/leadutp_/events',
		});
	});

	it('trata un embedUrl vacío igual que ausente (sin iframe)', () => {
		const links = buildLumaLinks({
			calendarUrl: 'https://luma.com/leadutp_',
			embedUrl: '',
		});

		expect(links.embedUrl).toBeNull();
	});
});
