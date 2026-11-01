import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://sarkariphotoresizer.com',
  output: 'static',
  integrations: [
    tailwind(),
    react()
  ],
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto'
  }
});
