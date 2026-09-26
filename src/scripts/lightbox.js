/*
  Lightbox for <a data-lightbox="group" href="big.webp" data-caption="…"> (dialog markup: components/ui/Lightbox.astro).
  Module-level, delegated listeners: they survive ClientRouter swaps, and the dialog is looked up on each open.
  The click listener runs in the capture phase so it beats the ClientRouter's own link interception.
*/
import { env } from './engine.js';

const html = document.documentElement;
let s = null; // { dlg, img, links, i }

const group = (name) => {
  const seen = new Set();
  return [...document.querySelectorAll('a[data-lightbox]')].filter((a) =>
    a.dataset.lightbox === name && !a.closest('[aria-hidden="true"]') && !seen.has(a.href) && seen.add(a.href));
};
const morphEl = (a) => (a.hasAttribute('data-lb-morph') ? a : a.querySelector('img')) || a;
const onScreen = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
};
const canMorph = (el) => !!document.startViewTransition && !env.reduced && onScreen(el);

function morph(from, to, update) {
  from.style.viewTransitionName = 'lb-photo';
  html.classList.add('lb-vt');
  const vt = document.startViewTransition(async () => {
    from.style.viewTransitionName = '';
    to.style.viewTransitionName = 'lb-photo';
    await update();
  });
  vt.finished.finally(() => { to.style.viewTransitionName = ''; html.classList.remove('lb-vt'); });
}

function fill(i) {
  const { dlg, img, links } = s;
  const a = links[i];
  const thumb = a.querySelector('img');
  s.i = i;
  img.alt = thumb?.alt || a.getAttribute('aria-label') || '';
  if (thumb?.naturalWidth) img.style.setProperty('--ar', thumb.naturalWidth / thumb.naturalHeight);
  // show the already-decoded thumbnail at once, then swap in the full photo
  img.src = thumb?.currentSrc || a.href;
  const full = new Image();
  full.src = a.href;
  full.decode().then(() => {
    if (s?.links[s.i] !== a) return;
    img.style.setProperty('--ar', full.naturalWidth / full.naturalHeight);
    img.src = a.href;
  }).catch(() => {});
  dlg.querySelector('.lb__caption').textContent = a.dataset.caption || img.alt;
  const pad = (n) => String(n).padStart(2, '0');
  dlg.querySelector('.lb__count').textContent = `${pad(i + 1)} / ${pad(links.length)}`;
  dlg.classList.toggle('lb--single', links.length < 2);
  [links[(i + 1) % links.length], links[(i - 1 + links.length) % links.length]].forEach((n) => { new Image().src = n.href; });
  return img.decode().catch(() => {});
}

function open(link) {
  const dlg = document.getElementById('lightbox');
  if (!dlg) return false;
  const links = group(link.dataset.lightbox);
  let i = links.findIndex((a) => a.href === link.href);
  if (i < 0) { links.unshift(link); i = 0; }
  s = { dlg, img: dlg.querySelector('.lb__img'), links, i };
  const show = () => { dlg.showModal(); dlg.querySelector('.lb__close').focus({ preventScroll: true }); };
  const from = morphEl(link);
  if (canMorph(from)) {
    dlg.classList.remove('is-fading');
    morph(from, s.img, async () => { await fill(i); show(); });
  } else {
    dlg.classList.toggle('is-fading', !env.reduced);
    fill(i); show();
  }
  return true;
}

function close() {
  if (!s) return;
  const { dlg, img, links, i } = s;
  const back = links[i];
  s = null;
  const done = () => { dlg.close(); back.focus({ preventScroll: true }); };
  const to = morphEl(back);
  if (canMorph(to)) morph(img, to, done);
  else done();
}

function go(d) {
  if (!s || s.links.length < 2) return;
  const n = s.links.length;
  fill((s.i + d + n) % n);
  if (!env.reduced) s.img.animate([{ opacity: 0, transform: `translateX(${d * 28}px)` }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
}

document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[data-lightbox]');
  if (a && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && open(a)) {
    e.preventDefault();
    return;
  }
  if (!s || !e.target.closest?.('#lightbox')) return;
  const btn = e.target.closest('[data-lb]');
  if (btn) {
    const act = btn.dataset.lb;
    if (act === 'close') close(); else go(act === 'next' ? 1 : -1);
  } else if (e.target === s.dlg || e.target.classList.contains('lb__fig')) close(); // backdrop / empty stage
}, true);

document.addEventListener('keydown', (e) => {
  if (!s) return;
  // Esc: our close (morph back + focus restore); preventing the keydown stops the native close request
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (k) { e.preventDefault(); go(k); }
  else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); fill(e.key === 'Home' ? 0 : s.links.length - 1); }
}, true);
document.addEventListener('cancel', (e) => { if (s && e.target === s.dlg && e.cancelable) { e.preventDefault(); close(); } }, true);
// the page must not scroll under the dialog (Lenis ignores it via data-lenis-prevent)
document.addEventListener('wheel', (e) => { if (s && e.target.closest?.('#lightbox')) e.preventDefault(); }, { passive: false, capture: true });

// swipe between photos on touch screens
let sx = 0, sy = 0;
document.addEventListener('pointerdown', (e) => { if (s && e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } }, true);
document.addEventListener('pointerup', (e) => {
  if (!s || e.pointerType === 'mouse') return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
}, true);

// closed some other way (a close request we could not cancel): still hand focus back to the thumbnail
document.addEventListener('close', (e) => {
  if (!s || e.target !== s.dlg) return;
  const back = s.links[s.i];
  s = null;
  back.focus({ preventScroll: true });
}, true);
document.addEventListener('astro:before-swap', () => { s = null; html.classList.remove('lb-vt'); });
