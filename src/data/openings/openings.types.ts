export interface Opening {
	slug: string;
	role: string;
	/** Bajada corta antes de los requisitos (opcional). */
	summary?: string;
	requirements: string[];
	/** Opcional: algunas convocatorias quedan abiertas sin fecha límite fija. */
	deadline?: string;
	applyUrl: string;
	/**
	 * Cuando es `true`, el formulario de `applyUrl` (debe ser un Google Form)
	 * se embebe como iframe directamente en la página, además del link para
	 * abrirlo en una pestaña nueva.
	 */
	embedForm?: boolean;
}
