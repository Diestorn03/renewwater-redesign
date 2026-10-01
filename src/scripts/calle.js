/*
  #instalaciones · Calle Renew (desktop gate only; touch/narrow/reduced paths are pure CSS + the engine's data-count).
  One linear tween moves the street; everything else hangs off its progress p:
    · pipe: clip-path reveal whose tip leads at 62% of the viewport and reaches the end of the street at p = 1
    · branches: each fills as the tip passes its card's centre (water arrives before the card does)
    · photos: inner xPercent parallax −7 → 7 (containerAnimation)
    · counter: "+N" = 500·p, "+12 Ciudades" from p = 0.5
*/
import { onPage } from './engine.js';

const LEAD = 0.62;   // tip position in the viewport at p = 0 (it drifts to the right edge by p = 1)
const FILL = 50;     // px of tip travel a branch needs to fill

onPage(({ gsap, env, scrollTo }) => {
  const root = document.getElementById('instalaciones');
  if (!root || !env.desktop) return;

  const stage = root.querySelector('.calle__stage');
  const track = root.querySelector('.calle__track');
  const intro = root.querySelector('.calle__intro');
  const bleed = root.querySelector('.calle__bleed');
  const pipe = root.querySelector('.calle__pipe');
  const tip = root.querySelector('.calle__tip');
  const cards = [...root.querySelectorAll('.calle__card')];
  const branches = cards.map((c) => c.querySelector('.calle__branch'));
  const nums = [...root.querySelectorAll('.calle__num')];
  const cities = root.querySelector('.calle__stat--cities');
  const total = +nums[0].dataset.to || 500;

  // the scrub drives these numbers, so the engine's one-shot count-up must not touch them
  const counts = nums.map((n) => n.getAttribute('data-count'));
  nums.forEach((n) => n.removeAttribute('data-count'));
  nums[1].textContent = `+${counts[1]}`;
  root.classList.add('is-pinned');

  // everything below moves on every scroll frame: give each mover its own GPU layer so the (very wide) track never
  // repaints. The photos' parallax is the big one: 12 images inside rounded, clipped arches.
  const imgs = cards.map((c) => c.querySelector('img')).filter(Boolean);
  gsap.set([pipe, tip, bleed, ...branches, ...imgs], { willChange: 'transform' });

  let W = 0, D = 0, centres = [], shown = -1;
  const measure = () => {
    W = track.scrollWidth;
    D = Math.max(0, W - innerWidth);
    centres = cards.map((c) => c.offsetLeft + c.offsetWidth / 2); // track coordinates, untransformed
  };
  const render = (p) => {
    const vw = innerWidth;
    const tipX = Math.min(W, p * D + vw * (LEAD + (1 - LEAD) * p));
    pipe.style.clipPath = `inset(0 ${Math.max(0, W - tipX)}px 0 0)`;
    tip.style.transform = `translate3d(${tipX}px,0,0)`;
    tip.style.opacity = tipX >= W - 24 ? '0' : '1';
    branches.forEach((b, i) => { b.style.transform = `scaleY(${gsap.utils.clamp(0, 1, (tipX - centres[i]) / FILL)})`; });
    bleed.style.transform = `translate3d(${-p * D * 0.22}px,0,0)`;
    const n = Math.round(total * p);
    if (n !== shown) { shown = n; nums[0].textContent = `+${n}`; } // text only changes when the number does
    cities.classList.toggle('is-on', p >= 0.5);
  };

  measure();
  let street = null;
  street = gsap.to([track, intro], {
    x: () => -D,
    ease: 'none',
    scrollTrigger: {
      trigger: root,
      pin: true,
      start: 'top top',
      end: () => `+=${D}`,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      onRefreshInit: measure,
      onRefresh: () => render(street ? street.progress() : 0),
    },
    onUpdate() { render(this.progress()); },
  });
  render(0);

  cards.forEach((card) => {
    const img = card.querySelector('img');
    if (img) {
      gsap.fromTo(img, { xPercent: -7 }, {
        xPercent: 7, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: street, start: 'left right', end: 'right left', scrub: true },
      });
    }
  });

  // keyboard: a focused card must not scroll the clipped stage sideways; move the page to where it is in view instead
  const onFocus = (e) => {
    const i = cards.indexOf(e.target.closest('.calle__card'));
    if (i < 0 || !e.target.matches(':focus-visible')) return; // a mouse click on a card must not move the page
    const unscroll = () => { stage.scrollLeft = 0; };
    unscroll(); requestAnimationFrame(unscroll);
    const st = street.scrollTrigger;
    const p = gsap.utils.clamp(0, 1, (centres[i] - innerWidth / 2) / D);
    scrollTo(st.start + p * (st.end - st.start), { offset: 0 });
  };
  root.addEventListener('focusin', onFocus);

  return () => {
    root.removeEventListener('focusin', onFocus);
    nums.forEach((n, i) => { n.setAttribute('data-count', counts[i]); n.textContent = `+${counts[i]}`; });
    root.classList.remove('is-pinned');
    cities.classList.remove('is-on');
    [pipe, tip, bleed, ...branches].forEach((el) => el.removeAttribute('style'));
    imgs.forEach((el) => { el.style.willChange = ''; });
  };
});
