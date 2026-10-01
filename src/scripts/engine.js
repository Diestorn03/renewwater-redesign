/*
  Motion engine — GSAP 3.15 (ScrollTrigger, SplitText, DrawSVG) + Lenis, View Transitions aware.
  Recycled from the Experts DDT redesign and trimmed to the shared, data-attribute driven parts.

  Built-ins (declarative, any page):
    [data-reveal="up|down|left|right|scale|blur|clip|drop|iris"] [data-delay] [data-start]
    [data-stagger="0.08"]   children enter in sequence
    [data-split="chars|words|lines"] [data-delay]   SplitText entrance (after fonts are ready)
    [data-lit]              word-by-word scroll lighting
    [data-parallax="0.2"]   scrubbed yPercent drift (desktop gate only)
    [data-depth="0..5"]     depth-layer parallax (desktop gate only)
    [data-count="500"] [data-prefix="+"] [data-suffix="%"]   count-up once in view
    [data-draw]             DrawSVG every path/line/circle inside, once in view (data-draw="scrub" to scrub)
    [data-magnetic] [data-tilt] [data-glow]   pointer effects (desktop gate only; data-glow sets --gx/--gy)
    .marquee > .marquee__track   scroll-speed reactive marquee (track content is duplicated automatically)
    .stack-card             cascading card stack (desktop gate only)

  Sections with their own logic register once, at module level, from their component <script>:

    import { onPage } from '../../scripts/engine.js';
    onPage(({ gsap, ScrollTrigger, env, lenis, scrollTo, introGate, emit }) => {
      const root = document.querySelector('#etapas');
      if (!root) return;                 // runs on EVERY page load: bail out when the section is not on this page
      ...create tweens / ScrollTriggers (auto-reverted on navigation, they live in a gsap.context)...
      return () => { ...remove listeners, cancel rAF, lose WebGL context... };
    });

  Gates:  env.desktop  = (min-width:768px) and (pointer:fine), unless the visitor chose calm motion
          env.reduced  = html.rw-calm (footer switch; the OS reduce-motion setting is deliberately not used)
          env.coarse   = pointer: coarse
  Pins, scrubs, WebGL, Lenis, tilt, magnetic and cursor effects only run when env.desktop is true.
  introGate() resolves when the loader has finished (event 'rw:loader-done') or right away when there is no loader.
*/
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
// Lenis is driven by gsap.ticker: tweens and scrubs must follow real time, never a lag-smoothed clock, or they drift
// out of sync with the scroll after any slow frame (the Hero's async timelines also rely on this).
gsap.ticker.lagSmoothing(0);

export const DESKTOP_QUERY = '(min-width: 768px) and (pointer: fine)';
const mqDesktop = window.matchMedia(DESKTOP_QUERY);
const mqCoarse = window.matchMedia('(pointer: coarse)');
// Motion is on for everyone. html.rw-calm (set from localStorage 'rw-motion' by Base.astro, toggled by the footer
// switch) is the only "reduce" signal; CSS media queries on prefers-reduced-motion are rewritten to it at build time.
export const storedCalm = () => { try { return localStorage.getItem('rw-motion') === 'calm'; } catch { return false; } };
const calm = () => document.documentElement.classList.contains('rw-calm');
export const env = {
  get desktop() { return mqDesktop.matches && !calm(); },
  get reduced() { return calm(); },
  get coarse() { return mqCoarse.matches; },
  get mobile() { return !env.desktop; },
};

// Pinned scenes must not initialise mid-scroll after a reload.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

let lenis = null;
let ctx = null;
let booted = false;
const registry = [];
const cleanups = [];
const pageHooks = [];

