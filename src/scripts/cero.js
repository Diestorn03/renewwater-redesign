/*
  "$0 que se llena" (#cero, and the compact copy on About).
  Level: desktop gate → --lvl scrubbed from empty to 8% below the top (start "top 75%", end "center 45%");
         touch/narrow → armed empty, fills once in 1.6 s (CSS transition) when 40% visible; reduced → stays full.
  Waves loop in CSS and pause off screen. Tickets land (rotate −2° → 0, y 30 → 0) and the stamps thump in.
*/
import { onPage } from './engine.js';

onPage(({ gsap, env }) => {
  const root = document.querySelector('.cero');
  if (!root) return;
  const zero = root.querySelector('.cero__zero');
  const css = getComputedStyle(root);
  const EMPTY = css.getPropertyValue('--lvl-empty').trim();
  const FULL = css.getPropertyValue('--lvl-full').trim();
  const observers = [];
  const io = (el, fn, opts) => { const o = new IntersectionObserver(fn, opts); o.observe(el); observers.push(o); return o; };

  io(zero, ([e]) => zero.classList.toggle('is-idle', !e.isIntersecting));

  if (!env.reduced) {
    if (env.desktop) {
      gsap.fromTo(zero, { '--lvl': EMPTY }, {
        '--lvl': FULL, ease: 'power2.inOut',
        scrollTrigger: { trigger: zero, start: 'top 75%', end: 'center 45%', scrub: 0.6 },
      });
    } else {
      zero.classList.add('is-armed');
      const o = io(zero, ([e]) => { if (e.isIntersecting) { zero.classList.remove('is-armed'); o.disconnect(); } }, { threshold: 0.4 });
    }

    const list = root.querySelector('.cero__tickets');
    const trig = { trigger: list, start: 'top 85%', once: true };
    gsap.fromTo(list.children, { y: 30, rotate: -2, opacity: 0 }, { y: 0, rotate: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.1, scrollTrigger: trig });
    gsap.from(list.querySelectorAll('.stamp'), { scale: 1.9, opacity: 0, duration: 0.55, ease: 'back.out(2.2)', stagger: 0.14, delay: 0.5, scrollTrigger: { ...trig } });
  }

  return () => { observers.forEach((o) => o.disconnect()); zero.classList.remove('is-armed', 'is-idle'); };
});
