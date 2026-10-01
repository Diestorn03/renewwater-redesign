/*
  Chrome behaviour (A1): header, mobile menu, floating CTAs, footer, El Hilo, La Onda origin.
  Imported once by Header.astro. Page-level parts register through the engine's onPage (re-run on every
  astro:page-load, cleaned up before the next swap); document-level listeners are bound once here.
*/
import { onPage, getLenis } from './engine.js';

const root = document.documentElement;
const raf = (fn) => { let id = 0; const run = () => { id = 0; fn(); }; const req = () => { if (!id) id = requestAnimationFrame(run); }; req.cancel = () => cancelAnimationFrame(id); return req; };

/* ---------- La Onda: circle origin at the click point (html attributes are replaced on swap, so re-apply) ---------- */
let origin = null;
const isInternal = (a) => a instanceof HTMLAnchorElement && a.origin === location.origin && !a.target && !a.hasAttribute('download') && !(a.pathname === location.pathname && a.hash);
const setOrigin = (x, y) => { origin = { x, y, t: Date.now() }; applyOrigin(); };
function applyOrigin() {
  if (!origin || Date.now() - origin.t > 5000) return;
  root.style.setProperty('--vt-x', `${Math.round(origin.x)}px`);
  root.style.setProperty('--vt-y', `${Math.round(origin.y)}px`);
}
document.addEventListener('pointerdown', (e) => { const a = e.target.closest?.('a[href]'); if (isInternal(a)) setOrigin(e.clientX, e.clientY); }, { capture: true, passive: true });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const a = e.target.closest?.('a[href]');
  if (!isInternal(a)) return;
  const r = a.getBoundingClientRect();
  setOrigin(r.left + r.width / 2, r.top + r.height / 2);
}, true);
document.addEventListener('astro:after-swap', () => {
  root.classList.add('js'); // Base adds it from <head> once; ClientRouter's root-attribute swap drops it
  applyOrigin();
  origin = null;
  closeMenu(true);
});
// the language switch keeps the current #hash
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('[data-lang-alt]');
  if (a && location.hash) a.href = a.href.split('#')[0] + location.hash;
}, true);

/* ---------- Motion switch (footer): everything animates by default; this opts out, remembered per browser ---------- */
document.addEventListener('click', (e) => {
  if (!e.target.closest?.('[data-motion-toggle]')) return;
  try { localStorage.setItem('rw-motion', root.classList.contains('rw-calm') ? 'full' : 'calm'); } catch { return; }
  location.reload(); // pins, WebGL and Lenis are built at boot: reloading switches all of them at once
});
onPage(() => {
  document.querySelectorAll('[data-motion-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(root.classList.contains('rw-calm'))));
});

/* ---------- Mobile menu (lives in the persisted header: bound once per header element) ---------- */
let menu = null;
const menuOpen = () => !!menu?.open;
function openMenu(btn) {
  menu = document.getElementById('rw-menu');
  if (!menu || menu.open) return;
  const r = btn.getBoundingClientRect();
  menu.style.setProperty('--mx', `${r.left + r.width / 2}px`);
  menu.style.setProperty('--my', `${r.top + r.height / 2}px`);
  menu.showModal();
  root.classList.add('menu-open');
  getLenis()?.stop();
  btn.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
  document.dispatchEvent(new CustomEvent('rw:menu', { detail: { open: true } }));
}
function closeMenu(now = false) {
  if (!menu?.open) return;
  const dlg = menu;
  dlg.classList.remove('is-open');
  const finish = () => {
    if (!dlg.open) return;
    dlg.close();
    root.classList.remove('menu-open');
    getLenis()?.start();
    document.querySelector('[data-menu-open]')?.setAttribute('aria-expanded', 'false');
    document.dispatchEvent(new CustomEvent('rw:menu', { detail: { open: false } }));
  };
  if (now || root.classList.contains('rw-calm')) finish(); else setTimeout(finish, 380);
}
function bindHeader(hdr) {
  if (hdr.dataset.bound) return;
  hdr.dataset.bound = '1';
  hdr.querySelector('[data-menu-open]')?.addEventListener('click', (e) => openMenu(e.currentTarget));
  const dlg = hdr.querySelector('#rw-menu');
  if (!dlg) return;
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeMenu(); });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-menu-close]')) closeMenu();
    // links to the page we are on just close the menu
    const a = e.target.closest('a[href]');
    if (a && isInternal(a) && a.pathname === location.pathname && !a.hash) { e.preventDefault(); closeMenu(); }
  });
  // the menu is only for < 1100px
  matchMedia('(min-width: 1100px)').addEventListener('change', (m) => { if (m.matches) closeMenu(true); });
}

