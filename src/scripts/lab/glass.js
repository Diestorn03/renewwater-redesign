// Laboratorio glass (SIG-3): Canvas2D particles clipped to the glass interior, a damped-spring liquid surface,
// a murk/clear tint and the hold-to-purify swirl through a triangular filter line (the logo's geometry).
// Everything is simulated in the outline SVG's viewBox space (320 × 420); one canvas transform maps it to pixels.
// The rAF loop runs only while something moves and the canvas is on screen.

export const INNER = 'M38 20 L64 356 Q66 372 82 372 L238 372 Q254 372 256 356 L282 20 Z';
const VW = 320, VH = 420, TOP = 20, BOT = 372, CX = 160;
export const LEVEL = BOT - (BOT - TOP) * 0.78;          // liquid at 78 % of the interior
const FILTER = BOT - (BOT - LEVEL) * 0.12;              // filter line in the lowest 12 % of the water column
const halfW = (y) => 122 - (26 * (y - TOP)) / 336;      // interior half width at height y
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// per class: draw colour, tint colour, tint weight per particle, radius range, resting depth
const CLS = {
  sedimento: { rgb: [166, 124, 82], tint: [140, 106, 67], w: 1 / 20, r: [1.6, 3.2], rest: () => BOT - rnd(2, 10) },
  dureza: { rgb: [234, 240, 242], tint: [196, 206, 210], w: 1 / 26, r: [1.4, 2.4], rest: () => BOT - rnd(1.5, 5) },
  cloro: { rgb: [232, 227, 106], tint: [186, 182, 88], w: 1 / 26, r: [9, 17], rest: () => rnd(LEVEL + 18, LEVEL + (BOT - LEVEL) * 0.55) },
  metal: { rgb: [167, 176, 186], tint: [150, 112, 80], w: 1 / 18, r: [1.5, 2.4], rest: () => rnd(LEVEL + (BOT - LEVEL) * 0.5, BOT - 8) },
  quimico: { rgb: [155, 107, 255], tint: [120, 100, 170], w: 1 / 40, r: [3, 4.2], rest: () => rnd(LEVEL + 14, BOT - 14) },
};
export const CLASSES = Object.keys(CLS);
const GRAV = { sedimento: 170, dureza: 80, metal: 90 };
const SPREAD = { dureza: 44, cloro: 34, quimico: 30 };   // splash spread (viewBox px) per class
const CLEAR = [0, 208, 208, 0.18], MURK_A = 0.45;

function sprite(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
}

