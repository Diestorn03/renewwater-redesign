// Laboratorio en Casa controller: form → glass particles, hold-to-purify, result card and the WhatsApp message.
// Registered once; bails out on pages without [data-lab].
import { onPage } from '../engine.js';
import data from '../../data/lab-rules.json';
import { buildWa } from '../../data/site.js';
import { evaluate, composeLabMessage } from './rules.js';
import { createGlass, LEVEL } from './glass.js';

const SPAWN = Object.fromEntries(data.symptoms.map((s) => [s.id, s.spawn]));

onPage(({ gsap, env, scrollTo }) => {
  const root = document.querySelector('[data-lab]');
  if (!root) return;
  const cfg = JSON.parse(root.dataset.lab);
  const $ = (s) => root.querySelector(s);
  const form = $('[data-lab-form]'), canvas = $('[data-lab-canvas]'), stage = $('[data-lab-stage]');
  const live = $('[data-lab-live]'), countEl = $('[data-lab-count]'), hint = $('[data-lab-hint]');
  const hold = $('[data-hold]'), btn = $('[data-hold-btn]'), ring = $('[data-hold-ring]'), holdLabel = $('[data-hold-label]');
  const card = $('[data-lab-result]');
  const reduced = env.reduced;
  const scale = env.desktop ? 1 : 0.6;          // 150 particles max on desktop, 90 on touch / small screens
  const tweens = new Set();
  const track = (tw) => { tweens.add(tw); return tw; };
  root.classList.add('is-ready');

  let peak = 0, holding = false, done = false, pressedAt = 0, lastInput = 0, quarter = 0, tw;
  const st = { h: 0 };   // purification progress, 0..1
  const stickyTop = () => (matchMedia('(max-width: 899px)').matches
    ? stage.getBoundingClientRect().bottom
    : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72);
  const restored = form.querySelectorAll('input[name="symptom"]:checked').length > 0;
  const glass = createGlass(canvas, { reduced, empty: !reduced && !restored, maxDpr: env.desktop ? 2 : 1.5, onCount: renderCount });
  glass.setScale(scale);

  /* ---------- readouts ---------- */
  let liveTimer;
  function say(text) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = text; }); }
  function renderCount({ total, by }) {
    peak = Math.max(peak, total);
    if (!done) countEl.textContent = total;
    root.querySelectorAll('[data-lab-legend] [data-cls]').forEach((li) => {
      const n = by[li.dataset.cls] || 0;
      li.classList.toggle('is-on', n > 0);
      li.querySelector('b').textContent = n;
    });
    hint.classList.toggle('is-hidden', total > 0 || done);
    clearTimeout(liveTimer);
    if (!done && st.h === 0) liveTimer = setTimeout(() => { if (!done && st.h === 0) say(cfg.copy.live.count.replace('{n}', total)); }, 900);
  }

  /* ---------- answers ---------- */
  const answers = () => ({
    origin: form.elements.origin.value,
    home: form.elements.home.value,
    symptoms: [...form.querySelectorAll('input[name="symptom"]:checked')].map((i) => i.value),
  });

  function flyAndPour(input) {
    const spawn = Object.entries(SPAWN[input.value] || {});
    const label = input.closest('label'), dots = label.querySelectorAll('.chip__dot');
    spawn.forEach(([cls, n], i) => {
      const from = dots[i] || dots[0] || label;
      const count = Math.max(1, Math.round(n * scale));
      const tx = 160 + (Math.random() - 0.5) * 130;
      const cr = canvas.getBoundingClientRect();
      const onScreen = cr.bottom > 0 && cr.top < innerHeight;
      if (reduced || !onScreen) { glass.add(input.value, cls, count, tx, reduced); return; }
      const a = from.getBoundingClientRect();
      const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
      const dot = document.createElement('span');
      dot.className = 'lab-fly'; dot.setAttribute('aria-hidden', 'true');
      dot.style.setProperty('--c', `var(--c-${cls})`);
      root.appendChild(dot);
      const o = { t: 0 };
      track(gsap.to(o, {
        t: 1, duration: 0.62, delay: i * 0.09, ease: 'power1.inOut',
        onUpdate() {
          const b = glass.toClient(tx, LEVEL - 4), t = o.t, u = 1 - t;
          const cx = (x0 + b.x) / 2, cy = Math.min(y0, b.y) - 120;
          dot.style.transform = `translate3d(${u * u * x0 + 2 * u * t * cx + t * t * b.x}px,${u * u * y0 + 2 * u * t * cy + t * t * b.y}px,0) scale(${1 - 0.35 * t})`;
        },
        onComplete() {
          dot.remove();
          glass.splash(tx, getComputedStyle(root).getPropertyValue(`--c-${cls}`).trim() || '#fff');
          glass.add(input.value, cls, count, tx);
        },
      }));
    });
  }

  function onChange(e) {
    const input = e.target;
    if (done || !input.matches('input')) return;
    if (input.name !== 'symptom') { glass.kick(); return; }
    // "Nada, solo quiero saber" excludes the rest
    if (input.checked) {
      const exclusive = data.symptoms.find((s) => s.id === input.value)?.exclusive;
      form.querySelectorAll('input[name="symptom"]:checked').forEach((other) => {
        if (other === input) return;
        const otherExclusive = data.symptoms.find((s) => s.id === other.value)?.exclusive;
        if (exclusive || otherExclusive) { other.checked = false; glass.remove(other.value); }
      });
      flyAndPour(input);
    } else glass.remove(input.value);
  }
  form.addEventListener('change', onChange);
  const noSubmit = (e) => e.preventDefault();
  form.addEventListener('submit', noSubmit);

  // restore particles for answers already checked (back/forward cache, breakpoint re-init)
  answers().symptoms.forEach((id) => Object.entries(SPAWN[id] || {}).forEach(([cls, n]) => glass.add(id, cls, Math.max(1, Math.round(n * scale)), 160, true)));

  // entrance: outline draws, water pours in
  if (!reduced) {
    const paths = root.querySelectorAll('[data-lab-outline] path, [data-lab-outline] ellipse');
    gsap.set(paths, { drawSVG: '0%' });
    track(gsap.to(paths, {
      drawSVG: '100%', duration: 0.9, ease: 'power2.inOut', stagger: 0.06,
      scrollTrigger: { trigger: stage, start: 'top 75%', once: true, onEnter: () => { if (!restored) setTimeout(() => glass.pour(), 350); } },
    }));
  }

  // pointer: the surface leans toward the cursor (desktop), a touch on the glass makes a wave (mobile)
  const onMove = (e) => { glass.point(glass.fromClientX(e.clientX)); glass.stir(); };
  const onLeave = () => glass.point(null);
  const onTap = () => glass.kick();
  if (env.desktop) { stage.addEventListener('pointermove', onMove); stage.addEventListener('pointerleave', onLeave); }
  else canvas.addEventListener('pointerdown', onTap, { passive: true });

  /* ---------- hold to purify ---------- */
  function setH() {
    ring.style.strokeDashoffset = String(100 * (1 - st.h));
    glass.setH(st.h);
    const q = Math.floor(st.h * 4 + 1e-6);
    if (q > quarter) {
      quarter = q;
      if (q < 4) say(cfg.copy.live.purifying.replace('{p}', q * 25));
      if (env.coarse) navigator.vibrate?.(10);
    }
  }
  function press() {
    if (done || holding) return;
    holding = true; pressedAt = performance.now(); lastInput = pressedAt;
    if (st.h === 0) quarter = 0;
    hold.classList.add('is-holding');
    tw?.kill();
    tw = track(gsap.to(st, { h: 1, duration: 1.6 * (1 - st.h), ease: 'none', onUpdate: setH, onComplete: complete }));
  }
  function release() {
    if (!holding) return;
    holding = false; lastInput = performance.now();
    hold.classList.remove('is-holding');
    if (done || performance.now() - pressedAt < 200) return;   // a quick tap finishes on its own
    tw?.kill();
    tw = track(gsap.to(st, { h: 0, duration: 0.5, ease: 'power2.out', onUpdate: setH, onComplete: () => { quarter = 0; } }));
  }
  const onDown = (e) => { if (e.button !== 0) return; btn.setPointerCapture?.(e.pointerId); press(); };
  const onKeyDown = (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } };
  const onKeyUp = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } };
  // assistive tech activates with a bare click: treat it as a tap
  const onClick = () => { if (performance.now() - lastInput > 400 && !done) { press(); holding = false; hold.classList.remove('is-holding'); } };
  const noMenu = (e) => e.preventDefault();
  btn.addEventListener('pointerdown', onDown);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('lostpointercapture', release);
  btn.addEventListener('keydown', onKeyDown);
  btn.addEventListener('keyup', onKeyUp);
  btn.addEventListener('blur', release);
  btn.addEventListener('click', onClick);
  btn.addEventListener('contextmenu', noMenu);

  /* ---------- result ---------- */
  function fillResult() {
    const a = answers(), r = evaluate(data, a), c = cfg.copy, v = c.msg.values;
    const p = r.product && cfg.products[r.product], alt = r.alt && cfg.products[r.alt];
    card.dataset.kind = p ? 'product' : 'analysis';
    card.querySelector('[data-r-title]').textContent = p ? p.name : c.result.analysisTitle;
    if (p) {
      const img = card.querySelector('[data-r-img]');
      img.src = p.thumb; img.alt = p.name;
      card.querySelectorAll('[data-r-see]').forEach((l) => { l.href = p.url; });
      const stages = card.querySelector('[data-r-stages]');
      stages.hidden = !p.stages;
      stages.textContent = p.stages ? c.result.stages.replace('{n}', p.stages) : '';
      card.querySelector('[data-r-line]').textContent = p.ideal;
    }
    const altEl = card.querySelector('[data-r-alt]');
    altEl.hidden = !alt;
    if (alt) { const l = altEl.querySelector('a'); l.textContent = alt.name; l.href = alt.url; }
    card.querySelector('[data-r-drink]').hidden = !r.drink.length;
    const labels = { origin: v[a.origin] || '', home: v[a.home] || '', symptoms: a.symptoms.map((id) => v[id]) };
    const names = Object.fromEntries(Object.entries(cfg.products).map(([slug, x]) => [slug, x.short]));
    card.querySelector('[data-r-cta]').href = buildWa({ text: composeLabMessage(c.msg, labels, r, names), ref: cfg.ref });
  }

  function complete() {
    done = true; holding = false; clearTimeout(liveTimer);
    hold.classList.remove('is-holding'); hold.classList.add('is-done');
    btn.setAttribute('aria-disabled', 'true');
    holdLabel.textContent = cfg.copy.holdDone;
    glass.finish(); glass.glow(true);
    stage.classList.add('is-clean'); hint.classList.add('is-hidden');
    countEl.textContent = `${peak} → 0`;
    say(cfg.copy.live.done);
    if (env.coarse) navigator.vibrate?.(10);
    fillResult();
    const face = $('[data-lab-face]');
    const reveal = () => {
      face.hidden = true; card.hidden = false;
      card.focus({ preventScroll: true });
      const r = card.getBoundingClientRect(), top = stickyTop();
      if (r.top < top || r.top > innerHeight * 0.6) scrollTo(card, { offset: -top - 12, immediate: reduced });
    };
    if (reduced) { reveal(); track(gsap.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.2 })); return; }
    track(gsap.timeline({ delay: 0.35 })
      .to(face, { rotateY: -90, opacity: 0.3, duration: 0.28, ease: 'power2.in', transformPerspective: 1400, transformOrigin: '50% 50%' })
      .add(reveal)
      .fromTo(card, { rotateY: 90, transformPerspective: 1400 }, { rotateY: 0, duration: 0.6, ease: 'expo.out', clearProps: 'transform' }));
  }

  function repeat() {
    const face = $('[data-lab-face]');
    done = false; peak = 0; st.h = 0; quarter = 0; tw?.kill();
    form.reset();
    glass.reset(); glass.glow(false);
    stage.classList.remove('is-clean');
    hold.classList.remove('is-done');
    btn.removeAttribute('aria-disabled');
    holdLabel.textContent = cfg.copy.hold;
    ring.style.strokeDashoffset = '100';
    countEl.textContent = '0';
    card.hidden = true; face.hidden = false;
    gsap.set(face, { clearProps: 'transform,opacity' });
    const top = stickyTop();
    if (face.getBoundingClientRect().top < top) scrollTo(face, { offset: -top - 12, immediate: reduced });
    form.querySelector('input')?.focus({ preventScroll: true });
  }
  const onRepeat = (e) => { if (e.target.closest('[data-r-repeat]')) repeat(); };
  card.addEventListener('click', onRepeat);

  return () => {
    tweens.forEach((t) => t.kill());
    glass.destroy();
    clearTimeout(liveTimer);
    root.querySelectorAll('.lab-fly').forEach((d) => d.remove());
    form.removeEventListener('change', onChange);
    form.removeEventListener('submit', noSubmit);
    stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('pointerdown', onTap);
    ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach((ev) => btn.removeEventListener(ev, release));
    btn.removeEventListener('pointerdown', onDown); btn.removeEventListener('keydown', onKeyDown); btn.removeEventListener('keyup', onKeyUp);
    btn.removeEventListener('click', onClick); btn.removeEventListener('contextmenu', noMenu);
    card.removeEventListener('click', onRepeat);
  };
});
