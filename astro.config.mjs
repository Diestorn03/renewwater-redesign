import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages project site: SITE_URL=https://<user>.github.io  PAGES_BASE=/<repo>
// Final domain: leave both unset (site defaults to renewwaterus.com, base to "/").
const site = process.env.SITE_URL || 'https://renewwaterus.com';
const base = process.env.PAGES_BASE || '/';

/*
  Motion policy: the site animates for everyone, whatever the OS "reduce motion" setting says; visitors opt out with
  the footer switch, which sets html.rw-calm (Base.astro, src/scripts/chrome.js). Components keep writing standard
  CSS and this build step rewrites it:
    @media (prefers-reduced-motion: reduce)                    { .x {} }  →  :where(html.rw-calm) .x {}
    @media (min-width: 768px) and (prefers-reduced-motion: no-preference) { .x {} }  →  @media (min-width: 768px) { :where(html:not(.rw-calm)) .x {} }
  :where() adds no specificity, so the cascade order the components were written for is unchanged.
*/
// matches " and (prefers-reduced-motion: x)" or "(prefers-reduced-motion: x) and "; the bare "(prefers-reduced-motion)" means reduce
const MOTION = /\s*\band\s*\(\s*prefers-reduced-motion\s*(?::\s*([\w-]+)\s*)?\)|\(\s*prefers-reduced-motion\s*(?::\s*([\w-]+)\s*)?\)\s*(?:and\b\s*)?/;
function motionToClass() {
  // This runs before Astro scopes component styles, so in .astro files the html part is wrapped in :global()
  // (otherwise Astro would add its data-astro-cid attribute to <html> and the rule would never match).
  const scope = (sel, cond, astro) => {
    const g = (s) => (astro ? `:global(${s})` : s);
    // .js lives on <html> itself (Base.astro), so it takes the condition like html does, never as an ancestor
    if (/^:global\((html|:root|\.js)(?![\w-])/.test(sel)) return sel.replace(/^:global\((html|:root|\.js)/, `:global($1:where(${cond})`);
    if (/^(html|:root|\.js)(?![\w-])/.test(sel)) return sel.replace(/^(html|:root|\.js)/, `$1:where(${cond})`);
    if (sel.startsWith('::')) return `${g(`html:where(${cond})`)}${sel}`; // ::view-transition-* hang off the root itself
    return `${g(`:where(html${cond})`)} ${sel}`;
  };
  const scopeRules = (container, cond, astro) => container.each((node) => {
    if (node.type === 'rule') node.selectors = node.selectors.map((s) => scope(s, cond, astro));
    else if (node.type === 'atrule' && /^(media|supports|container|layer)$/.test(node.name)) scopeRules(node, cond, astro);
  });
  return {
    postcssPlugin: 'rw-motion-policy',
    AtRule: {
      media(at) {
        if (!at.params.includes('prefers-reduced-motion')) return;
        let mode = null;
        const branches = at.params.split(',').map((b) => b.replace(MOTION, (_, a, c) => {
          const m = a || c || 'reduce';
          if (mode && mode !== m) throw at.error('rw-motion-policy: one media query mixes reduce and no-preference');
          mode = m;
          return '';
        }).trim());
        if (branches.some((b) => b.includes('prefers-reduced-motion'))) throw at.error('rw-motion-policy: unsupported query');
        const file = at.root().source?.input?.file ?? '';
        scopeRules(at, mode === 'reduce' ? '.rw-calm' : ':not(.rw-calm)', /\.astro\b/.test(file));
        if (branches.some((b) => !b)) at.replaceWith(at.nodes); // a branch was only the motion feature: no other condition left
        else at.params = branches.join(', ');
      },
    },
  };
}
motionToClass.postcss = true;

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [sitemap({ filter: (page) => !page.includes('/not-found/'), i18n: { defaultLocale: 'es', locales: { es: 'es-US', en: 'en-US' } } })],
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
  vite: { css: { postcss: { plugins: [motionToClass()] } } },
});
