// Dominio puro (regla inquebrantable 3): sin imports de Astro/Supabase/
// Cloudinary. Traduce la config de entorno (leída por la capa Astro,
// nunca acá) en las URLs que usa la sección de Eventos.
//
// Luma sigue siendo la única fuente de verdad — este archivo no
// sincroniza ni copia datos de eventos, solo arma dos strings.

export interface LumaLinksConfig {
	/** Siempre presente: enlace directo al calendario público de Luma. */
	calendarUrl: string;
	/** Opcional: URL del embed (Calendar → Settings → Embed en Luma). */
	embedUrl?: string;
}

export interface LumaLinks {
	calendarUrl: string;
	/** null cuando no hay embed configurado — degrada a solo botón. */
	embedUrl: string | null;
}

export function buildLumaLinks(config: LumaLinksConfig): LumaLinks {
	return {
		calendarUrl: config.calendarUrl,
		embedUrl: config.embedUrl ? config.embedUrl : null,
	};
}