export const getLenis = () => lenis;
// benchmark builds only (PUBLIC_BENCH=1 npm run build): lets the scroll benchmark switch subsystems off; stripped otherwise
if (import.meta.env.PUBLIC_BENCH) window.__rw = { gsap, ScrollTrigger, getLenis };
export const onRefresh = (fn) => { ScrollTrigger.addEventListener('refresh', fn); pageHooks.push(fn); };
export const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
export function scrollTo(target, opts = {}) {
  const offset = opts.offset ?? -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72);
  if (lenis) return lenis.scrollTo(target, { offset, ...opts });
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  const y = typeof target === 'number' ? target : el ? el.getBoundingClientRect().top + window.scrollY + offset : 0;
  window.scrollTo({ top: y, behavior: env.reduced || opts.immediate ? 'auto' : 'smooth' });
}
export function introGate() {
  const loader = document.getElementById('loader');
  if (!loader || loader.classList.contains('is-done')) return Promise.resolve();
  return Promise.race([
    // 'rw:loader-exit' fires when the loader's exit wipe starts, so the hero intro overlaps it instead of following it
    new Promise((r) => document.addEventListener('rw:loader-exit', r, { once: true })),
    new Promise((r) => document.addEventListener('rw:loader-done', r, { once: true })),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
}
const fontsReady = () => Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 900))]);

const api = () => ({ gsap, ScrollTrigger, SplitText, env, lenis, scrollTo, introGate, emit, onRefresh, getLenis, late: () => late });

/** Register a per-page initialiser (see header). Called on every page load; return an optional cleanup. */
export function onPage(fn) {
  registry.push(fn);
  if (booted && ctx) runInit(fn); // module loaded after this page booted (client-side navigation)
}
function runInit(fn) {
  try {
    let cleanup;
    ctx.add(() => { cleanup = fn(api()); });
    if (typeof cleanup === 'function') cleanups.push(cleanup);
  } catch (e) { console.error('[engine] section init failed', e); }
  queueRefresh();
}
let refreshQueued = false;
function queueRefresh() {
  if (refreshQueued) return; refreshQueued = true;
  requestAnimationFrame(() => { refreshQueued = false; ScrollTrigger.sort(); ScrollTrigger.refresh(); });
}

/* ---------------- Lenis (desktop gate only) ---------------- */
function syncLenis() {
  if (env.desktop && !lenis) {
    lenis = new Lenis({ lerp: 0.14, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(lenisRaf);
  } else if (!env.desktop && lenis) {
    gsap.ticker.remove(lenisRaf);
    lenis.destroy(); lenis = null;
  }
}
const lenisRaf = (t) => lenis?.raf(t * 1000);
// in-page anchors go through Lenis / smooth scroll with the header offset
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="#"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
  const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!el) return;
  e.preventDefault();
  // going down hides the header (chrome.js), so the target goes flush to the top; going up the header shows, keep its offset
  scrollTo(el, el.getBoundingClientRect().top > 0 ? { offset: 0 } : {});
  // keyboard users continue from the target, not from <body>
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  history.replaceState(history.state, '', url.hash);
}, true); // capture: ClientRouter's own click listener would claim the link first

/* ---------------- Reveals ---------------- */
const REVEALS = {
  up: { y: 56, opacity: 0 }, down: { y: -56, opacity: 0 }, left: { x: -72, opacity: 0 }, right: { x: 72, opacity: 0 },
  scale: { scale: .88, opacity: 0 }, blur: { y: 30, opacity: 0, filter: 'blur(10px)' },
  clip: { clipPath: 'inset(0 100% 0 0)', opacity: 1 }, drop: { clipPath: 'inset(0 0 100% 0)', opacity: 1 }, iris: { clipPath: 'circle(0% at 50% 50%)', opacity: 1 },
};
// late = the CSS safety net already showed the content (html.fx-fallback, JS took > 4 s): whatever is on screen keeps
// its final state instead of blinking out and replaying; the rest of the page animates normally.
let late = false;
const settled = (el) => late && ScrollTrigger.isInViewport(el);
function initReveals() {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    if (env.reduced || settled(el)) { gsap.set(el, { opacity: 1 }); return; }
    const type = el.dataset.reveal || 'up';
    const from = REVEALS[type] || REVEALS.up;
    const clip = ['clip', 'drop', 'iris'].includes(type);
    const to = { x: 0, y: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: clip ? 1.2 : .9, ease: 'expo.out', delay: +(el.dataset.delay || 0), clearProps: 'filter,transform' };
    if (type === 'clip') to.clipPath = 'inset(0 0% 0 0)';
    if (type === 'drop') to.clipPath = 'inset(0 0 0% 0)';
    if (type === 'iris') to.clipPath = 'circle(75% at 50% 50%)';
    gsap.fromTo(el, from, { ...to, scrollTrigger: { trigger: el, start: el.dataset.start || 'top 88%', once: true, onEnter: () => el.classList.add('is-inview') } });
  });
  gsap.utils.toArray('[data-stagger]').forEach((group) => {
    const kids = [...group.children];
    if (env.reduced || settled(group)) { gsap.set(kids, { opacity: 1 }); return; }
    gsap.fromTo(kids, { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: +(group.dataset.stagger || .08), clearProps: 'transform', scrollTrigger: { trigger: group, start: group.dataset.start || 'top 85%', once: true } });
  });
}

