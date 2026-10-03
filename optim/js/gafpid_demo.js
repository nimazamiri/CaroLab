/* =========================================================
 *  CaroLab - GA-tuned Fuzzy PID Example  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 *
 * gafpid_demo.js — FLC-PID vs GA-tuned Fuzzy PID on a quadrotor altitude channel
 * (mirrors the paper's workflow: fuzzy gain scheduling + GA tuning of the scaling
 *  factors [kpe, kde, Gp, Gi, Gd] with ITAE as the cost).
 *
 *   node gafpid_demo.js            # quick run
 *   node gafpid_demo.js --full     # bigger GA (pop 60, 60 generations)
 *
 * Needs caro.fuzzy-1.0.js and caro.ga-1.0.js in the same folder.
 *
 * Plant (z axis, Eq. 22/25 with phi = theta = 0):  z'' = U1/m_true - g + d/m_true
 *   U1 = m_nom * (g + u)         gravity feed-forward + controller acceleration command
 * Test: track z_r = 3 + t/4 (the paper's helix altitude), then repeat with +25 % mass and
 * a 0.15 N disturbance between 15 s and 20 s (as in Section VI).
 *
 * ========================================================= */
 
'use strict';
const { FuzzyPID } = require('./caro.fuzzy-1.0.js');
const { GA } = require('./caro.ga-1.0.js');

const P = { m: 1.0, g: 9.81, dt: 0.02, T: 25, uMin: -9.0, uMax: 15.0 };

/** Simulate one run. ctrl.step(e, dt) -> acceleration command. Returns ITAE + traces. */
function simulate(ctrl, { massScale = 0, dist = 0, trace = false } = {}) {
  ctrl.reset();
  const mTrue = P.m * (1 + massScale);
  const N = Math.round(P.T / P.dt);
  let z = 0, v = 0, itae = 0, effort = 0;
  const tr = trace ? { t: [], ref: [], z: [], u: [] } : null;
  for (let k = 0; k < N; k++) {
    const t = k * P.dt;
    const ref = 3 + t / 4;
    const e = ref - z;
    const u = ctrl.step(e, P.dt);
    const U1 = P.m * (P.g + u);
    const d = (t >= 15 && t < 20) ? dist : 0;
    const a = U1 / mTrue - P.g + d / mTrue;
    v += a * P.dt; z += v * P.dt;
    itae += t * Math.abs(e) * P.dt;
    effort += u * u * P.dt;
    if (!Number.isFinite(z) || Math.abs(z) > 1e4) return { itae: Infinity, effort, tr };
    if (trace) { tr.t.push(t); tr.ref.push(ref); tr.z.push(z); tr.u.push(u); }
  }
  return { itae, effort, tr };
}

/* ---- baseline: plain PID with the same interface ---- */
class PlainPID {
  constructor(kp, ki, kd, lim) { Object.assign(this, { kp, ki, kd, lim }); this.reset(); }
  reset() { this.i = 0; this.pe = 0; this.first = true; }
  step(e, dt) {
    const de = this.first ? 0 : (e - this.pe) / dt; this.first = false; this.pe = e;
    this.i += e * dt;
    const u = this.kp * e + this.ki * this.i + this.kd * de;
    const us = Math.min(this.lim[1], Math.max(this.lim[0], u));
    if (us !== u && e * u > 0) this.i -= e * dt;
    return us;
  }
}

const mkFPID = scaling => new FuzzyPID({
  scaling, dt: P.dt, outLimits: [P.uMin, P.uMax], integralLimit: 50,
  eRange: [-1, 1], deRange: [-10, 10],
});

// hand-picked "nominal" scaling for the un-optimised FPID
const NOMINAL = { kpe: 1, kde: 1, Gp: 10, Gi: 10, Gd: 30 };

/* ---- GA problem: chromosome = [kpe, kde, Gp, Gi, Gd] ---- */
const LB = [0.1, 0.01, 0.0, 0.0, 0.0];
const UB = [5.0, 2.0, 100, 1000, 80];

const probe = mkFPID(NOMINAL); // reused controller instance inside the fitness
function fitness(x) {
  probe.setScaling(x);
  const a = simulate(probe);                                        // nominal
  const b = simulate(probe, { massScale: 0.25, dist: 0.15 });       // +25 % mass & disturbance
  return a.itae + b.itae;                                           // weighted sum of ITAEs
}

function main() {
  const full = process.argv.includes('--full');
  const ga = new GA({
    nVars: 5, lb: LB, ub: UB,
    populationSize: full ? 60 : 30, generations: full ? 60 : 25,
    crossover: 'blx', selection: 'tournament', mutationScale: 0.15,
    initialGuess: [NOMINAL.kpe, NOMINAL.kde, NOMINAL.Gp, NOMINAL.Gi, NOMINAL.Gd],
    stallGenerations: 20, seed: 42,
    onGeneration: g => { if (g.generation % 5 === 0) console.log(`  gen ${String(g.generation).padStart(3)}  best ITAE sum = ${g.best.toFixed(3)}`); },
  });
  console.log('Running GA (this simulates ' + (2 * ga.opts.populationSize * (ga.opts.generations + 1)) + ' flights)...');
  const t0 = Date.now();
  const r = ga.run(fitness);
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s, reason: ${r.reason}, evaluations: ${r.evaluations}`);
  console.log('best scaling [kpe kde Gp Gi Gd] =', r.x.map(v => +v.toFixed(4)).join('  '));

  const controllers = {
    'PID (fixed)': new PlainPID(6, 0.5, 4, [P.uMin, P.uMax]),
    'FPID (nominal)': mkFPID(NOMINAL),
    'GAFPID': mkFPID(r.x),
  };
  console.log('\nITAE            nominal    +25% mass & 0.15 N gust');
  for (const [name, c] of Object.entries(controllers)) {
    const a = simulate(c), b = simulate(c, { massScale: 0.25, dist: 0.15 });
    console.log(name.padEnd(16) + a.itae.toFixed(3).padStart(8) + b.itae.toFixed(3).padStart(18));
  }
}

if (require.main === module) main();
module.exports = { simulate, fitness, mkFPID, PlainPID, P, LB, UB, NOMINAL };
