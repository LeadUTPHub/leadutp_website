import logoAeditip from '../../assets/alliances/logo-aeditip.png';
import logoConeii from '../../assets/alliances/logo-coneii.png';
import logoCvMatcher from '../../assets/alliances/logo-cv-matcher.png';
import logoDscUtp from '../../assets/alliances/logo-dsc-utp.png';
import logoFaceToFace from '../../assets/alliances/logo-face-to-face.png';
import logoIbmZ from '../../assets/alliances/logo-ibm-z.png';
import logoLevoLearning from '../../assets/alliances/logo-levo-learning.png';
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

// TODO: Confirmar nombres oficiales y URLs de cada alianza.
export const homeAlliances = [
	{ name: 'IBM Z', logo: logoIbmZ, logoAlt: 'IBM Z' },
	{ name: 'CONEII', logo: logoConeii, logoAlt: 'CONEII' },
	{ name: 'AEDITIP', logo: logoAeditip, logoAlt: 'AEDITIP' },
	{ name: 'CV Matcher', logo: logoCvMatcher, logoAlt: 'CV Matcher' },
	{ name: 'Face to Face', logo: logoFaceToFace, logoAlt: 'Face to Face' },
	{ name: 'Levo Learning', logo: logoLevoLearning, logoAlt: 'Levo Learning' },
	{ name: 'DSC UTP', logo: logoDscUtp, logoAlt: 'DSC UTP' },
] satisfies HomeAlliance[];
