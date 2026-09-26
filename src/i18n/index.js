import es from './es.js';
import en from './en.js';
import originalEs from './original.es.js';
import originalEn from './original.en.js';
import { routes, translatePath } from './routes.js';

export const dictionaries = { es, en };
const originals = { es: originalEs, en: originalEn };
export const locales = Object.keys(dictionaries);
// '' on a root deploy, '/renewwater-redesign' on GitHub Pages project sites
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Per-request helpers. Usage in any .astro file:
 *   const { t, o, lang, url, productUrl, asset, alt } = useI18n(Astro);
 *   t  → redesign copy shared by all pages (es.js / en.js)
 *   o  → verbatim copy of renewwaterus.com (original.*.js): o.home.heroTitle, o.aboutUs.missionText …
 *   url('about', '#historia') → '/<base>/sobre-nosotros/#historia' (or the /en/ route)
 *   productUrl('renew-city')  → '/<base>/productos/renew-city/'
 *   asset('/img/home/family.webp') → base-prefixed public file
 *   alt → { lang, href } of this page in the other language
 */
export function useI18n(Astro) {
  const lang = Astro.currentLocale === 'en' ? 'en' : 'es';
  const t = dictionaries[lang];
  const o = originals[lang];
  const url = (key, hash = '') => `${base}${routes[key][lang]}${hash}`;
  const productUrl = (slug) => `${base}${routes.products[lang]}${slug}/`;
  const asset = (p) => `${base}${p}`;
  const pathname = Astro.url.pathname;
  const path = base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname; // base-less
  const other = lang === 'es' ? 'en' : 'es';
  const alt = { lang: other, href: `${base}${translatePath(path, other)}` };
  const hreflang = { es: `${base}${translatePath(path, 'es')}`, en: `${base}${translatePath(path, 'en')}` };
  return { t, o, lang, url, productUrl, asset, alt, hreflang, path, base };
}

/** Pick the current language from a `{ es, en }` pair (area copy files in src/i18n/areas/). */
export const pick = (pair, lang) => pair[lang] ?? pair.es;
