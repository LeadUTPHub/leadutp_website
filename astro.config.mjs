// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
	site: 'https://leadutp.vercel.app',
	output: 'static',
	adapter: vercel(),
	integrations: [
		sitemap({ filter: (page) => !page.includes('/administrator') }),
		icon(),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