/* ---------------- Text ---------------- */
function initSplits() {
  gsap.utils.toArray('[data-split]').forEach((el) => {
    el.style.visibility = 'visible';
    if (env.reduced || settled(el)) return;
    const mode = env.coarse && el.dataset.split === 'chars' ? 'words' : el.dataset.split || 'lines';
    const split = new SplitText(el, { type: mode === 'chars' ? 'chars,words' : mode === 'words' ? 'words' : 'lines', mask: mode === 'lines' ? 'lines' : undefined, linesClass: 'split-line', wordsClass: 'split-word', charsClass: 'split-char' });
    const targets = mode === 'chars' ? split.chars : mode === 'words' ? split.words : split.lines;
    const trig = { trigger: el, start: el.dataset.start || 'top 88%', once: true, onEnter: () => el.classList.add('is-inview') };
    const delay = +(el.dataset.delay || 0);
    if (mode === 'chars') gsap.from(targets, { yPercent: 110, opacity: 0, filter: 'blur(8px)', duration: .9, ease: 'expo.out', stagger: .02, delay, clearProps: 'filter', scrollTrigger: trig });
    else if (mode === 'words') gsap.from(targets, { yPercent: 100, opacity: 0, duration: .8, ease: 'expo.out', stagger: .05, delay, scrollTrigger: trig });
    else gsap.from(targets, { yPercent: 110, duration: .95, ease: 'expo.out', stagger: .1, delay, scrollTrigger: trig });
  });
}
function initLit() {
  gsap.utils.toArray('[data-lit]').forEach((el) => {
    el.style.visibility = 'visible';
    if (env.reduced) return;
    // aria 'none': the default puts aria-label on the <p> (ignored on paragraphs) and hides every word, so it read as empty
    const split = new SplitText(el, { type: 'words', wordsClass: 'lit-word', aria: 'none' });
    // long paragraphs finish lighting by the time they are centred (they used to end with their last lines still dim)
    gsap.fromTo(split.words, { opacity: .3 }, { opacity: 1, stagger: .02, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: () => (el.offsetHeight > innerHeight * .35 ? 'center 55%' : 'bottom 70%'), scrub: true, invalidateOnRefresh: true } });
  });
}

