import discoveryDayDinamica from '../../assets/home/discovery-day-dinamica.webp';
import galaGrupal from '../../assets/home/gala-grupal.webp';
import presentacionGrupal from '../../assets/home/presentacion-grupal.webp';
import type {
	HomeAlliance,
	HomeCommunityMoment,
	HomeMedia,
} from './home.types';

// TODO: Reemplazar este marco por una fotografía real del hero.
export const homeHeroMedia = {} satisfies HomeMedia;

export const homeCommunityMoments = [
	{
		id: 'voluntariado',
		media: {
			image: galaGrupal,
			alt: 'Comunidad LEAD UTP en LEAD Gala',
		},
	},
	{
		id: 'actividades',
		media: {
			image: discoveryDayDinamica,
			alt: 'Dinámica durante Discovery Day 2025',
		},
	},
	{
		id: 'comunidad',
		media: {
			image: presentacionGrupal,
			alt: 'Comunidad LEAD UTP durante su evento de presentación',
		},
	},
] satisfies HomeCommunityMoment[];

// TODO: Incorporar los logos oficiales, textos alternativos y URLs cuando sean confirmados.
export const homeAlliances = [{ name: 'Globant' }] satisfies HomeAlliance[];
