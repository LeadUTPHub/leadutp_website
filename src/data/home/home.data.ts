import type {
	HomeAlliance,
	HomeCommunityMoment,
	HomeMedia,
} from './home.types';

// TODO: Reemplazar estos marcos por fotografías reales de integrantes y actividades de LEAD UTP.
export const homeHeroMedia = {} satisfies HomeMedia;

export const homeCommunityMoments = [
	{ id: 'voluntariado', media: {} },
	{ id: 'actividades', media: {} },
	{ id: 'comunidad', media: {} },
] satisfies HomeCommunityMoment[];

// TODO: Incorporar los logos oficiales, textos alternativos y URLs cuando sean confirmados.
export const homeAlliances = [{ name: 'Globant' }] satisfies HomeAlliance[];