/* ---------------- Parallax ---------------- */
function initParallax() {
  if (!env.desktop) return;
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    const amt = parseFloat(el.dataset.parallax || '0.2');
    gsap.set(el, { willChange: 'transform' }); // scrubbed every frame: keep it on its own layer so it never repaints
    gsap.fromTo(el, { yPercent: amt * 40 }, { yPercent: -amt * 40, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  const factors = { 0: .1, 1: .25, 2: .5, 3: .8, 4: 1, 5: 1.2 };
  gsap.utils.toArray('[data-depth]').forEach((el) => {
    const f = factors[el.dataset.depth] ?? 1;
    if (f === 1) return;
    gsap.set(el, { willChange: 'transform' });
    gsap.to(el, { yPercent: -36 * (1 - f), ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---------------- Counters ---------------- */
function initCounters() {
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const fmt = (v) => `${el.dataset.prefix || ''}${Math.round(v).toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'es-US')}${el.dataset.suffix || ''}`;
    if (env.reduced) { el.textContent = fmt(target); return; }
    el.textContent = fmt(0);
    const obj = { v: 0 };
    gsap.to(obj, { v: target, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => { if (el.hasAttribute('data-count')) el.textContent = fmt(obj.v); } });
  });
}

/* ---------------- SVG drawing ---------------- */
function initDraw() {
  gsap.utils.toArray('[data-draw]:not(.lm)').forEach((svg) => {
    const paths = svg.querySelectorAll('path, line, polyline, polygon, circle, rect, ellipse');
    if (!paths.length || env.reduced) return;
    if (svg.dataset.draw === 'scrub') {
      gsap.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', stagger: .05, scrollTrigger: { trigger: svg, start: 'top 80%', end: 'bottom 60%', scrub: true } });
    } else {
      // measured lazily: DrawSVG's getTotalLength/getBBox only run for SVGs that reach the viewport (boot reflows otherwise);
      // until then the strokes are simply transparent, which looks the same as drawn to 0%
      gsap.set(paths, { strokeOpacity: 0 });
      ScrollTrigger.create({ trigger: svg, start: 'top 88%', once: true, onEnter: () => {
        gsap.set(paths, { clearProps: 'strokeOpacity' });
        gsap.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.1, ease: 'power2.inOut', stagger: .08, delay: +(svg.dataset.delay || 0) });
      } });
    }
  });
}

/* ---------------- Card stack ---------------- */
function initStack() {
  const cards = gsap.utils.toArray('.stack-card');
  if (!cards.length || !env.desktop) return;
  cards.forEach((card, i) => {
    if (i === cards.length - 1) return;
    const st = { trigger: cards[i + 1], start: 'top 85%', end: 'top 15%', scrub: true };
    gsap.to(card, { scale: .94 - (cards.length - 2 - i) * .02, rotate: i % 2 ? 1.5 : -1.5, ease: 'none', scrollTrigger: st });
    // the content dims to .35 under a card-coloured veil on its own GPU layer: fading the children themselves would
    // repaint the whole card on every scroll frame
    const veil = card.querySelector(':scope > .stack-veil') || card.appendChild(Object.assign(document.createElement('span'), { className: 'stack-veil' }));
    veil.setAttribute('aria-hidden', 'true');
    gsap.fromTo(veil, { opacity: 0 }, { opacity: .65, ease: 'none', scrollTrigger: { ...st } });
  });
}

/* ---------------- Marquee (scroll-speed reactive, one ticker per session) ---------------- */
// The ticker only runs while a marquee is on screen, and it never reads layout: the scroll position comes from a passive
// scroll listener (reading window.scrollY inside the tick forced a style/layout flush on every frame).
let marqueeTick, marqueeIO, marqueeAbort;
function initMarquee() {
  if (marqueeTick) gsap.ticker.remove(marqueeTick);
  marqueeIO?.disconnect(); marqueeAbort?.abort();
  marqueeTick = null;
  const items = gsap.utils.toArray('.marquee').map((m) => {
    const track = m.querySelector('.marquee__track');
    if (!track) return null;
    if (!track.dataset.cloned) {
      [...track.children].forEach((c) => { const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); k.querySelectorAll('a, button').forEach((f) => f.setAttribute('tabindex', '-1')); track.appendChild(k); });
      track.dataset.cloned = '1';
    }
    const dir = m.dataset.direction === 'right' ? -1 : 1;
    const it = { el: m, track, x: 0, half: track.scrollWidth / 2, visible: false, held: false, dir, speed: +(m.dataset.speed || .6) };
    if (dir < 0) it.x = -it.half;
    return it;
  }).filter(Boolean);
  if (!items.length || env.reduced) return;
  onRefresh(() => items.forEach((it) => { it.half = it.track.scrollWidth / 2; }));
  let vel = 0, sy = window.scrollY, last = sy, running = false;
  marqueeAbort = new AbortController();
  const signal = marqueeAbort.signal;
  window.addEventListener('scroll', () => { sy = window.scrollY; }, { passive: true, signal });
  // WCAG 2.2.2: a marquee holds still while it is hovered or holds keyboard focus, and its pause button ([data-paused]) stops it
  items.forEach((it) => {
    const hold = (v) => () => { it.held = v; };
    it.el.addEventListener('pointerenter', hold(true), { signal });
    it.el.addEventListener('pointerleave', hold(false), { signal });
    it.el.addEventListener('focusin', hold(true), { signal });
    it.el.addEventListener('focusout', (e) => { it.held = it.el.contains(e.relatedTarget); }, { signal });
  });
  marqueeTick = () => {
    const dy = sy - last; last = sy;
    vel = Math.min(14, Math.abs(dy) * .3 + vel * .9);
    items.forEach((it) => {
      if (!it.visible || it.held || it.el.hasAttribute('data-paused')) return;
      it.x -= (it.speed + vel) * it.dir;
      if (-it.x >= it.half) it.x += it.half;
      if (it.x > 0) it.x -= it.half;
      it.track.style.transform = `translate3d(${it.x}px,0,0)`;
    });
  };
  marqueeIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { const it = items.find((i) => i.el === e.target); if (it) it.visible = e.isIntersecting; });
    const any = items.some((it) => it.visible);
    if (any && !running) { last = sy; gsap.ticker.add(marqueeTick); running = true; }
    else if (!any && running) { gsap.ticker.remove(marqueeTick); running = false; }
  });
  items.forEach((it) => marqueeIO.observe(it.el));
}