/* ---------- Header: active link, language link, glass, hide on scroll down, theme of the section below ---------- */
onPage(() => {
  const hdr = document.querySelector('.hdr');
  if (!hdr) return;
  bindHeader(hdr);
  menu = document.getElementById('rw-menu');

  const here = location.pathname.replace(/\/?$/, '/');
  hdr.querySelectorAll('a[data-nav]').forEach((a) => {
    const p = a.pathname.replace(/\/?$/, '/');
    const on = a.dataset.nav === 'home' ? p === here : here.startsWith(p);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  hdr.querySelectorAll('a[data-lang-alt]').forEach((a) => {
    const link = document.querySelector(`link[rel="alternate"][hreflang="${a.getAttribute('hreflang')}"]`);
    if (link) a.href = new URL(link.href).pathname; // pathname only: the tag carries the production origin
  });

  // scrollY is read in the scroll event (layout is clean there), never inside the rAF that runs after GSAP's writes
  let lastY = window.scrollY, sy = lastY;
  const update = raf(() => {
    const y = sy;
    hdr.classList.toggle('is-scrolled', y > 80);
    if (y < 400) { hdr.classList.remove('is-hidden'); lastY = y; return; }
    const d = y - lastY;
    if (Math.abs(d) < 8) return;
    hdr.classList.toggle('is-hidden', d > 0 && !menuOpen());
    lastY = y;
  });
  hdr.classList.remove('is-hidden');
  update();
  const onScroll = () => { sy = window.scrollY; update(); };
  window.addEventListener('scroll', onScroll, { passive: true });

  const zones = [...document.querySelectorAll('main section[data-theme], footer[data-theme]')];
  const under = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? under.add(e.target) : under.delete(e.target)));
    const cur = zones.filter((z) => under.has(z)).pop(); // innermost / last in document order
    if (cur) hdr.dataset.theme = cur.dataset.theme;
  }, { rootMargin: '0px 0px -95% 0px' });
  zones.forEach((z) => io.observe(z));

  return () => { window.removeEventListener('scroll', onScroll); update.cancel(); io.disconnect(); };
});

