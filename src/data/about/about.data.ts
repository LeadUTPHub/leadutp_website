import type { AboutContent } from './about.types';

// TODO(contenido real): la historia y la junta directiva siguen pendientes de
// confirmación por parte de la directiva de LEAD UTP. Mientras tanto se
// omiten (`history` sin definir, `team` vacío) y la página oculta esas
// secciones en vez de mostrar marcadores de contenido pendiente.
// Ver PENDIENTES.md, punto 2.
export const about: AboutContent = {
	intro:
		'Somos una comunidad de estudiantes apasionados por la tecnología y el liderazgo, comprometidos con el desarrollo profesional y personal de nuestros miembros.',
	acronym: [
		{ letter: 'L', word: 'Learn', translation: 'Aprender' },
		{ letter: 'E', word: 'Explore', translation: 'Explorar' },
		{ letter: 'A', word: 'Aspire', translation: 'Aspirar' },
		{ letter: 'D', word: 'Discover', translation: 'Descubrir' },
	],
	mission:
		'Impulsar el talento humano de los estudiantes de la UTP a través de programas de liderazgo, desarrollo profesional y excelencia académica, creando oportunidades que transformen sus vidas y contribuyan al progreso de la sociedad.',
	vision:
		'Ser la comunidad universitaria líder en el desarrollo integral de profesionales capaces de generar impacto positivo en la industria tecnológica y en la sociedad peruana.',
	values: [
		{
			icon: 'target',
			title: 'Liderazgo',
			description:
				'Fomentamos el desarrollo de habilidades de liderazgo en todos nuestros miembros.',
		},
		{
			icon: 'lightbulb',
			title: 'Innovación',
			description:
				'Impulsamos la creatividad y la búsqueda de soluciones innovadoras.',
		},
		{
			icon: 'users',
			title: 'Comunidad',
			description:
				'Creemos en el poder de la colaboración y el trabajo en equipo.',
		},
		{
			icon: 'star',
			title: 'Excelencia',
			description: 'Buscamos la mejora continua en todo lo que hacemos.',
		},
	],
	// history: pendiente de confirmación, ver el TODO arriba.
	team: [],
};