// pause/play button inside a marquee (<button data-marquee-toggle aria-pressed="false">), bound once for every page
document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('[data-marquee-toggle]');
  const m = btn?.closest('.marquee');
  if (!m) return;
  const paused = m.toggleAttribute('data-paused');
  btn.setAttribute('aria-pressed', String(paused));
});

/* ---------------- Pointer effects ---------------- */
// listeners are bound per page view and dropped on teardown (the header persists across navigations)
let fxAbort = null;
function initPointerFx() {
  fxAbort?.abort(); fxAbort = new AbortController();
  const signal = fxAbort.signal;
  if (!env.desktop) return;
  gsap.utils.toArray('[data-tilt]').forEach((card) => {
    const max = +(card.dataset.tilt || 6);
    const setX = gsap.quickTo(card, 'rotationY', { duration: .5, ease: 'power3' });
    const setY = gsap.quickTo(card, 'rotationX', { duration: .5, ease: 'power3' });
    gsap.set(card, { transformPerspective: 1000 });
    card.addEventListener('pointermove', (e) => { const r = card.getBoundingClientRect(); setX(((e.clientX - r.left) / r.width - .5) * max * 2); setY(-((e.clientY - r.top) / r.height - .5) * max * 2); }, { signal });
    card.addEventListener('pointerleave', () => { setX(0); setY(0); }, { signal });
  });
  gsap.utils.toArray('[data-magnetic]').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: .4, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: .4, ease: 'power3' });
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); mx(Math.max(-6, Math.min(6, (e.clientX - r.left - r.width / 2) * .25))); my(Math.max(-6, Math.min(6, (e.clientY - r.top - r.height / 2) * .25))); }, { signal });
    el.addEventListener('pointerleave', () => { mx(0); my(0); }, { signal });
  });
  gsap.utils.toArray('[data-glow]').forEach((el) => {
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--gx', `${e.clientX - r.left}px`); el.style.setProperty('--gy', `${e.clientY - r.top}px`); }, { signal });
  });
}

/* ---------------- Offscreen sections: pause their CSS animations ---------------- */
// Infinite CSS animations (pings, drifts, pulses) keep invalidating style every frame even when far off screen,
// which makes every ScrollTrigger/Lenis read force a style recalc. Sections > 1 viewport away get [data-offscreen].
let offIO = null;
function initOffscreen() {
  offIO?.disconnect();
  offIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) e.target.removeAttribute('data-offscreen'); else e.target.setAttribute('data-offscreen', '');
  }), { rootMargin: '100% 0px' });
  document.querySelectorAll('main > section, main > * > section, body > footer').forEach((s) => offIO.observe(s));
}

