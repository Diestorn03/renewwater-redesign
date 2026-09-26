// Redesign copy shared by every page (Spanish). Verbatim site copy lives in original.es.js;
// section/page microcopy lives in src/i18n/areas/<area>.js as { es, en }.
export default {
  lang: 'es',
  locale: 'es_US',
  siteName: 'Renew Water',
  meta: {
    description: 'Sistemas de purificación de agua para tu hogar en Florida. Análisis de agua gratis, $0 de inicial e instalación gratuita. Kissimmee y Orlando.',
    home: 'Agua Pura, Vida Sana',
    about: 'Sobre Nosotros',
    products: 'Productos',
    join: 'Únete a Nosotros',
    contact: 'Contacto',
    analysis: 'Análisis de agua gratis',
    notFound: 'Página no encontrada',
  },
  nav: {
    skip: 'Saltar al contenido',
    home: 'Inicio', about: 'Sobre Nosotros', products: 'Productos', join: 'Únete', contact: 'Contacto',
    menu: 'Menú', openMenu: 'Abrir menú', closeMenu: 'Cerrar menú',
    langSwitch: 'English', langCode: 'EN', langLabel: 'Cambiar idioma a inglés',
    primary: 'Principal',
  },
  cta: {
    freeAnalysis: 'Análisis gratis',
    freeAnalysisLong: 'Agenda tu análisis gratis',
    whatsapp: 'WhatsApp',
    whatsappLabel: 'Escríbenos por WhatsApp',
    call: 'Llamar',
    callEs: 'Llamar en español',
    callEn: 'Call in English',
    quote: 'Cotizar',
    seeProducts: 'Ver productos',
    tryLab: 'Haz la prueba',
    trust: 'Sin compromiso · Te respondemos por WhatsApp',
  },
  wa: {
    // default WhatsApp message (from the current site's floating button)
    default: 'Hola, me gustaría tener más información sobre los servicios de Renew Water.',
    analysis: 'Hola Renew Water, quiero agendar mi análisis de agua gratis.',
    quote: (name) => `Hola, me interesa ${name}. ¿Me pueden cotizar?`,
  },
  trust: {
    wqa: 'Miembro WQA',
    projects: '+500 proyectos',
    down: '$0 de inicial',
    install: 'Instalación gratis',
    analysis: 'Análisis gratis',
  },
  demo: 'Propuesta de rediseño · demo',
  simulation: 'Simulación ilustrativa',
};
