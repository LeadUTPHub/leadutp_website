import type { Opening } from './openings.types';

// TODO(contenido real): reemplazar por la convocatoria real (rol,
// requisitos, fecha límite y link de postulación). Si no hay ninguna
// convocatoria abierta, dejar este array vacío. Ver PENDIENTES.md, punto 1.
export const openings: Opening[] = [
	{
		slug: 'convocatoria-pendiente',
		role: '[Rol pendiente]',
		requirements: [
			'[Requisito pendiente]',
			'[Requisito pendiente]',
			'[Requisito pendiente]',
		],
		deadline: '[Fecha límite pendiente]',
		applyUrl: '#',
	},
];
