/*
  #etapas controller (spec §6.3). One init per page load; bails out when the section is not on the page.
    desktop gate + mode=pin : pin +200%, scrub true (Lenis already smooths; no snap). Front / particles / meters are pure
                              functions of progress, drawn only from the timeline's onUpdate (one rAF guard, no idle loop).
                              Per frame only transforms of promoted leaves + the canvas change, and only when their value
                              did; classes, the odometer and the text cross-fade change once per stage (CSS transitions).
    touch / <768 + mode=pin : IntersectionObserver on the 6 cards sets data-step (the CSS does the rest)
    static / reduced motion : hover highlighting only (everything else is the CSS final state)
*/
import { onPage } from '../engine.js';
import { makeParticles, draw } from './particles.js';

const LABELS = { intro: 0, s1: 0.12, s2: 0.26, s3: 0.4, s4: 0.54, s5: 0.68, s6: 0.82, out: 1 };
const OUT_AT = 0.92; // stage 7 = closing line + CTAs + clean stream
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const frontOf = (p) => clamp01((p - 0.06) / 0.84);
const stepOf = (p, f) => (p >= OUT_AT ? 7 : f <= 0 ? 0 : Math.min(6, Math.floor(f * 6) + 1));

onPage(({ gsap, env, scrollTo, emit, onRefresh }) => {
  const root = document.querySelector('.et');
  if (!root) return;
  const $$ = (s) => [...root.querySelectorAll(s)];
  const win = root.querySelector('.et__window');
  const groups = { band: $$('.et__band'), item: $$('.et__item'), callout: $$('.et__callout'), tick: $$('.et__tick') };
  const off = [];
  const on = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); off.push(() => el.removeEventListener(type, fn, opts)); };

  // hover: a band, its callout, its tick and its list item light up together
  const hover = (i, v) => Object.values(groups).forEach((g) => g[i - 1]?.classList.toggle('is-hover', v));
  const idx = (e) => +(e.target.closest?.('[data-i]')?.dataset.i || 0);
  on(root, 'pointerover', (e) => { const i = idx(e); if (i) hover(i, true); });
  on(root, 'pointerout', (e) => { const i = idx(e); if (i) hover(i, false); });

  const pinMode = root.dataset.mode === 'pin';
  if (!pinMode || env.reduced) return () => off.forEach((f) => f());

  let step = -1;
  let done = false;
  // back to the CSS final state (a breakpoint change reboots the engine into another path)
  const reset = () => {
    off.forEach((f) => f());
    win.style.removeProperty('--fy');
    [...fronts, strip, root.querySelector('.et__stream')].forEach((el) => el?.style.removeProperty('transform'));
    root.dataset.step = 0;
    root.classList.remove('is-murky', 'is-done');
    Object.values(groups).flat().forEach((el) => el.classList.remove('is-active', 'is-past', 'is-hover'));
  };
  const strip = root.querySelector('.et__odo-strip');
  const fronts = [root.querySelector('.et__dry'), root.querySelector('.et__dim')];
  const setStep = (s) => {
    if (s === step) return;
    step = s;
    root.dataset.step = s;
    root.classList.toggle('is-murky', s < 5); // the front has not crossed the anion resin yet
    root.classList.toggle('is-done', s === 7);
    groups.band.forEach((b, i) => b.classList.toggle('is-active', i + 1 === s));
    groups.callout.forEach((b, i) => b.classList.toggle('is-active', i + 1 <= s && s < 7));
    groups.item.forEach((b, i) => b.classList.toggle('is-active', i + 1 === s));
    groups.tick.forEach((b, i) => { b.classList.toggle('is-active', i + 1 === s); b.classList.toggle('is-past', i + 1 < s); });
    if (strip) strip.style.transform = `translate3d(0,${(-100 * Math.min(s, 6)) / 7}%,0)`; // CSS transition runs it on the compositor
    if (s === 7 && !done) { done = true; emit('rw:etapas-complete'); }
  };

  /* ---------- touch / narrow: sticky tank + cards ---------- */
  if (!env.desktop) {
    const cards = groups.item;
    const out = root.querySelector('.et__out');
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const i = e.target === out ? 7 : cards.indexOf(e.target) + 1;
        if (e.isIntersecting) setStep(i);
        else if (i === 1 && e.boundingClientRect.top > 0) setStep(0); // scrolled back above the first card
        else if (i === 7 && e.boundingClientRect.top > 0 && step === 7) setStep(6);
      }
      win.style.setProperty('--fy', Math.min(step, 6) / 6);
    }, { rootMargin: '-45% 0px -45% 0px' });
    [...cards, out].forEach((el) => io.observe(el));
    setStep(0);
    win.style.setProperty('--fy', 0);
    return () => { io.disconnect(); reset(); };
  }

  /* ---------- desktop: pinned scrub ---------- */
  // the chips' entrance stagger would run on the 5 hidden stages at once (invisible, ~1,000 inline writes): items cross-fade instead
  const staggers = $$('.et__chips[data-stagger]');
  staggers.forEach((ul) => ul.removeAttribute('data-stagger'));
  off.push(() => staggers.forEach((ul) => ul.setAttribute('data-stagger', '0.06')));
  const canvas = root.querySelector('.et__canvas');
  const ctx = canvas.getContext('2d');
  const ps = makeParticles();
  const bar = root.querySelector('.et__bar-fill');
  const pct = root.querySelector('.et__pct');
  const rail = root.querySelector('.et__rail-fill');
  const stream = root.querySelector('.et__stream');
  let W = 0, H = 0, raf = 0, lastPct = -1, lastP = -1;
  const last = new Map();
  const put = (el, v) => { if (last.get(el) !== v) { last.set(el, v); el.style.transform = v; } }; // write only on change

  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top top', end: '+=200%', pin: true, scrub: true },
    onUpdate: () => { if (!raf) raf = requestAnimationFrame(render); },
  });
  Object.entries(LABELS).forEach(([k, v]) => tl.addLabel(k, v));
  tl.to({}, { duration: 1 }, 0); // gives the timeline its 0..1 length; everything else is derived from progress

  function render() {
    raf = 0;
    const p = tl.progress();
    const f = frontOf(p);
    setStep(stepOf(p, f));
    if (Math.abs(p - lastP) < 0.002 && p > 0 && p < 1) return; // sub-pixel change: skip the redraw
    lastP = p;
    const fy = `translate3d(0,${(f * 100).toFixed(2)}%,0)`;
    fronts.forEach((el) => put(el, fy));
    const loose = W ? draw(ctx, ps, f, W, H) : 1;
    put(bar, `scaleX(${loose})`);
    const n = Math.round(loose * 100);
    if (n !== lastPct) { pct.textContent = `${n}%`; lastPct = n; }
    put(rail, `scaleX(${f.toFixed(4)})`);
    put(stream, `scaleY(${clamp01((p - OUT_AT) / (1 - OUT_AT)).toFixed(4)})`);
  }
  const size = () => {
    W = win.clientWidth; H = win.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastP = -1;
    render();
  };
  size();
  onRefresh(size);

  // bands, callouts and rail ticks jump to their stage; focusing the hidden CTAs brings the closing into view
  const jump = (label, immediate) => scrollTo(tl.scrollTrigger.labelToScroll(label), { offset: 0, immediate });
  [...groups.band, ...groups.callout, ...groups.tick].forEach((el) => on(el, 'click', () => jump(`s${el.dataset.i}`)));
  on(root.querySelector('.et__out'), 'focusin', () => { if (step !== 7) jump('out', true); });

  return () => { cancelAnimationFrame(raf); reset(); };
});