/** opts: { reduced, empty (start without water, pour() fills it), maxDpr, onCount(counts) } */
export function createGlass(canvas, { reduced = false, empty = false, maxDpr = 2, onCount = () => {} } = {}) {
  const ctx = canvas.getContext('2d');
  const inner = new Path2D(INNER);
  const haze = sprite([[0, 'rgba(232,227,106,.9)'], [0.45, 'rgba(232,227,106,.35)'], [1, 'rgba(232,227,106,0)']]);
  const spark = sprite([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(0,208,208,.9)'], [0.6, 'rgba(152,196,0,.35)'], [1, 'rgba(152,196,0,0)']]);
  let parts = [], sparks = [], rings = [];
  let T = 0, raf = 0, last = 0, onScreen = true, dirty = true;
  let scale = 1, dpr = 1, ox = 0, oy = 0;
  const S = { tilt: 0, tv: 0, target: 0, w: 0, wv: 0, ph: 0, level: empty ? BOT : LEVEL, pour: 1, h: 0, hf: 0, spinning: false, glow: 0, glowTo: 0, m: 0, rgb: [...CLEAR.slice(0, 3)] };

  const surfaceAt = (x) => {
    const u = (x - CX) / 122;
    const dip = reduced ? 0 : S.h * (18 * Math.exp(-((x - CX) ** 2) / 1800) - 5);   // vortex funnel while purifying
    return S.level + S.tilt * u * 12 + S.w * Math.sin(u * 5.2 + S.ph) * 5 + dip;
  };

  /* ---------- particles ---------- */
  function spawn(sym, cls, x0, instant) {
    const c = CLS[cls];
    const p = { sym, cls, r: rnd(...c.r), seed: Math.random() * 100, ry: c.rest(), a: 0, ta: 1, vx: 0, vy: 0, born: T, z: 1, spin: false, dying: false, leaving: false, dead: false, rest: false };
    if (instant || reduced) {
      p.y = p.ry; p.x = CX + rnd(-1, 1) * (halfW(p.y) - p.r - 4);
      if (instant && !reduced) p.a = 1;
      p.rest = true;
    } else {
      const sp = SPREAD[cls] || 16;
      p.x = clamp(x0 + rnd(-sp, sp), CX - 100, CX + 100); p.y = surfaceAt(p.x) + rnd(2, 8);
      p.vx = rnd(-1.8, 1.8) * sp; p.vy = rnd(40, 110); p.a = 0.2;
    }
    parts.push(p);
  }
  const alive = () => parts.filter((p) => !p.dead && !p.leaving && !p.dying);

  function kill(p) {
    p.dying = true; p.ta = 0;
    if (!reduced) { sparks.push({ x: p.x, y: p.y, t: 0 }); p.dead = true; }
    dirty = true;
  }

  function stepParticle(p, dt) {
    const c = CLS[p.cls];
    p.a += (p.ta - p.a) * Math.min(1, dt * (p.leaving ? 9 : 7));
    if ((p.leaving || p.dying) && p.a < 0.02) { p.dead = true; return false; }
    if (reduced) return Math.abs(p.ta - p.a) > 0.01;

    if (p.leaving) { p.vy -= 120 * dt; p.y += p.vy * dt; p.x += p.vx * dt; return true; }

    if (S.h > 0.001) {
      // hold-to-purify: orbit the vertical axis (seen from the side), drift toward the filter line, cross it and vanish
      if (!p.spin) {
        const u = clamp((p.x - CX) / halfW(p.y), -1, 1);
        p.R = Math.max(Math.abs(u), rnd(0.25, 1)); p.th = Math.acos(u / p.R) * (Math.random() < 0.5 ? -1 : 1);
        p.k = Math.random(); p.spin = true;
      }
      p.th += S.h * 6 * dt * (1.6 - p.R * 0.6);   // spec: h·3 rad/s; doubled, the vortex read too slow on screen
      p.R += (0.4 - p.R) * dt * S.h * 1.2;
      p.y += (FILTER - p.y) * Math.min(1, dt * (1.2 + 5 * S.h));
      p.x = CX + p.R * Math.cos(p.th) * (halfW(p.y) - 6);
      p.z = Math.sin(p.th);
      if (S.h > p.k * 0.85 + 0.05 && Math.abs(p.y - FILTER) < 10) kill(p);
      return true;
    }
    if (p.spin) { p.spin = false; p.z = 1; p.vx = p.vy = 0; p.born = T; p.rest = false; }

    const age = T - p.born;
    if (GRAV[p.cls]) {
      if (p.y < p.ry) p.vy += GRAV[p.cls] * dt;
      p.vy -= p.vy * 1.5 * dt;
      p.vx -= p.vx * 2.2 * dt;
      if (p.cls === 'dureza') p.vx += Math.sin(T * 2 + p.seed) * 20 * Math.exp(-age / 2) * dt;
      if (p.y >= p.ry && p.vy >= 0) { p.y = p.ry; p.vy = 0; }
    } else {
      // chlorine haze drifts, chemicals wander (Brownian); both calm down over a few seconds
      const wander = Math.exp(-age / 3.2);
      p.vy += ((p.ry - p.y) * 2.2 - p.vy * 2.4) * dt;
      if (p.cls === 'quimico') { p.vx += rnd(-1, 1) * 240 * wander * dt; p.vy += rnd(-1, 1) * 240 * wander * dt; }
      else p.vx += Math.sin(T * 0.9 + p.seed) * 16 * wander * dt;
      p.vx -= p.vx * 1.8 * dt;
      if (wander > 0.04) { p.x += p.vx * dt; p.y += p.vy * dt; clampToGlass(p); return true; }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    clampToGlass(p);
    const moving = Math.abs(p.vx) + Math.abs(p.vy) > 0.8 || Math.abs(p.ta - p.a) > 0.01;
    p.rest = !moving;
    return moving;
  }
  function clampToGlass(p) {
    const hw = halfW(p.y) - p.r - 2;
    if (p.x < CX - hw) { p.x = CX - hw; p.vx = Math.abs(p.vx) * 0.3; }
    else if (p.x > CX + hw) { p.x = CX + hw; p.vx = -Math.abs(p.vx) * 0.3; }
    const top = surfaceAt(p.x) + Math.min(p.r, 4) + 1;
    if (p.y < top) { p.y = top; p.vy = Math.max(0, p.vy); }
    if (p.y > BOT - 1.5) { p.y = BOT - 1.5; p.vy = 0; }
  }

  /* ---------- simulation step ---------- */
  function step(dt) {
    T += dt;
    let busy = false;
    if (S.pour < 1) {
      S.pour = Math.min(1, S.pour + dt / 1.4);
      S.level = BOT - (BOT - LEVEL) * (1 - (1 - S.pour) ** 3);
      S.wv += rnd(-1, 1) * 60 * dt;
      busy = true;
    }
    if (!reduced) {
      S.tv += (-120 * (S.tilt - S.target) - 14 * S.tv) * dt; S.tilt += S.tv * dt;
      S.wv += (-120 * S.w - 5 * S.wv) * dt; S.w += S.wv * dt;
      S.ph += dt * 6;
      if (Math.abs(S.tilt - S.target) + Math.abs(S.tv) * 0.1 + Math.abs(S.w) + Math.abs(S.wv) * 0.1 > 0.01) busy = true;
    }
    S.hf += ((S.h > 0.001 ? 1 : 0) - S.hf) * Math.min(1, dt * 6);
    if (Math.abs(S.hf - (S.h > 0.001 ? 1 : 0)) > 0.01) busy = true;
    S.glow += (S.glowTo - S.glow) * Math.min(1, dt * 3);
    if (Math.abs(S.glowTo - S.glow) > 0.005) busy = true;

    for (const p of parts) if (stepParticle(p, dt)) busy = true;
    if (parts.some((p) => p.dead)) { parts = parts.filter((p) => !p.dead); dirty = true; }
    sparks = sparks.filter((s) => (s.t += dt) < 0.5);
    rings = rings.filter((r) => (r.t += dt) < 0.6);
    if (sparks.length || rings.length) busy = true;

    // tint: mix(clear, murk, Σweights / 2.5), coloured by the classes present
    let sw = 0; const acc = [0, 0, 0];
    for (const p of parts) {
      if (p.leaving || p.dying) continue;
      const c = CLS[p.cls]; sw += c.w; acc[0] += c.tint[0] * c.w; acc[1] += c.tint[1] * c.w; acc[2] += c.tint[2] * c.w;
    }
    const mT = clamp(sw / countScale / 2.5, 0, 1);
    S.m += (mT - S.m) * Math.min(1, dt * 6);
    if (sw) for (let i = 0; i < 3; i++) S.rgb[i] += (acc[i] / sw - S.rgb[i]) * Math.min(1, dt * 6);
    if (Math.abs(mT - S.m) > 0.003) busy = true;
    return busy;
  }

  /* ---------- drawing ---------- */
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
    ctx.save();
    ctx.clip(inner);

    // water body
    const m = S.m, lr = (i) => CLEAR[i] + (S.rgb[i] - CLEAR[i]) * m;
    const a = CLEAR[3] + (MURK_A - CLEAR[3]) * m;
    const col = `${Math.round(lr(0))},${Math.round(lr(1))},${Math.round(lr(2))}`;
    const body = new Path2D();
    body.moveTo(20, surfaceAt(20));
    for (let x = 30; x <= 300; x += 10) body.lineTo(x, surfaceAt(x));
    body.lineTo(300, VH); body.lineTo(20, VH); body.closePath();
    const g = ctx.createLinearGradient(0, S.level, 0, BOT);
    g.addColorStop(0, `rgba(${col},${a * 0.75 + 0.05})`);
    g.addColorStop(1, `rgba(${col},${Math.min(0.85, a * 1.35)})`);
    ctx.fillStyle = g; ctx.fill(body);
    if (S.glow > 0.01) {
      const gg = ctx.createLinearGradient(0, S.level, 0, BOT);
      gg.addColorStop(0, `rgba(0,208,208,${0.26 * S.glow})`); gg.addColorStop(0.55, `rgba(0,204,96,${0.16 * S.glow})`); gg.addColorStop(1, `rgba(152,196,0,${0.22 * S.glow})`);
      ctx.fillStyle = gg; ctx.fill(body);
    }
    // light band under the surface
    const hl = ctx.createLinearGradient(0, S.level - 6, 0, S.level + 26);
    hl.addColorStop(0, 'rgba(255,255,255,.14)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.fill(body);

    // pour stream
    if (S.pour < 1) {
      const wdt = 7 * (1 - S.pour ** 4);
      const sg = ctx.createLinearGradient(0, 0, 0, S.level);
      sg.addColorStop(0, 'rgba(0,208,208,0)'); sg.addColorStop(1, 'rgba(0,208,208,.45)');
      ctx.fillStyle = sg; ctx.fillRect(CX - wdt / 2, 0, wdt, S.level + 4);
    }

    // particles
    for (const p of parts) {
      const c = CLS[p.cls];
      const depth = p.spin ? 0.78 + 0.22 * p.z : 1;
      const al = p.a * (p.spin ? 0.6 + 0.4 * (p.z + 1) / 2 : 1);
      if (al < 0.01) continue;
      const r = p.r * depth;
      ctx.globalAlpha = al;
      const [R, G, B] = c.rgb;
      if (p.cls === 'cloro') { ctx.globalAlpha = al * 0.55; ctx.drawImage(haze, p.x - r, p.y - r, r * 2, r * 2); }
      else if (p.cls === 'quimico') {
        ctx.strokeStyle = `rgb(${R},${G},${B})`; ctx.lineWidth = 1.1; ctx.beginPath();
        ctx.moveTo(p.x - r, p.y - r * 0.6); ctx.lineTo(p.x + r, p.y - r * 0.6); ctx.lineTo(p.x, p.y + r * 0.9); ctx.closePath(); ctx.stroke();
      } else if (p.cls === 'dureza') {
        ctx.fillStyle = `rgb(${R},${G},${B})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.5, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      } else if (p.cls === 'metal') {
        ctx.fillStyle = `rgb(${R},${G},${B})`; ctx.beginPath();
        ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y); ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r, p.y); ctx.closePath(); ctx.fill();
        const gl = p.rest ? 0 : Math.max(0, Math.sin(T * 4 + p.seed * 7)) ** 10;
        if (gl > 0.05) {
          ctx.globalAlpha = al * gl; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.beginPath();
          ctx.moveTo(p.x - r * 3, p.y); ctx.lineTo(p.x + r * 3, p.y); ctx.moveTo(p.x, p.y - r * 3); ctx.lineTo(p.x, p.y + r * 3); ctx.stroke();
        }
      } else { ctx.fillStyle = `rgb(${R},${G},${B})`; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    // filter line: a row of the logo's downward triangles, fades in while purifying
    if (S.hf > 0.01) {
      const hw = halfW(FILTER) - 2, fg = ctx.createLinearGradient(CX - hw, 0, CX + hw, 0);
      fg.addColorStop(0, '#00D0D0'); fg.addColorStop(0.38, '#00D08C'); fg.addColorStop(0.68, '#00CC60'); fg.addColorStop(1, '#98C400');
      ctx.globalAlpha = S.hf * 0.9; ctx.strokeStyle = fg; ctx.lineWidth = 1.4; ctx.lineJoin = 'miter';
      ctx.beginPath();
      for (let x = CX - hw; x < CX + hw - 1; x += 14) { ctx.moveTo(x, FILTER); ctx.lineTo(x + 7, FILTER + 8); ctx.lineTo(x + 14, FILTER); }
      ctx.stroke();
      ctx.globalAlpha = S.hf * 0.35; ctx.fillStyle = fg; ctx.fillRect(CX - hw, FILTER - 0.6, hw * 2, 1.2);
      ctx.globalAlpha = 1;
    }
    for (const s of sparks) {
      const k = s.t / 0.5, sz = 6 + 22 * k;
      ctx.globalAlpha = (1 - k) ** 1.5; ctx.drawImage(spark, s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
    for (const r of rings) {
      const k = r.t / 0.6, y = surfaceAt(r.x);
      ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = r.col; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(r.x, y, 4 + 30 * k, 1.5 + 5 * k, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // meniscus
    ctx.beginPath(); ctx.moveTo(20, surfaceAt(20));
    for (let x = 30; x <= 300; x += 10) ctx.lineTo(x, surfaceAt(x));
    ctx.strokeStyle = `rgba(234,251,249,${0.45 + 0.3 * S.glow})`; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
  }

  /* ---------- loop ---------- */
  function frame(now) {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    const busy = step(dt);
    draw();
    if (dirty) { dirty = false; onCount(counts()); }
    if (busy && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (raf || !onScreen || document.hidden) return;
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function counts() {
    const by = Object.fromEntries(CLASSES.map((k) => [k, 0]));
    let total = 0;
    for (const p of parts) if (!p.leaving && !p.dying && !p.dead) { by[p.cls]++; total++; }
    return { total, by };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    scale = Math.min(r.width / VW, r.height / VH);
    ox = (r.width - VW * scale) / 2; oy = (r.height - VH * scale) / 2;
    draw();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) wake(); });
  io.observe(canvas);
  const onVis = () => { if (!document.hidden) wake(); };
  document.addEventListener('visibilitychange', onVis);
  let countScale = 1;
  resize();

  return {
    /** add n particles of class cls, tagged with the symptom that caused them; x = splash point (viewBox) */
    add(sym, cls, n, x = CX, instant = false) { for (let i = 0; i < n; i++) spawn(sym, cls, x, instant); dirty = true; wake(); },
    remove(sym) {
      for (const p of parts) if (p.sym === sym && !p.dying) { p.leaving = true; p.ta = 0; p.vy = -rnd(20, 50); p.vx = rnd(-10, 10); }
      dirty = true; wake();
    },
    splash(x, col = 'rgba(234,251,249,.8)') { if (reduced) return; rings.push({ x, t: 0, col }); S.wv += 9; wake(); },
    kick() { if (reduced) return; S.wv += rnd(-1, 1) > 0 ? 7 : -7; wake(); },
    point(nx) { if (reduced) return; S.target = nx == null ? 0 : clamp(nx * 2 - 1, -1, 1) * 0.6; wake(); },
    stir() { if (reduced) return; for (const p of parts) if (!GRAV[p.cls] && !p.spin) p.born = Math.max(p.born, T - 2); wake(); },
    setH(h) {
      S.h = h;
      if (reduced) {
        const list = parts.filter((p) => !p.leaving && !p.dying);
        for (const p of list) { p.k ??= Math.random(); if (p.k < h) kill(p); }
      }
      wake();
    },
    finish() { for (const p of alive()) kill(p); S.h = 0; wake(); },
    glow(on) { S.glowTo = on ? 1 : 0; wake(); },
    pour() { if (reduced) return; S.pour = 0; S.level = BOT; wake(); },
    reset() { parts = []; sparks = []; rings = []; S.h = 0; S.glowTo = 0; S.m = 0; dirty = true; wake(); },
    setScale(s) { countScale = s; },
    counts,
    /** viewBox point → client (viewport) coordinates */
    toClient(x, y) { const r = canvas.getBoundingClientRect(); return { x: r.left + ox + x * scale, y: r.top + oy + y * scale }; },
    fromClientX(cx) { const r = canvas.getBoundingClientRect(); return (cx - r.left - ox) / scale / VW; },
    destroy() { cancelAnimationFrame(raf); raf = 0; ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); },
  };
}