/* ---------------- Boot / teardown (View Transitions aware) ---------------- */
function teardown() {
  fxAbort?.abort();
  offIO?.disconnect();
  marqueeIO?.disconnect(); marqueeAbort?.abort();
  if (marqueeTick) { gsap.ticker.remove(marqueeTick); marqueeTick = null; }
  cleanups.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  ctx?.revert(); ctx = null;
  pageHooks.splice(0).forEach((fn) => ScrollTrigger.removeEventListener('refresh', fn));
  ScrollTrigger.getAll().forEach((t) => t.kill());
  booted = false;
}
// How the current page was reached (astro:before-preparation): 'traverse' = Back/Forward
let navType = 'push';
let savedY = null;
function boot() {
  teardown();
  const root = document.documentElement;
  // safety-net contract with Base.astro / base.css: html.fx-fallback = the CSS showed the content after 4 s without JS
  late = root.classList.contains('fx-fallback');
  root.classList.remove('fx-fallback');
  root.classList.add('fx-ready');
  syncLenis();
  root.classList.toggle('is-desktop-fx', env.desktop);
  ctx = gsap.context(() => {});
  // section modules first (they create the pins), then the declarative built-ins; sort() fixes creation order
  registry.forEach(runInit);
  ctx.add(() => { initReveals(); initParallax(); initCounters(); initDraw(); initStack(); initMarquee(); initPointerFx(); });
  initOffscreen();
  const gen = ctx; // a fast navigation must not split the next page's text from this page's late promise
  fontsReady().then(() => { if (ctx !== gen) return; ctx.add(() => { initSplits(); initLit(); }); queueRefresh(); });
  booted = true;
  queueRefresh();
  // Scroll position, once the pins exist (they add their spacers above everything below them): the #hash target,
  // or the saved position on Back/Forward. ClientRouter restores scroll before the pins are built, so it lands short.
  const how = navType, y0 = savedY; navType = 'push'; savedY = null;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (ctx !== gen) return;
    lenis?.resize(); // it still holds the previous page's scroll limit and would clamp the target to it
    const el = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (how === 'traverse' && y0 != null) scrollTo(y0, { immediate: true, offset: 0 });
    else if (el) { scrollTo(el, { immediate: true, offset: 0 }); hashLanding = { el, y: window.scrollY }; emit('rw:landed'); } // a jump down: the header hides
  }));
}

// First page: boot as soon as the DOM is parsed (every deferred module, i.e. every section, has registered by then).
// Waiting for astro:page-load meant waiting for every image, so first-viewport reveals started seconds late.
let first = true;
// Module scripts execute while readyState is already 'interactive', before DOMContentLoaded: waiting for it lets every
// section module register first (the astro:page-load handler below covers a module that loads later than that).
if (document.readyState === 'complete') queueMicrotask(() => { if (!booted) boot(); });
else document.addEventListener('DOMContentLoaded', () => { if (!booted) boot(); }, { once: true });
document.addEventListener('astro:page-load', () => { if (first) { first = false; if (booted) return; } boot(); });
// late images change section heights; a #hash landing is re-aimed once if the visitor has not scrolled since
let hashLanding = null;
window.addEventListener('load', () => {
  ScrollTrigger.refresh();
  const h = hashLanding; hashLanding = null;
  if (h?.el.isConnected && Math.abs(window.scrollY - h.y) < 2) { lenis?.resize(); scrollTo(h.el, { immediate: true, offset: 0 }); emit('rw:landed'); }
}, { once: true });
document.addEventListener('astro:before-preparation', (e) => {
  navType = e.navigationType || 'push';
  savedY = navType === 'traverse' ? history.state?.scrollY ?? null : null;
});
document.addEventListener('astro:before-swap', (e) => {
  teardown();
  // the incoming <html> replaces these classes: give it the final ones so Astro restores scroll in the real layout
  const now = document.documentElement.classList, next = e.newDocument.documentElement.classList;
  next.add('js');
  next.toggle('rw-calm', storedCalm());
  ['is-desktop-fx', 'lenis', 'lenis-smooth'].forEach((c) => next.toggle(c, now.contains(c)));
});
// ClientRouter swaps <html> attributes: restore the `js` class the head script set on the first load
document.addEventListener('astro:after-swap', () => {
  document.documentElement.classList.add('js');
  document.documentElement.classList.toggle('rw-calm', storedCalm());
  document.getElementById('loader')?.remove(); // the intro only plays on the first page of a visit
  // a new page starts at the top; hash targets and Back/Forward positions are restored by boot() once the pins exist
  if (navType !== 'traverse' && !location.hash) { window.scrollTo(0, 0); lenis?.scrollTo(0, { immediate: true }); }
});
// Crossing the desktop breakpoint rebuilds every scene: rebuild from the top (pins must not initialise mid-scroll),
// then return to the section the visitor was reading.
let bpTimer;
const rebootOnChange = () => {
  clearTimeout(bpTimer);
  bpTimer = setTimeout(() => {
    const here = [...document.querySelectorAll('main section[id]')].find((s) => s.getBoundingClientRect().bottom > 0);
    window.scrollTo(0, 0); boot();
    requestAnimationFrame(() => requestAnimationFrame(() => { lenis?.resize(); if (here?.isConnected) scrollTo(here, { immediate: true, offset: 0 }); }));
  }, 150);
};
mqDesktop.addEventListener('change', rebootOnChange);
