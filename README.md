# Renew Water · Propuesta de rediseño web

Rediseño de [renewwaterus.com](https://renewwaterus.com) construido con **Astro 7**, **GSAP 3.15** (ScrollTrigger, SplitText, DrawSVG, Flip) y **Lenis**. Reutiliza los textos del sitio actual en español e inglés, el logo, la paleta, las fotos de instalaciones y clientes, los 14 folletos de productos, las reseñas de Google, las financieras y las redes sociales. Todo eso va dentro de una experiencia llamada **"Flujo Vivo"**: el degradado aqua→lima del logo funciona como agua limpia que recorre la página.

## Arrancar en local

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # sitio estático en /dist
```

## Despliegue

### GitHub Pages (demo de la propuesta)

Cada push a `main` ejecuta [.github/workflows/deploy.yml](.github/workflows/deploy.yml) y publica en `https://<usuario>.github.io/<repo>/`.

Requisitos, una sola vez:
- El repositorio debe ser público.
- En **Settings → Pages → Source** hay que elegir **GitHub Actions**.

Mientras sea una propuesta, `PUBLIC_DEMO=1` hace dos cosas:
- Añade `noindex` en todas las páginas y un `robots.txt` que bloquea buscadores, para que la demo no compita con renewwaterus.com en Google.
- Muestra la línea "Propuesta de rediseño · demo" en el pie.

Cuando pase a ser el sitio real, crea la variable de repositorio `PUBLIC_DEMO` con valor vacío.

### Dominio final

`npm run build` sin variables produce `/dist` con rutas desde la raíz y `site = https://renewwaterus.com`. Basta con subir esa carpeta a cualquier hosting estático (Hostinger, Netlify, Vercel o Cloudflare Pages). No necesita base de datos ni PHP.

## Idiomas

- Español en `/`: `/sobre-nosotros/`, `/productos/`, `/unete/`, `/contacto/` y `/analisis/`.
- Inglés en `/en/`: `/en/about-us/`, `/en/products/`, `/en/join-us/`, `/en/contact/` y `/en/analysis/`.
- La tabla de rutas vive en [src/i18n/routes.js](src/i18n/routes.js).

Dónde está cada texto:

| Archivo | Contenido |
|---|---|
| [src/i18n/original.es.js](src/i18n/original.es.js) y [original.en.js](src/i18n/original.en.js) | Los textos del sitio actual, tal cual |
| [src/i18n/es.js](src/i18n/es.js) y [en.js](src/i18n/en.js) | Textos comunes del rediseño |
| [src/i18n/areas/](src/i18n/areas/) | Textos nuevos de cada sección |

Hay `hreflang` y sitemap por idioma.

## Conversión

Todo termina en WhatsApp (+1 407 639 3366), como en el sitio actual, pero con mensajes ya redactados. Cada botón añade una etiqueta `(ref: web-…)`, así el equipo ve en el chat de dónde vino cada cliente sin instalar analytics:

| Ref | Origen |
|---|---|
| `web-hero`, `web-header`, `web-fab` | Portada, cabecera y botón flotante |
| `web-lab`, `web-bio` | Laboratorio "¿Qué hay en tu agua?" (home y landing `/analisis/` para el link en bio de Instagram/TikTok) |
| `web-producto` | Botón "Cotizar" de cada producto |
| `web-financiamiento`, `web-instalaciones`, `web-sostenible`, `web-final`, `web-about` | Secciones del home y Sobre Nosotros |
| `web-contacto`, `web-empleo` | Formulario de contacto y autoevaluación de Únete |

## Paleta y tipografía (extraídas del sitio y del logo)

| Token | Valor | Origen |
|---|---|---|
| `--aqua` → `--mint` → `--leaf` → `--lime` | `#00D0D0` → `#00D08C` → `#00CC60` → `#98C400` | Degradado del wordmark del logo |
| `--sun` | `#F8C000` | Trazo ámbar de la marca |
| `--navy` | `#001C38` | Fondo oscuro del sitio actual |
| `--aqua-ink`, `--leaf-ink`, `--lime-ink` | `#00767A`, `#00745A`, `#4F6A00` | Variantes para texto sobre claro con contraste AA |

Tipografías:
- **Orbitron** (licencia OFL, vía `@fontsource/orbitron`): números, etiquetas y la marca. Reemplaza a Nasalization, la tipografía de la marca, que no se puede distribuir en un repo público. Si Renew Water tiene la licencia web, se vuelve a poner cambiando `--font-brand` en [src/styles/base.css](src/styles/base.css). Ojo: hay que volver a medir el "$0" de [CeroSeLlena.astro](src/components/home/CeroSeLlena.astro) (constante `INK`) y el tamaño del "RENEW WATER" del pie.
- **Geist**, también del sitio actual: titulares y cuerpo.
- **Instrument Serif Italic**: una palabra de acento por titular.

## Qué cambia respecto al sitio actual

| Actual | Propuesta |
|---|---|
| Carrusel de 3 fotos en el hero | Hero "Agua Viva": agua en WebGL que reacciona al cursor, con lente sobre el título (póster animado en CSS en el móvil) |
| Texto sobre contaminantes | Chips flotantes y "Laboratorio en casa": tus respuestas ensucian un vaso y lo purificas manteniendo pulsado. Recomienda un equipo y arma el mensaje de WhatsApp |
| 14 folletos en JPG | Catálogo con filtros, ficha por producto con los textos de los folletos y el folleto original en lightbox |
| Nada sobre cómo funciona el equipo | Las 6 etapas reales del Renew City en un tanque en corte que atrapa partículas al hacer scroll |
| Carrusel de instalaciones | "Calle Renew": recorrido horizontal con tubería y contador +500 proyectos |
| Logos de financieras | "$0 que se llena" de agua, más la marquesina de financieras |
| Reseñas en imagen | Reseñas en texto real (indexables y accesibles), con fotos de familias aparte |
| Banner de sostenibilidad | Transición del plástico en el océano al vaso limpio, con calculadora de botellas al año |
| Formulario inexistente | Formulario que redacta el mensaje de WhatsApp (sin backend) |

## Accesibilidad y rendimiento

- **Móvil y pantallas táctiles:** sin WebGL, sin escenas fijadas y sin scroll suave. Recorridos nativos con scroll-snap y áreas táctiles de 48 px o más.
- **Movimiento:** el sitio anima siempre, aunque el sistema operativo pida "reducir movimiento". Muchos PCs de oficina traen esa opción apagada y la propuesta se vería plana. El pie tiene un interruptor accesible **"Reducir movimiento"** (`aria-pressed`, se recuerda en `localStorage`) que desactiva el loader, los pins, los scrubs, el WebGL y las marquesinas, y muestra el estado final. En el CSS se sigue escribiendo `@media (prefers-reduced-motion: …)` normal: un plugin PostCSS en [astro.config.mjs](astro.config.mjs) lo convierte en la clase `html.rw-calm` al compilar. En JS, `env.reduced` lee esa misma clase.
- **Canvas accesibles:** todo canvas tiene equivalente en texto (lista de etapas, conteo `aria-live` del laboratorio).
- **Imágenes:** WebP optimizadas (de 25 MB originales a unos 9 MB en total, con miniaturas), carga diferida y medidas fijas para evitar saltos.

## Pendiente de confirmar con Renew Water

1. **Dirección:** el sitio dice *102 Park Pl Blvd. Suite B1, Kissimmee, FL 34741*; Facebook dice *1621 E Vine St, Suite B, Kissimmee, FL 34744*.
2. **Correo:** los emails del sitio son `@renewsolarus.com`. ¿Existe `info@renewwaterus.com`?
3. **Etapas y reglas:** qué retiene cada una de las 6 etapas del Renew City y las reglas de recomendación del laboratorio ([src/data/lab-rules.json](src/data/lab-rules.json)).
4. **Sellos NSF/EPA:** aparecen en los folletos, pero no se usan como texto hasta confirmarlos.
5. **Noticias:** faltan los enlaces de las noticias 2 y 4 de "Sobre Nosotros".
6. **Beneficios:** ajustes de redacción propuestos (por ejemplo, quitar "incluyendo la India").
7. **Licencia de Nasalization:** es de Typodermic y sus metadatos dicen "not freely distributable". Por eso la propuesta usa Orbitron. Si Renew Water tiene la licencia web, se puede volver a su tipografía.
8. **Nombre en inglés de "5 Pasos Eco":** la propuesta usa "5-Stage Eco", igual que "Renew Apto 4-Stage". Confirmar si el nombre se traduce.
9. **Fotos en mejor resolución:** la foto del plástico en el océano mide 600 px y se ve suave en pantallas grandes. Las texturas del tanque de las 6 etapas salen de una franja de 40 px del folleto. Los recortes de producto traen la sombra gris del folleto. Con fotos originales de mayor tamaño se reemplazan sin tocar código.
