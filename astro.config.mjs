// @ts-check
import { env } from 'node:process';
import { defineConfig, fontProviders } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: env.SITE_URL ?? 'http://localhost:4321',
  base: env.BASE_PATH ?? '/',
  trailingSlash: 'always',
  output: 'static',

  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Geist',
      cssVariable: '--font-geist',
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Arial', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],

  integrations: [sitemap({ filter: (page) => !page.includes('/404'), lastmod: new Date() })],

  build: { inlineStylesheets: 'always' },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@duckdb/duckdb-wasm'],
    },
    worker: {
      format: 'es',
    },
  },
});
