export type ProjectStatus = 'activo' | 'finalizado' | 'planificado';

export interface Project {
	slug: string;
	name: string;
	description: string;
	status: ProjectStatus;
	link?: string;
}
