// Home narrative sections owned by A2: Hero (#inicio), Invisible, Soluciones, Beneficios.
// Verbatim site copy comes from original.*.js (o.home.*); this file only holds the redesign's new microcopy
// and the benefit-copy proposals from spec §6.10 (marked PROPUESTA below, pending the client's OK).
export default {
  es: {
    hero: {
      accent: 'Vida Sana',          // part of o.home.heroTitle set in the serif accent
      lensWord: 'Pura',             // where the phone's one-time lens sweep rests
      bleed: 'PURA',
      bridgeAccent: 'bebiendo',     // accent word inside o.home.doYouKnowTitle
      waHint: 'por WhatsApp',
      wqaAlt: 'Miembro de la Water Quality Association',
      archAlt: 'Sistema Renew Water de acero inoxidable instalado junto a una vivienda',
      archTag: 'Instalación real',
      trustLabel: 'Por qué confiar en Renew Water',
    },
    invisible: {
      kicker: 'Contaminantes comunes',
      title: ['Lo que ', 'no ves', ' en tu vaso'],
      chips: ['Cloro', 'Metales pesados', 'Bacterias', 'Sedimentos', 'Químicos invisibles'],
      link: '¿Cuáles hay en tu agua? Haz la prueba',
      photoAlt: 'Familia bebiendo agua en la cocina',
      photoNote: 'Imagen ilustrativa',
    },
    solutions: {
      kicker: 'Por qué Renew Water',
      accent: 'Soluciones',
      titles: ['Tecnología avanzada', 'Elimina contaminantes', 'Analizamos tu agua', 'Asistencia continua'],
    },
    benefits: {
      kicker: 'Salud en cada vaso',
      accent: 'Purificación',
      photoAlt: 'Familia brindando con vasos de agua',
      photoNote: 'Imagen ilustrativa',
      /*
        PROPUESTA DE COPY para el cliente (spec §6.10). Los títulos siguen siendo o.home.benefitNTitle sin el "N. ".
        1 · Se quitó "incluyendo la India" (no aplica a familias de Florida).
        2 · "garantizando una mejor calidad del aire al beber" → "para que el agua que bebes sea más limpia" (el agua no cambia el aire).
        3 · Sin cambios.
        4 · "Beber de 5 a 6 litros de agua purificada al día" → "Mantenerte bien hidratado con agua purificada" (cifra exagerada).
      */
      texts: [
        'Un buen purificador de agua puede eliminar hasta el 99 % de bacterias como la E. coli, la salmonela y el cólera, causantes de enfermedades transmitidas por el agua y comunes en todo el mundo. Esto garantiza que el agua que consumes sea mucho más segura.',
        'Aunque el cloro elimina muchas bacterias, su reacción con los compuestos orgánicos del agua puede generar carcinógenos que contribuyen a problemas respiratorios como el asma. Un purificador de agua te protege de estos efectos nocivos, para que el agua que bebes sea más limpia.',
        null, // null = keep o.home.benefit3Text verbatim
        'Mantenerte bien hidratado con agua purificada ayuda a eliminar las toxinas del cuerpo, lo que se traduce en una piel más sana, un cutis más claro y una apariencia radiante. La hidratación es esencial para una piel vibrante.',
      ],
    },
  },
  en: {
    hero: {
      accent: 'Healthy Life',
      lensWord: 'Pure',
      bleed: 'PURE',
      bridgeAccent: 'drinking',
      waHint: 'on WhatsApp',
      wqaAlt: 'Water Quality Association member',
      archAlt: 'Stainless-steel Renew Water system installed outside a home',
      archTag: 'Real installation',
      trustLabel: 'Why families trust Renew Water',
    },
    invisible: {
      kicker: 'Common contaminants',
      title: ['What you ', "can't see", ' in your glass'],
      chips: ['Chlorine', 'Heavy metals', 'Bacteria', 'Sediment', 'Invisible chemicals'],
      link: 'Which ones are in your water? Take the test',
      photoAlt: 'Family drinking water in the kitchen',
      photoNote: 'Illustrative image',
    },
    solutions: {
      kicker: 'Why Renew Water',
      accent: 'Solutions',
      titles: ['Advanced technology', 'Removes contaminants', 'We test your water', 'Ongoing support'],
    },
    benefits: {
      kicker: 'Health in every glass',
      accent: 'Purification',
      photoAlt: 'Family toasting with glasses of water',
      photoNote: 'Illustrative image',
      /*
        COPY PROPOSAL for the client (spec §6.10). Titles stay o.home.benefitNTitle without the "N. " prefix.
        1 · No change (the English site never mentioned India).
        2 · "ensuring better air quality when drinking" → "so the water you drink is cleaner".
        3 · No change.
        4 · "Drinking 5 to 6 liters of purified water per day" → "Staying well hydrated with purified water".
      */
      texts: [
        null,
        'Although chlorine eliminates many bacteria, its reaction with organic compounds in the water can generate carcinogens that contribute to respiratory problems such as asthma. A water purifier protects you from these harmful effects, so the water you drink is cleaner.',
        null,
        'Staying well hydrated with purified water helps eliminate toxins from the body, resulting in healthier skin, a clearer complexion, and a radiant appearance. Hydration is essential for vibrant skin.',
      ],
    },
  },
};
