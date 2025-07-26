// @ts-check
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://iwoplaza.dev',
  base: 'react-nook',
  integrations: [
    starlight({
      title: 'React Nook',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/withastro/starlight',
        },
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Example Guide', slug: 'guides/example' },
          ],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
