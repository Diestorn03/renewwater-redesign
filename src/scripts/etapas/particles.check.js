// node src/scripts/etapas/particles.check.js — asserts the particle model stays pure and matches spec §6.3.
import assert from 'node:assert/strict';
import { makeParticles, place, looseShare, INLET } from './particles.js';

const ps = makeParticles();
assert.equal(ps.length, 240);
assert.deepEqual(makeParticles(), ps, 'deterministic');
const count = (t, b) => ps.filter((p) => p.type === t && (b === undefined || p.band === b)).length;
assert.deepEqual([count('sedimento'), count('dureza'), count('cloro'), count('quimico'), count('metal')], [60, 50, 45, 35, 50]);
assert.ok(ps.every((p) => p.band !== 3), 'anion resin traps nothing');
assert.equal(looseShare(ps, 0), 1, 'nothing trapped before the water moves');
assert.equal(looseShare(ps, 1), 0, 'everything trapped at the end');
assert.ok(ps.every((p) => place(p, 0).y < INLET), 'all start in the inlet');
// monotonic: looseness never grows as the front advances
let prev = 1;
for (let f = 0; f <= 1.0001; f += 0.01) { const s = looseShare(ps, f); assert.ok(s <= prev + 1e-9); prev = s; }
console.log('particles ok');
