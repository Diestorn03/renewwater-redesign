// /productos filter: radios → ?tipo= (replaceState) → cards hidden/shown with a GSAP Flip reflow. Reduced motion: no Flip.
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { onPage } from '../engine.js';

gsap.registerPlugin(Flip);

onPage(({ env, ScrollTrigger }) => {
  const root = document.getElementById('catalogo');
  if (!root) return;
  const cards = [...root.querySelectorAll('.pcard, .catalog__tile')];
  const radios = [...root.querySelectorAll('input[name="tipo"]')];
  const countN = root.querySelector('.catalog__count-n');
  const countW = root.querySelector('.catalog__count-w');
  const grid = root.querySelector('.catalog__grid');
  let flip;

  const apply = (value, animate) => {
    const state = animate ? Flip.getState(cards) : null;
    const h0 = grid.offsetHeight;
    let n = 0;
    cards.forEach((card) => {
      if (card.dataset.cats === '*') return; // the lab tile always stays, last
      const show = value === 'all' || card.dataset.cats.split(' ').includes(value);
      card.classList.toggle('is-out', !show);
      if (show) n++;
    });
    countN.textContent = n;
    countW.textContent = n === 1 ? root.dataset.countOne : root.dataset.countOther;
    if (!state) return ScrollTrigger.refresh();
    flip?.progress(1);
    // absolute:true lifts every card out of the grid while it moves: tween the grid height so the page below doesn't jump
    const h1 = grid.offsetHeight;
    gsap.fromTo(grid, { height: h0 }, { height: h1, duration: .6, ease: 'power3.inOut', clearProps: 'height' });
    flip = Flip.from(state, {
      duration: .6, ease: 'power3.inOut', absolute: true, nested: true, prune: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: .92 }, { opacity: 1, scale: 1, duration: .5, ease: 'power2.out', delay: .15 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: .92, duration: .3, ease: 'power2.in' }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  };

  const initial = new URLSearchParams(location.search).get('tipo');
  const start = radios.find((r) => r.value === initial);
  if (start && initial !== 'all') { start.checked = true; apply(initial, false); }

  const onChange = (e) => {
    if (e.target.name !== 'tipo') return;
    const value = e.target.value;
    const url = new URL(location.href);
    if (value === 'all') url.searchParams.delete('tipo'); else url.searchParams.set('tipo', value);
    history.replaceState(history.state, '', url);
    apply(value, !env.reduced);
  };
  root.addEventListener('change', onChange);
  return () => { root.removeEventListener('change', onChange); flip?.kill(); };
});
