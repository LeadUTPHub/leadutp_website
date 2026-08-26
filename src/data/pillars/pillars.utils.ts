import type { Pillar, PillarSlug } from './pillars.types';

export const getPillarBySlug = (source: Pillar[], slug: string) =>
	source.find((pillar) => pillar.slug === slug);

export const getOtherPillars = (
	source: Pillar[],
	currentSlug: PillarSlug,
	limit = 3,
) => {
	const currentIndex = source.findIndex(
		(pillar) => pillar.slug === currentSlug,
	);
	const availableCount = Math.min(limit, Math.max(0, source.length - 1));

	if (currentIndex < 0) return source.slice(0, availableCount);

	return Array.from(
		{ length: availableCount },
		(_, index) => source[(currentIndex + index + 1) % source.length],
	);
};