/* ---------- Floating WhatsApp + mobile action bar ---------- */
onPage(({ onRefresh }) => {
  const fab = document.querySelector('.fab');
  const bar = document.querySelector('.abar');
  if (!fab && !bar) return;
  const hero = document.getElementById('inicio');
  const blocking = new Set();
  let menuIsOpen = menuOpen();

  // the hero's bottom (document coordinates) is measured on boot and on every ScrollTrigger refresh, not per frame
  let sy = window.scrollY, heroBottom = 0, pinned = false;
  const measure = () => {
    if (!hero) return;
    const spacer = hero.parentElement?.classList.contains('pin-spacer') ? hero.parentElement : null;
    pinned = !!spacer;
    heroBottom = (spacer || hero).getBoundingClientRect().bottom + window.scrollY;
  };
  measure();
  onRefresh(measure);
  // pinned hero: show at ~75% of the pin, when its CTAs have faded; otherwise once most of the hero has gone
  const pastHero = () => (hero ? heroBottom - sy < window.innerHeight * (pinned ? 1.25 : 0.75) : sy > window.innerHeight);
  const update = raf(() => {
    const show = pastHero() && !blocking.size && !menuIsOpen;
    fab?.classList.toggle('is-shown', show);
    bar?.classList.toggle('is-shown', show);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? blocking.add(e.target) : blocking.delete(e.target)));
    update();
  }, { rootMargin: '-15% 0px -15% 0px' });
  // hidden over the lab and the final CTA (they carry their own WhatsApp buttons) and over the closing wordmark
  document.querySelectorAll('#laboratorio, #encuentranos, .ftr__giant').forEach((el) => io.observe(el));

  const onMenu = (e) => { menuIsOpen = e.detail.open; update(); };
  let closeTimer;
  const openPill = () => {
    if (!fab) return;
    fab.classList.add('is-open');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => fab.classList.remove('is-open'), 4000);
  };
  const label = fab?.querySelector('.fab__label');
  if (label) fab.style.setProperty('--open-w', `${60 + label.scrollWidth}px`);
  const onScroll = () => { sy = window.scrollY; update(); };
  const onResize = () => { measure(); update(); };
  document.addEventListener('rw:etapas-complete', openPill);
  document.addEventListener('rw:menu', onMenu);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  update();

  return () => {
    io.disconnect(); update.cancel(); clearTimeout(closeTimer);
    document.removeEventListener('rw:etapas-complete', openPill);
    document.removeEventListener('rw:menu', onMenu);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
  };
});

/* ---------- El Hilo: one thread down the left margin of <main> ---------- */
const hiloOn = (env) => matchMedia('(min-width: 1024px)').matches && (env.desktop || env.reduced);
onPage(({ gsap, env }) => {
  const hilo = document.querySelector('.hilo');
  if (!hilo) return;
  const on = hiloOn(env);
  hilo.classList.toggle('is-on', on);
  if (!on) return;
  const main = hilo.parentElement;
  const svg = hilo.querySelector('svg');
  const line = hilo.querySelector('.hilo__line');
  const ghost = hilo.querySelector('.hilo__ghost');
  const grad = hilo.querySelector('.hilo__grad');
  const tip = hilo.querySelector('.hilo__tip');
  let total = 1, height = 0, top = 0;
  let lut = new Float32Array(4), steps = 1; // tip positions sampled along the path once per build, never per frame
  const state = { p: env.reduced ? 1 : 0 };

  const draw = () => {
    line.style.strokeDashoffset = `${1 - state.p}`;
    const f = state.p * steps, i = Math.min(steps - 1, Math.floor(f)), t = f - i;
    const x = lut[2 * i] + (lut[2 * i + 2] - lut[2 * i]) * t, y = lut[2 * i + 1] + (lut[2 * i + 3] - lut[2 * i + 1]) * t;
    tip.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    hilo.classList.toggle('is-drawing', state.p > 0.002 && state.p < 0.998);
  };
  // drawn tip sits at 70% of the viewport; progress comes straight from the scroll position, so pins and
  // late-loading images inside <main> never leave it out of sync (main's size is watched below)
  const target = () => Math.min(1, Math.max(0, (window.scrollY + window.innerHeight * 0.7 - top) / height));
  const follow = env.reduced ? null : gsap.quickTo(state, 'p', { duration: 0.6, ease: 'power3', onUpdate: draw });
  const onScroll = () => follow?.(target());
  const build = () => {
    top = main.getBoundingClientRect().top + window.scrollY;
    const H = Math.max(1, Math.round(main.offsetHeight));
    if (H !== height) {
      height = H;
      // gentle S-curves every ~820px; the tangent keeps its sign so the joins are smooth
      const n = Math.max(1, Math.round(H / 820)), L = H / n;
      let d = 'M24 0';
      for (let i = 0; i < n; i++) {
        const y = i * L, a = 7 + 3 * Math.sin(i * 1.7);
        d += `C${(24 + a).toFixed(1)} ${(y + L * 0.35).toFixed(1)} ${(24 - a).toFixed(1)} ${(y + L * 0.65).toFixed(1)} 24 ${(y + L).toFixed(1)}`;
      }
      svg.setAttribute('height', H);
      svg.setAttribute('viewBox', `0 0 48 ${H}`);
      grad.setAttribute('y2', H);
      line.setAttribute('d', d);
      ghost.setAttribute('d', d);
      total = line.getTotalLength();
      steps = Math.max(1, Math.ceil(total / 12)); // one sample per ~12px of thread, linearly interpolated in draw()
      lut = new Float32Array((steps + 1) * 2);
      for (let i = 0; i <= steps; i++) { const pt = line.getPointAtLength((total * i) / steps); lut[2 * i] = pt.x; lut[2 * i + 1] = pt.y; }
    }
    if (follow) { state.p = target(); follow(state.p); }
    draw();
  };
  const rebuild = raf(build);
  const ro = new ResizeObserver(rebuild);
  ro.observe(main);
  build();
  if (follow) window.addEventListener('scroll', onScroll, { passive: true });
  return () => { ro.disconnect(); rebuild.cancel(); window.removeEventListener('scroll', onScroll); };
});

