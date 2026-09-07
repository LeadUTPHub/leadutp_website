import type { ImageMetadata } from 'astro';

export type HomeMedia =
	| {
			image: ImageMetadata;
			alt: string;
			imageIsTemporary?: boolean;
	  }
	| {
			image?: undefined;
			alt?: undefined;
			imageIsTemporary?: undefined;
	  };

export interface HomeCommunityMoment {
	id: string;
	media: HomeMedia;
}

export interface HomeHeroSlide {
	/** Ruta pública de la imagen (carpeta /public). */
	src: string;
	alt: string;
}

interface HomeAllianceBase {
	name: string;
	href?: string;
}

export type HomeAlliance = HomeAllianceBase &
	(
		| {
				logo: ImageMetadata;
				logoAlt: string;
				logoIsTemporary?: boolean;
		  }
		| {
				logo?: undefined;
				logoAlt?: undefined;
				logoIsTemporary?: undefined;
		  }
	);
