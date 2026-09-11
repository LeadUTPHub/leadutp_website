/// <reference types="astro/client" />

interface ImportMetaEnv {
	// Supabase — nomenclatura nueva de API keys (ver TECH_STACK.md, MEMORY.md D-04)
	readonly PUBLIC_SUPABASE_URL: string;
	readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
	/** Solo servidor — nunca debe llegar al cliente. */
	readonly SUPABASE_SECRET_KEY: string;

	// Cloudinary
	readonly PUBLIC_CLOUDINARY_CLOUD_NAME: string;
	/** Solo servidor — usada para firmar uploads. */
	readonly CLOUDINARY_API_KEY: string;
	/** Solo servidor — nunca debe llegar al cliente. */
	readonly CLOUDINARY_API_SECRET: string;

	// Luma (Sprint 1) — opcional hasta que exista el snippet de embed
	readonly PUBLIC_LUMA_CALENDAR_URL: string;
	readonly PUBLIC_LUMA_EMBED_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare namespace App {
	// Poblado por src/middleware.ts (Sprint 2) solo bajo /administrator/**
	// con sesión válida; null en el resto de los casos.
	interface Locals {
		profile: import('./domain/types').Profile | null;
	}
}