/* ---------- Footer: thread into the mark, mark drawing, giant wordmark fill ---------- */
onPage(({ gsap, env, onRefresh }) => {
  const f = document.querySelector('.ftr:not(.ftr--min)');
  if (!f) return;
  const mark = f.querySelector('.ftr__mark');
  const win = f.querySelector('.ftr__fillwin');
  const fillIn = f.querySelector('.ftr__fillin');
  if (env.reduced) { mark?.classList.add('is-drawn'); return; }

  const thread = f.querySelector('.ftr__thread');
  const withThread = thread && mark && hiloOn(env) && env.desktop;
  let io;
  if (withThread) {
    // from the Hilo's x (24px) at the footer's top edge into the mark's top-left vertex, arriving horizontally
    // so it continues as the first triangle's top edge
    const path = thread.querySelector('path');
    const stop = thread.querySelector('linearGradient');
    const build = () => {
      const fr = f.getBoundingClientRect(), mr = mark.getBoundingClientRect();
      const x = mr.left - fr.left + mr.width * (3.8 / 170), y = mr.top - fr.top + mr.height * (21.1 / 140);
      path.setAttribute('d', `M24 0C24 ${(y * 0.62).toFixed(1)} ${(24 + (x - 24) * 0.25).toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`);
      thread.setAttribute('width', Math.ceil(x + 4)); thread.setAttribute('height', Math.ceil(y + 4));
      stop.setAttribute('y2', y.toFixed(1)); stop.setAttribute('x2', x.toFixed(1));
    };
    thread.classList.add('is-on');
    thread.style.willChange = 'transform'; // its dash is scrubbed every frame: repaint only this small layer
    build();
    onRefresh(build);
    gsap.fromTo(path, { strokeDashoffset: 1 }, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: {
        trigger: f, start: 'top bottom', end: 'top 45%', scrub: 0.6,
        onUpdate: (st) => mark.classList.toggle('is-drawn', st.progress > 0.97),
      },
    });
  } else if (mark) {
    io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { mark.classList.add('is-drawn'); io.disconnect(); } }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(mark);
  }

  if (win && fillIn) {
    // one timeline moves the window and counter-moves its content, so the two can never drift apart
    // x: 0 — GSAP would otherwise parse the CSS translateX(∓100%) into px and keep it under the xPercent tween
    const fill = (ease, vars) => gsap.timeline(vars)
      .fromTo(win, { x: 0, xPercent: -100 }, { xPercent: 0, ease }, 0)
      .fromTo(fillIn, { x: 0, xPercent: 116 }, { xPercent: 0, ease }, 0); // the window is 116% of the word wide
    if (env.desktop) fill('none', { scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });
    else fill('power2.inOut', { defaults: { duration: 1.6 }, scrollTrigger: { trigger: win.parentElement, start: 'top 92%', once: true } });
  }
  return () => { io?.disconnect(); f.querySelector('.ftr__thread')?.style.removeProperty('will-change'); };
});
