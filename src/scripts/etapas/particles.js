/*
  Renew City tank — deterministic particle model (spec §6.3). No DOM here, so particles.check.js can run it in node.
  Every position is a pure function of the water front f ∈ [0,1]: scrubbing back "un-filters" exactly, no state kept.

  Geometry (canvas px): the window is [0,H]; the inlet (incoming water) is [0,T]; the six media bands share [T,H].
  Front: yF = T + f·(H−T). A particle rides the flow, never ahead of the front, until it reaches its capture depth in its band.
*/
export const BAND_KEYS = ['grava', 'garnet', 'cationica', 'anionica', 'carbon', 'kdf'];
export const INLET = 0.16; // share of the window above the first band

// type → count and capture band(s). Anion resin (3) traps nothing: it only turns the water tint from murk to clear.
const MIX = [
  { type: 'sedimento', n: 60, band: (r) => (r < 0.7 ? 0 : 1) }, // 70% gravel, 30% garnet
  { type: 'dureza', n: 50, band: () => 2 },
  { type: 'cloro', n: 45, band: () => 4 },
  { type: 'quimico', n: 35, band: () => 4 },
  { type: 'metal', n: 50, band: () => 5 },
];
export const COLORS = { sedimento: '#A67C52', dureza: '#EAF0F2', cloro: '#E8E36A', quimico: '#9B6BFF', metal: '#A7B0BA' };
const SIZE = { sedimento: [1.6, 3.1], dureza: [1.1, 1.9], cloro: [1.1, 2], quimico: [3.4, 5], metal: [1.5, 2.5] };

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 240 particles in normalised units (x, y0, cap as fractions of the window), identical on every load. */
export function makeParticles(seed = 20250924) {
  const rnd = mulberry32(seed);
  const lerp = (a, b) => a + (b - a) * rnd();
  const out = [];
  for (const m of MIX) {
    for (let i = 0; i < m.n; i++) {
      const band = m.band(rnd());
      out.push({
        type: m.type,
        band,
        x: lerp(0.08, 0.92),
        y0: lerp(0.025, INLET - 0.02),
        v: lerp(1.15, 1.4), // faster than the front, so they pile up just behind it
        lag: lerp(0, 0.018), // distance kept behind the front (breaks the pile-up line)
        capAt: lerp(0.15, 0.85), // depth inside the band where it gets trapped
        r: lerp(...SIZE[m.type]),
        rot: lerp(0, Math.PI * 2),
        seed: lerp(0, 100),
      });
    }
  }
  return out;
}

export const frontAt = (f) => INLET + f * (1 - INLET);
const bandTop = (b) => INLET + (b * (1 - INLET)) / 6;

/** Normalised y and trapped flag of particle p for front f (pure). */
export function place(p, f) {
  const cap = bandTop(p.band) + p.capAt * ((1 - INLET) / 6);
  const y = Math.min(p.y0 + f * (1 - INLET) * p.v, frontAt(f) - p.lag, cap);
  return { y, trapped: y >= cap - 1e-6 };
}

/** Share of particles still loose, 1 → 0 (drives the "Impurities (illustrative)" bar). */
export const looseShare = (ps, f) => ps.reduce((n, p) => n + (place(p, f).trapped ? 0 : 1), 0) / ps.length;

/** Draw every particle for front f. ctx is already scaled to CSS px; w/h are the window size in CSS px. */
export function draw(ctx, ps, f, w, h) {
  ctx.clearRect(0, 0, w, h);
  let loose = 0;
  for (const p of ps) {
    const { y, trapped } = place(p, f);
    if (!trapped) loose++;
    const py = y * h;
    const px = p.x * w + Math.sin(p.seed + py * 0.02) * 6;
    const r = trapped ? p.r * 0.8 : p.r;
    ctx.globalAlpha = trapped ? 0.35 : 0.95;
    const c = COLORS[p.type];
    if (p.type === 'quimico') {
      // invisible chemicals: outlined triangles that fill once trapped
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = p.rot + (k * Math.PI * 2) / 3;
        ctx[k ? 'lineTo' : 'moveTo'](px + Math.cos(a) * r, py + Math.sin(a) * r);
      }
      ctx.closePath();
      if (trapped) { ctx.globalAlpha = 0.85; ctx.fillStyle = c; ctx.fill(); }
      else { ctx.strokeStyle = c; ctx.lineWidth = 1.1; ctx.stroke(); }
      continue;
    }
    ctx.fillStyle = c;
    if (p.type === 'dureza') {
      // mineral crystals: tiny diamonds
      ctx.beginPath();
      ctx.moveTo(px, py - r); ctx.lineTo(px + r, py); ctx.lineTo(px, py + r); ctx.lineTo(px - r, py);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    if (p.type === 'metal' && !trapped) {
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(px - r * 0.35, py - r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  return loose / ps.length;
}
