// Sobre Nosotros microcopy (A6). The page body is the client's verbatim copy (o.aboutUs.*); these are labels around it.
const es = {
  meta: {
    description: 'Renew Water: equipo de expertos en purificación de agua en Kissimmee y Orlando. Nuestra misión, historia, objetivos y tecnología.',
  },
  hero: {
    kicker: 'Sobre nosotros',
    accent: 'su bienestar',
    photoAlt: 'El equipo de Renew Water reunido en su oficina de Kissimmee',
    scroll: 'Nuestra misión',
  },
  advantages: {
    kicker: 'Por qué Renew',
    title: 'Agua pura, sin',
    titleAccent: 'barreras',
  },
  history: {
    kicker: 'Quiénes somos',
    photoAlts: [
      'Integrantes del equipo Renew Water en una capacitación',
      'Asesores de Renew Water tomando notas durante una capacitación',
      'Sesión de trabajo del equipo en la oficina',
      'Equipo de Renew Water en una reunión de formación',
    ],
  },
  objectives: { kicker: 'Hacia dónde vamos' },
  tech: {
    kicker: 'Tecnología',
    photoAlt: 'Sistema Renew Water de acero inoxidable instalado en la pared exterior de una casa',
  },
  news: {
    kicker: 'Boletín',
    video: 'Video',
    watch: 'Ver video',
    play: (title) => `Reproducir video: ${title}`,
  },
  cta: {
    title: 'Tu condado podría estar en la noticia.',
    accent: 'Analiza tu agua gratis.',
    text: 'Te visitamos, tomamos una muestra y te explicamos qué hay en tu agua. Sin compromiso.',
    lab: 'Haz la prueba',
  },
};

const en = {
  meta: {
    description: 'Renew Water: a team of water purification experts in Kissimmee and Orlando. Our mission, history, goals and technology.',
  },
  hero: {
    kicker: 'About us',
    accent: 'well-being',
    photoAlt: 'The Renew Water team together at their Kissimmee office',
    scroll: 'Our mission',
  },
  advantages: {
    kicker: 'Why Renew',
    title: 'Pure water, no',
    titleAccent: 'barriers',
  },
  history: {
    kicker: 'Who we are',
    photoAlts: [
      'Renew Water team members at a training session',
      'Renew Water advisors taking notes during a training',
      'Team work session at the office',
      'The Renew Water team at a training meeting',
    ],
  },
  objectives: { kicker: 'Where we are headed' },
  tech: {
    kicker: 'Technology',
    photoAlt: 'Stainless-steel Renew Water system installed on the outside wall of a home',
  },
  news: {
    kicker: 'Bulletin',
    video: 'Video',
    watch: 'Watch video',
    play: (title) => `Play video: ${title}`,
  },
  cta: {
    title: 'Your county could be in the news.',
    accent: 'Test your water for free.',
    text: "We visit, take a sample and explain what's in your water. No commitment.",
    lab: 'Take the test',
  },
};

export default { es, en };
