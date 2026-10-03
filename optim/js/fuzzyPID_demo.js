/* =========================================================
 *  CaroLab - Fuzzy PID Example  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 *
 *  Needs caro.fuzzy-1.0.js and caro.fuzzyPID-1.0.js in the same folder.
 *
 * ========================================================= */

'use strict';
const { SimplestFuzzyPID, AdaptiveFuzzyPID, SwitchedFuzzyPID } = require('./caro.fuzzyPID-1.0.js');

/* 3rd-order plant from Mohan & Sinha (2004), Eq. (30):
 *   Gp(s) = (s^2 - s - 2) / (s^3 + 3 s^2 - 10 s - 24)
 * simulated in controllable canonical form with small Euler sub-steps. */
function mkPlant(b, a, dt) {
  const A = [[-a[0], -a[1], -a[2]], [1, 0, 0], [0, 1, 0]];
  const B = [1, 0, 0], C = [b[0], b[1], b[2]];
  let x = [0, 0, 0];
  return {
    step(u) {
      const N = 5, h = dt / N;
      for (let i = 0; i < N; i++) {
        const dx = [
          A[0][0] * x[0] + A[0][1] * x[1] + A[0][2] * x[2] + B[0] * u,
          A[1][0] * x[0] + A[1][1] * x[1] + A[1][2] * x[2] + B[1] * u,
          A[2][0] * x[0] + A[2][1] * x[1] + A[2][2] * x[2] + B[2] * u,
        ];
        x = [x[0] + h * dx[0], x[1] + h * dx[1], x[2] + h * dx[2]];
      }
      return C[0] * x[0] + C[1] * x[1] + C[2] * x[2];
    },
  };
}

function stepMetrics(ys, dt, ref = 1) {
  const peak = Math.max(...ys);
  const overshoot = 100 * Math.max(0, peak - ref) / ref;
  let tr = NaN;
  for (let k = 0; k < ys.length; k++) if (ys[k] >= 0.9 * ref) { tr = k * dt; break; }
  let ts = ys.length * dt;
  for (let k = ys.length - 1; k >= 0; k--) if (Math.abs(ys[k] - ref) > 0.02 * ref) { ts = (k + 1) * dt; break; }
  return { peak, overshoot, tr, ts };
}

function demo1_simplestFuzzyPID() {
  console.log('\n=== 1) SimplestFuzzyPID vs the plain PID it "starts from" (Mohan & Sinha, 2004) ===');
  const dt = 0.001, T = 0.1, N = Math.round(T / dt);
  // Fuzzy controller parameters exactly as reported in the paper's own numerical example (Section V):
  const fuzzyOpts = { l: 1900, M: 1900, Nd: 1800, Nv: 2.2, Na: 0.41e-4, NDu: 0.71, dt };
  const fuzzy = new SimplestFuzzyPID(fuzzyOpts);
  console.log('static ("x(0)") gains implied by these normalization factors:', fuzzy.staticGains());

  const plantFor = () => mkPlant([1, -1, -2], [3, -10, -24], dt);
  function run(ctrl) {
    const plant = plantFor(); let y = 0; const ys = [];
    for (let k = 0; k < N; k++) { const e = 1 - y; const u = ctrl.step(e, dt); y = plant.step(u); ys.push(y); }
    return ys;
  }
  const ysFuzzy = run(fuzzy);
  const m = stepMetrics(ysFuzzy, dt);
  console.log(`fuzzy step response: overshoot ${m.overshoot.toFixed(3)}%, rise time ${m.tr.toFixed(4)} s, settling time ${m.ts.toFixed(4)} s`);
  console.log('(paper reports 0.238% / 0.0019 s / 0.0025 s for its fuzzy PID on this same plant)');
}

function demo2_adaptiveFuzzyPID() {
  console.log('\n=== 2) AdaptiveFuzzyPID: Kp = Kp0 + dKp, ... on top of a designer baseline ===');
  // simple 2nd-order plant: G(s) = 1/(s^2 + 0.5 s + 1), forward Euler
  const dt = 0.01, T = 15, N = Math.round(T / dt);
  function mkPlant2() {
    let y = 0, v = 0;
    return { step(u) { const a = u - 0.5 * v - 1 * y; v += a * dt; y += v * dt; return y; } };
  }
  // baseline chosen by hand ("x(0)") - a modest, slightly underdamped PID
  const base = { Kp0: 2.0, Ki0: 0.8, Kd0: 1.0 };
  class LinPID {
    constructor(kp, ki, kd) { Object.assign(this, { kp, ki, kd }); this.i = 0; this.pe = 0; this.first = true; }
    step(e, dt) { const de = this.first ? 0 : (e - this.pe) / dt; this.first = false; this.pe = e; this.i += e * dt; return this.kp * e + this.ki * this.i + this.kd * de; }
  }
  function run(ctrl, disturbAt) {
    const plant = mkPlant2(); let y = 0; const ys = [];
    for (let k = 0; k < N; k++) {
      const t = k * dt, ref = 1;
      let e = ref - y;
      if (disturbAt && t >= disturbAt) e -= 0.3; // step disturbance on the error channel
      const u = ctrl.step(e, dt); y = plant.step(u); ys.push(y);
    }
    return ys;
  }
  const ysBase = run(new LinPID(base.Kp0, base.Ki0, base.Kd0), 8);
  const ysAdaptive = run(new AdaptiveFuzzyPID(Object.assign({ dt, eRange: [-2, 2], ecRange: [-4, 4] }, base)), 8);
  const mb = stepMetrics(ysBase.slice(0, 800), dt), ma = stepMetrics(ysAdaptive.slice(0, 800), dt);
  console.log('baseline-only PID   : overshoot', mb.overshoot.toFixed(2) + '%', ' settle', mb.ts.toFixed(2) + 's');
  console.log('AdaptiveFuzzyPID    : overshoot', ma.overshoot.toFixed(2) + '%', ' settle', ma.ts.toFixed(2) + 's');
  console.log('after the t=8s disturbance, baseline error at t=10s:', (1 - ysBase[1000]).toFixed(4),
    ' AdaptiveFuzzyPID error at t=10s:', (1 - ysAdaptive[1000]).toFixed(4));
}

function demo3_switchedFuzzyPID() {
  console.log('\n=== 3) SwitchedFuzzyPID: Fuzzy1/Fuzzy2/Fuzzy3 branch switching (Lai et al. 2016, Fig. 2) ===');
  const dt = 0.01, N = 300;
  const sw = new SwitchedFuzzyPID({ e0: 0.2, Kp0: 2.0, Ki0: 0.8, Kd0: 1.0, dt, eRange: [-2, 2], ecRange: [-4, 4] });
  let y = 0, v = 0; const branches = {};
  for (let k = 0; k < N; k++) {
    const e = 1 - y;
    const u = sw.step(e, dt);
    const a = u - 0.5 * v - 1 * y; v += a * dt; y += v * dt;
    branches[sw.lastBranch] = (branches[sw.lastBranch] || 0) + 1;
  }
  console.log('final tracking error:', (1 - y).toFixed(4));
  console.log('branch usage over the run:', branches);
}

if (require.main === module) {
  demo1_simplestFuzzyPID();
  demo2_adaptiveFuzzyPID();
  demo3_switchedFuzzyPID();
}
module.exports = { mkPlant, stepMetrics };
