// Build-time helpers shared by the product card and detail page (imported in frontmatter, never shipped to the client).
import products from '../../data/products.json';

export const sorted = [...products].sort((a, b) => a.order - b.order);

/** "6 ETAPAS", "2–4 ETAPAS", "DOBLE TANQUE" or null */
export function badge(p, lang, stagesWord) {
  if (p.stages) return `${p.stages} ${stagesWord}`;
  if (p.stageOptions) return `${p.stageOptions[0]}–${p.stageOptions.at(-1)} ${stagesWord}`;
  return p.badge?.[lang] ?? null;
}

/** tagline split around its accent words: [before, accent, after] */
export function taglineParts(p, lang) {
  const s = p.tagline[lang];
  const a = p.taglineAccent?.[lang];
  const i = a ? s.indexOf(a) : -1;
  return i < 0 ? [s, '', ''] : [s.slice(0, i), a, s.slice(i + a.length)];
}

/** Up to 3 related products: same category first, then the next ones in catalogue order */
export function related(p) {
  const others = sorted.filter((q) => q.slug !== p.slug);
  const same = others.filter((q) => q.categories.some((c) => p.categories.includes(c)));
  const rest = others.filter((q) => !same.includes(q));
  return [...same, ...rest].slice(0, 3);
}

/** "Label: text" highlights (Astrid, Apto) → [label, text]; plain ones → ['', text] */
export function splitHighlight(h) {
  const m = h.match(/^([^:]{3,40}):\s+(.+)$/);
  return m ? [m[1], m[2]] : ['', h];
}
