/* =========================================================
 *  CaroLab - Neuro Fuzzy PID Example  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 *
 * neuroFuzzyPID_pid.js — NeuroFuzzyPID used as an ordinary PID controller.
 *
 *   node neuroFuzzyPID_demo.js
 *
 * Needs caro.anfis-1.0.js and caro.neuroFuzzyPID-1.0.js in the same folder. Self-contained —
 * does NOT need fuzzyPID.js (unlike neuroFuzzyPID_demo.js's demo 1, which
 * trains from an AdaptiveFuzzyPID "teacher"). Here the training targets are
 * a small hand-written gain-scheduling rule instead, so this file also shows
 * how to call NeuroFuzzyPID.train() directly with your own data.
 *
 * Story:
 *   1. Build a NeuroFuzzyPID with baseline gains Kp0/Ki0/Kd0 — UNTRAINED, it
 *      is just that fixed PID (every rule's consequent bias = the baseline).
 *   2. Define a simple gain-scheduling rule of thumb (bigger Kp for bigger
 *      error, less Ki near the target to curb windup, more Kd when the error
 *      is changing fast) and generate training samples from it on a grid.
 *   3. Train the controller on those samples.
 *   4. Run BOTH the untrained (fixed-gain) and trained (gain-scheduled)
 *      controller, closed-loop, on a plant whose gain suddenly doubles
 *      partway through the run (a stand-in for wear, load change, etc.),
 *      and compare.
 *
 * ========================================================= */
 
'use strict';
const { NeuroFuzzyPID } = require('./caro.neuroFuzzyPID-1.0.js');

/* ---------- 1) baseline controller ("x(0)", the designer's fixed PID) ---------- */
const BASE = { Kp0: 2.0, Ki0: 1.0, Kd0: 0.4 };

const untrained = new NeuroFuzzyPID(Object.assign({
  eRange: [-2, 2], ecRange: [-4, 4], eTerms: 5, ecTerms: 5, dt: 0.01,
  outLimits: [-20, 20], integralLimit: 10,
}, BASE));

console.log('=== NeuroFuzzyPID as a PID controller ===');
console.log('untrained gains at a few points (should all equal the baseline, since no training has happened yet):');
for (const [e, ec] of [[0, 0], [1.5, -0.5], [-1, 2]]) console.log(`  e=${e}, ec=${ec} ->`, untrained.gains(e, ec));

/* ---------- 2) a hand-written gain-scheduling rule of thumb, as training data ---------- */
// (illustrative only — not from any paper: bigger |e| -> more P; less I near
// the target, to curb integral windup while far away; bigger |ec| -> more D)
function ruleOfThumb(e, ec) {
  const ae = Math.abs(e), aec = Math.abs(ec);
  return {
    Kp: BASE.Kp0 + 1.5 * Math.tanh(ae),
    Ki: BASE.Ki0 * Math.max(0, 1 - 0.4 * ae),
    Kd: BASE.Kd0 + 0.5 * Math.tanh(aec),
  };
}
const eR = [-2, 2], ecR = [-4, 4], nE = 13, nEC = 13;
const samples = [];
for (let i = 0; i < nE; i++) for (let j = 0; j < nEC; j++) {
  const e = eR[0] + (eR[1] - eR[0]) * i / (nE - 1);
  const ec = ecR[0] + (ecR[1] - ecR[0]) * j / (nEC - 1);
  const g = ruleOfThumb(e, ec);
  samples.push({ e, ec, Kp: g.Kp, Ki: g.Ki, Kd: g.Kd });
}

/* ---------- 3) train a fresh controller on those samples ---------- */
const trained = new NeuroFuzzyPID(Object.assign({
  eRange: eR, ecRange: ecR, eTerms: 5, ecTerms: 5, dt: 0.01,
  outLimits: [-20, 20], integralLimit: 10,
}, BASE));

const { history } = trained.train(samples, { epochs: 80, lr: 0.03 });
console.log('\ntraining RMSE: epoch 0 =', history[0].toExponential(3), ' epoch', history.length - 1, '=', history[history.length - 1].toExponential(3));
console.log('trained gains at the same points (should now track the rule of thumb):');
for (const [e, ec] of [[0, 0], [1.5, -0.5], [-1, 2]]) {
  console.log(`  e=${e}, ec=${ec} -> learned`, trained.gains(e, ec), ' target', ruleOfThumb(e, ec));
}

/* ---------- 4) closed-loop comparison on a plant whose gain doubles mid-run ---------- */
// simple 2nd-order plant: y'' + 0.6*y' + y = K*u   (K = 1, then 2 after t = 6s)
function mkPlant() {
  let y = 0, v = 0;
  return {
    step(u, t, dt) {
      const K = t >= 6 ? 2 : 1;
      const a = K * u - 0.6 * v - y;
      v += a * dt; y += v * dt;
      return y;
    },
  };
}

function stepMetrics(ys, dt, ref = 1) {
  const peak = Math.max(...ys);
  const overshoot = 100 * Math.max(0, peak - ref) / ref;
  let ts = ys.length * dt;
  for (let k = ys.length - 1; k >= 0; k--) if (Math.abs(ys[k] - ref) > 0.02 * ref) { ts = (k + 1) * dt; break; }
  return { overshoot, ts };
}

function run(ctrl) {
  const dt = 0.01, T = 12, N = Math.round(T / dt);
  const plant = mkPlant(); let y = 0; const ys = [];
  ctrl.reset();
  for (let k = 0; k < N; k++) {
    const t = k * dt, ref = 1;
    const u = ctrl.step(ref - y, dt);
    y = plant.step(u, t, dt);
    ys.push(y);
  }
  return ys;
}

const ysUntrained = run(untrained);
const ysTrained = run(trained);

console.log('\nclosed-loop run (plant gain doubles at t=6s):');
const m0a = stepMetrics(ysUntrained.slice(0, 600), 0.01);   // 0-6s, before the gain change
const m0b = stepMetrics(ysUntrained.slice(600), 0.01, 1);
const m1a = stepMetrics(ysTrained.slice(0, 600), 0.01);
const m1b = stepMetrics(ysTrained.slice(600), 0.01, 1);
console.log('  untrained (fixed) PID : overshoot 0-6s', m0a.overshoot.toFixed(1) + '%,  error at t=12s', (1 - ysUntrained.at(-1)).toFixed(4));
console.log('  trained (scheduled) PID: overshoot 0-6s', m1a.overshoot.toFixed(1) + '%,  error at t=12s', (1 - ysTrained.at(-1)).toFixed(4));
console.log('\n(this plant/rule are only for illustration — swap in your own plant, or replace ruleOfThumb with');
console.log(' NeuroFuzzyPID.trainFromGainSchedule(teacher, ...) to learn from an existing fuzzyPID.js controller instead.)');
