// A3 · #etapas (Renew City, 6 stages) and #sostenible. Stage names/verbs transcribed from the Renew City flyer (product-9).
// `retains` chips: PENDING VALIDATION by Renew's technical team (spec §6.3). Kept deliberately generic; `kind` is the
// particle type the illustrative canvas traps in that band (sedimento|dureza|cloro|quimico|metal, null = no particle).
export default {
  es: {
    kicker: 'Renew City · 6 etapas',
    title: 'Máxima purificación para el',
    titleAccent: 'agua de ciudad',
    lead: 'Seis capas reales, en el orden en que el agua de tu casa las atraviesa.',
    hint: 'Baja para filtrar',
    step: 'Paso',
    steps: 'Pasos',
    retains: 'Retiene',
    stages: [
      { key: 'grava', name: 'Grava', verb: 'Clarifica', chips: [{ label: 'Sedimentos gruesos', kind: 'sedimento' }, { label: 'Arena', kind: 'sedimento' }] },
      { key: 'garnet', name: 'Garnet', verb: 'Refina', chips: [{ label: 'Sedimentos finos', kind: 'sedimento' }] },
      { key: 'cationica', name: 'Resina Catiónica', verb: 'Suaviza', chips: [{ label: 'Dureza (calcio y magnesio)', kind: 'dureza' }] },
      { key: 'anionica', name: 'Resina Aniónica', verb: 'Acondiciona', chipsLabel: 'Aporta', chips: [{ label: 'pH más equilibrado', kind: null }] },
      { key: 'carbon', name: 'Carbón Activado', verb: 'Filtra', chips: [{ label: 'Cloro', kind: 'cloro' }, { label: 'Pesticidas', kind: 'quimico' }, { label: 'Malos olores y sabores', kind: null }] },
      { key: 'kdf', name: 'KDF', verb: 'Descontamina', chips: [{ label: 'Metales pesados', kind: 'metal' }] },
    ],
    impurities: 'Impurezas (ilustrativo)',
    closingLead: 'Resultado',
    closing: 'Elimina cloro, metales pesados, sedimentos, pesticidas y otros compuestos nocivos.',
    ctaProduct: 'Ver Renew City',
    ctaLab: '¿Qué hay en tu agua? Haz la prueba',
    skip: 'Saltar animación',
    goTo: 'Ir al paso',
    tankLabel: 'Tanque Renew City en corte',

    // #sostenible
    calcLabel: '¿Cuántos paquetes o botellones compra tu familia por semana?',
    // output reads "{n} × 52 = {n·52} al año que dejarías de comprar"
    calcTail: 'al año que dejarías de comprar',
    waText: (n) => (n > 0
      ? `Hola Renew Water, en mi casa compramos ${n === 1 ? 'un paquete o botellón' : `unos ${n} paquetes o botellones`} de agua por semana (${n * 52} al año). Quiero mi análisis de agua gratis.`
      : 'Hola Renew Water, quiero mi análisis de agua gratis.'),
    before: 'Antes: plástico de un solo uso',
    after: 'Después: agua de tu grifo',
  },
  en: {
    kicker: 'Renew City · 6 stages',
    title: 'Maximum purification for',
    titleAccent: 'city water',
    lead: 'Six real layers, in the order your home’s water flows through them.',
    hint: 'Scroll to filter',
    step: 'Step',
    steps: 'Steps',
    retains: 'Holds back',
    stages: [
      { key: 'grava', name: 'Gravel', verb: 'Clarifies', chips: [{ label: 'Coarse sediment', kind: 'sedimento' }, { label: 'Sand', kind: 'sedimento' }] },
      { key: 'garnet', name: 'Garnet', verb: 'Refines', chips: [{ label: 'Fine sediment', kind: 'sedimento' }] },
      { key: 'cationica', name: 'Cation Resin', verb: 'Softens', chips: [{ label: 'Hardness (Ca & Mg)', kind: 'dureza' }] },
      { key: 'anionica', name: 'Anion Resin', verb: 'Conditions', chipsLabel: 'Brings', chips: [{ label: 'More balanced pH', kind: null }] },
      { key: 'carbon', name: 'Activated Carbon', verb: 'Filters', chips: [{ label: 'Chlorine', kind: 'cloro' }, { label: 'Pesticides', kind: 'quimico' }, { label: 'Odors & off-tastes', kind: null }] },
      { key: 'kdf', name: 'KDF', verb: 'Decontaminates', chips: [{ label: 'Heavy metals', kind: 'metal' }] },
    ],
    impurities: 'Impurities (illustrative)',
    closingLead: 'The result',
    closing: 'Removes chlorine, heavy metals, sediment, pesticides and other harmful compounds.',
    ctaProduct: 'See Renew City',
    ctaLab: 'What’s in your water? Take the test',
    skip: 'Skip animation',
    goTo: 'Go to step',
    tankLabel: 'Renew City tank, cut-away',

    calcLabel: 'How many packs or jugs of water does your family buy each week?',
    calcTail: 'a year you’d stop buying',
    waText: (n) => (n > 0
      ? `Hi Renew Water, my family buys ${n === 1 ? 'one pack or jug' : `about ${n} packs or jugs`} of water a week (${n * 52} a year). I’d like my free water analysis.`
      : 'Hi Renew Water, I’d like my free water analysis.'),
    before: 'Before: single-use plastic',
    after: 'After: water from your tap',
  },
};
