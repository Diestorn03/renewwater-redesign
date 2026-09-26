import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages project site: SITE_URL=https://<user>.github.io  PAGES_BASE=/<repo>
// Final domain: leave both unset (site defaults to renewwaterus.com, base to "/").
const site = process.env.SITE_URL || 'https://renewwaterus.com';
const base = process.env.PAGES_BASE || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [sitemap({ i18n: { defaultLocale: 'es', locales: { es: 'es-US', en: 'en-US' } } })],
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
});
