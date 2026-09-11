import type { Opening } from './openings.types';

// Contenido tomado directamente del propio Google Form (título, descripción
// y requisitos), no inventado. El form no declara una fecha límite, por eso
// `deadline` queda sin definir. Si se cierra o se reemplaza por una nueva
// convocatoria, actualizar (o vaciar) este array — ver PENDIENTES.md.
export const openings: Opening[] = [
	{
		slug: 'voluntariado-2026-2',
		role: 'Convocatoria de Voluntarios 2026 - 2',
		summary:
			'Súmate a la comunidad de LEAD UTP: talleres, mentorías, retos de innovación y proyectos reales para fortalecer tus habilidades técnicas y blandas, con enfoque en áreas STEM.',
		requirements: [
			'Ser estudiante de la UTP',
			'Contar con al menos 4 horas disponibles por semana',
			'Tener interés en el voluntariado',
			'Permanecer mínimo 6 meses (se otorga certificado de voluntariado)',
		],
		applyUrl:
			'https://docs.google.com/forms/d/e/1FAIpQLSc91KaZiij-rWGvr1pAdK03lPyaoYNWZlqIt2DJZoeS2WZbWg/viewform',
		embedForm: true,
	},
];
