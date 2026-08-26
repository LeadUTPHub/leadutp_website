import type { InternationalExperience } from './international.types';

const base = '/imagestest/internacional_leadutp';

export const internationalExperiences: InternationalExperience[] = [
	{
		slug: 'uruguay-waveuy',
		country: 'Uruguay',
		eventName: 'WaveUY',
		photos: [
			{
				src: `${base}/13_waveuy_uruguay_matthew/portada-1.webp`,
				alt: 'Delegación de LEAD UTP en WaveUY, Uruguay',
			},
			{
				src: `${base}/13_waveuy_uruguay_matthew/portada-2.webp`,
				alt: 'Delegación de LEAD UTP en WaveUY, Uruguay',
			},
			{
				src: `${base}/13_waveuy_uruguay_matthew/ejecutivos-1.webp`,
				alt: 'Encuentro con ejecutivos durante WaveUY, Uruguay',
			},
			{
				src: `${base}/13_waveuy_uruguay_matthew/networking-1.webp`,
				alt: 'Momento de networking durante WaveUY, Uruguay',
			},
		],
	},
	{
		slug: 'china-sias',
		country: 'China',
		eventName: 'SIAS',
		photos: [
			{
				src: `${base}/14_sias_china_Lizbeth/portada-1.webp`,
				alt: 'Delegación de LEAD UTP en SIAS, China',
			},
			{
				src: `${base}/14_sias_china_Lizbeth/portada-2.webp`,
				alt: 'Delegación de LEAD UTP en SIAS, China',
			},
			{
				src: `${base}/14_sias_china_Lizbeth/grupal-1.webp`,
				alt: 'Foto grupal de la delegación de LEAD UTP en SIAS, China',
			},
			{
				src: `${base}/14_sias_china_Lizbeth/grupal-2.webp`,
				alt: 'Foto grupal de la delegación de LEAD UTP en SIAS, China',
			},
		],
	},
	{
		slug: 'suiza-start-hack',
		country: 'Suiza',
		eventName: 'Start Hack',
		photos: [
			{
				src: `${base}/15_start_hack_suiza/grupal-1.webp`,
				alt: 'Foto grupal de la delegación de LEAD UTP en Start Hack, Suiza',
			},
			{
				src: `${base}/15_start_hack_suiza/grupal-2.webp`,
				alt: 'Foto grupal de la delegación de LEAD UTP en Start Hack, Suiza',
			},
			{
				src: `${base}/15_start_hack_suiza/grupal-3.webp`,
				alt: 'Foto grupal de la delegación de LEAD UTP en Start Hack, Suiza',
			},
			{
				src: `${base}/15_start_hack_suiza/coding-1.webp`,
				alt: 'Sesión de coding durante Start Hack, Suiza',
			},
			{
				src: `${base}/15_start_hack_suiza/ponencia-1.webp`,
				alt: 'Ponencia durante Start Hack, Suiza',
			},
		],
	},
	{
		slug: 'francia-raise-summit',
		country: 'Francia',
		eventName: 'Raise Summit Hackathon',
		photos: [
			{
				src: `${base}/17_raise_summit_hackaton_francia/portada-1.webp`,
				alt: 'Delegación de LEAD UTP en Raise Summit Hackathon, Francia',
			},
			{
				src: `${base}/17_raise_summit_hackaton_francia/portada-2.webp`,
				alt: 'Delegación de LEAD UTP en Raise Summit Hackathon, Francia',
			},
		],
	},
];
