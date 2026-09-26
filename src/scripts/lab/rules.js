// Laboratorio en Casa: pure logic, no DOM (rules from src/data/lab-rules.json, spec §6.5).
// Self-check: scratchpad/a4-check.mjs imports this file.

/** answers = { origin: 'ciudad'|'pozo'|'nose'|'', home: 'casa'|'apto'|'', symptoms: ['cloro', …] } */
export function evaluate(data, answers) {
  const { origin, home, symptoms } = answers;
  const matches = (w) =>
    (!w.origin || w.origin === origin) &&
    (!w.home || w.home === home) &&
    (!w.anySymptom || w.anySymptom.some((id) => symptoms.includes(id)));
  const rule = data.rules.find((r) => matches(r.when)) || data.fallback;
  const flags = data.symptoms.filter((s) => s.flag && symptoms.includes(s.id)).map((s) => s.flag);
  return { product: rule.product, alt: rule.alt, drink: flags.includes(data.drinking.flag) ? data.drinking.products : [] };
}

/**
 * WhatsApp text (without the ref, buildWa appends it).
 * m = copy.msg templates with {v}; labels = { origin, home, symptoms: [] } as written in the message; names = slug -> short name.
 */
export function composeLabMessage(m, labels, result, names) {
  const fill = (tpl, v) => tpl.replace('{v}', v);
  let suggestion = result.product ? names[result.product] : m.analysisFirst;
  if (result.drink.length) suggestion += fill(m.drink, result.drink.map((s) => names[s]).join(m.or));
  return [
    m.intro,
    labels.origin && fill(m.origin, labels.origin),
    labels.home && fill(m.home, labels.home),
    labels.symptoms.length && fill(m.symptoms, labels.symptoms.join(', ')),
    fill(m.product, suggestion),
  ].filter(Boolean).join(' ');
}
