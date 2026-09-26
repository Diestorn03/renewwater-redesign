// Page slugs per language. Spanish is the default locale (no prefix), English lives under /en/.
export const routes = {
  home: { es: '/', en: '/en/' },
  about: { es: '/sobre-nosotros/', en: '/en/about-us/' },
  products: { es: '/productos/', en: '/en/products/' },
  join: { es: '/unete/', en: '/en/join-us/' },
  contact: { es: '/contacto/', en: '/en/contact/' },
  analysis: { es: '/analisis/', en: '/en/analysis/' },
};

/** Route key + optional product slug for a base-less pathname, e.g. '/en/products/astrid/' → { key: 'products', slug: 'astrid' } */
export function matchRoute(pathname) {
  const p = pathname.endsWith('/') ? pathname : `${pathname}/`;
  for (const [key, r] of Object.entries(routes)) {
    for (const lang of ['es', 'en']) {
      if (p === r[lang]) return { key, lang };
      if (key === 'products' && p.startsWith(r[lang]) && p.length > r[lang].length) {
        return { key, lang, slug: p.slice(r[lang].length).replace(/\/$/, '') };
      }
    }
  }
  return null;
}

/** Same page in the other language (base-less). Falls back to the other language's home. */
export function translatePath(pathname, to) {
  const m = matchRoute(pathname);
  if (!m) return routes.home[to];
  return routes[m.key][to] + (m.slug ? `${m.slug}/` : '');
}
