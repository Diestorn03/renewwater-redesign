/*
  #sostenible (spec §6.9): bottle calculator + tide reveal.
  The calculator runs everywhere (reduced motion included). Desktop gate: scrubbed tide over the sticky stage
  (clip-path + transform only) and the crest drift runs only while the section is on screen. Touch: one clip reveal.
*/
import { onPage } from './engine.js';
import { buildWa } from '../data/site.js';
import copy from '../i18n/areas/etapas.js';

onPage(({ gsap, ScrollTrigger, env }) => {
  const root = document.querySelector('.so');
  if (!root) return;
  const c = copy[document.documentElement.lang] ?? copy.es;
  const $ = (s) => root.querySelector(s);
  const input = $('#so-n'), formula = $('.so__formula'), big = $('.so__big'), bottles = $('.so__bottles'), cta = $('.so__cta');

  const update = () => {
    const n = +input.value;
    input.style.setProperty('--v', n);
    bottles.style.setProperty('--n', n);
    formula.textContent = `${n} × 52 = `;
    big.textContent = n * 52;
    cta.href = buildWa({ text: c.waText(n), ref: 'web-sostenible' });
  };
  input.addEventListener('input', update);
  update();
  const cleanup = () => input.removeEventListener('input', update);
  if (env.reduced) return cleanup;

  const after = $('.so__after');
  if (env.desktop) {
    gsap.timeline({ scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.6 } })
      .fromTo(after, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
      .fromTo($('.so__tideline'), { yPercent: 100 }, { yPercent: 0, ease: 'none' }, 0)
      .fromTo($('.so__after img'), { scale: 1.12 }, { scale: 1, ease: 'none' }, 0);
    ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', toggleClass: { targets: root, className: 'is-live' } });
  } else {
    gsap.fromTo(after, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: after, start: 'top 85%', once: true } });
  }
  return cleanup;
});
