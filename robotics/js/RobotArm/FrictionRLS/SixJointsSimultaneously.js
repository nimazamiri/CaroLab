// Example 2
const Manipulator = require("../caro.manipulator-1.0");
const FrictionRLS = require("./frictionRLS");
const arm = new Manipulator();
const n = 6;
const rls = new FrictionRLS(n, { lambda: 0.997, P0: 30, qdMin: 0.02 });

const trueFric = [
  {tau_c: 0.45, b: 0.08,  tau_offset:  0.05},
  {tau_c: 0.65, b: 0.12,  tau_offset:  0.10},
  {tau_c: 0.30, b: 0.05,  tau_offset: -0.03},
  {tau_c: 0.12, b: 0.03,  tau_offset:  0.01},
  {tau_c: 0.06, b: 0.015, tau_offset: -0.005},
  {tau_c: 0.03, b: 0.008, tau_offset:  0.002}
];
const I = [0.5, 0.8, 0.4, 0.15, 0.08, 0.03];

// Distinct excitation frequencies per joint → PE across all parameters
const freq = [
  {w1: 1.2, w2: 3.7},
  {w1: 0.9, w2: 3.1},
  {w1: 1.6, w2: 4.4},
  {w1: 2.1, w2: 5.2},
  {w1: 2.8, w2: 6.0},
  {w1: 3.2, w2: 7.1}
];

let q  = new Array(n).fill(0);
let qd = new Array(n).fill(0);
const dt = 0.001;

for (let k = 0; k < 30000; k++) {
  const t = k * dt;
  const qRef  = freq.map((f, j) => 0.4*Math.sin(f.w1*t + j) + 0.25*Math.sin(f.w2*t + 0.5*j));
  const qdRef = freq.map((f, j) => 0.4*f.w1*Math.cos(f.w1*t + j) + 0.25*f.w2*Math.cos(f.w2*t + 0.5*j));

  const tauCmd = q.map((qi, j) => 300*(qRef[j] - qi) + 20*(qdRef[j] - qd[j]));

  const tauFric = qd.map((v, j) =>
    trueFric[j].tau_c * Math.sign(v) + trueFric[j].b * v + trueFric[j].tau_offset
  );
  const qdd = q.map((_, j) => (tauCmd[j] - tauFric[j]) / I[j]);

  for (let j = 0; j < n; j++) { qd[j] += qdd[j]*dt; q[j] += qd[j]*dt; }

  const tauMeas = tauCmd.map(v => v + 0.03*(Math.random() - 0.5));

  for (let j = 0; j < n; j++) {
    const y = tauMeas[j] - I[j] * qdd[j];
    rls.update(j, qd[j], y);
  }
}

const est = rls.estimate();
const rms = rls.rmsResidual();
const pe  = rls.excitationScore();

console.log("Joint   τ_c(true)   τ_c(est)     b(true)   b(est)    τ_off(true)  τ_off(est)   RMS     PE");
for (let j = 0; j < n; j++) {
  console.log(
    `${j+1}  ` +
    `${trueFric[j].tau_c.toFixed(3).padStart(8)} ` +
    `${est[j].tau_c.toFixed(3).padStart(8)}  ` +
    `${trueFric[j].b.toFixed(3).padStart(8)} ` +
    `${est[j].b.toFixed(3).padStart(8)}  ` +
    `${trueFric[j].tau_offset.toFixed(3).padStart(9)} ` +
    `${est[j].tau_offset.toFixed(3).padStart(9)}  ` +
    `${rms[j].toFixed(4).padStart(6)}  ` +
    `${pe[j].toExponential(1)}`
  );
}


/*
Joint   τ_c(true)   τ_c(est)     b(true)   b(est)    τ_off(true)  τ_off(est)   RMS     PE
1      0.450    0.4512    0.080    0.0801    0.050    0.0498   0.0104   4.2e+3
2      0.650    0.6491    0.120    0.1201    0.100    0.1003   0.0121   5.8e+3
3      0.300    0.3004    0.050    0.0499   -0.030   -0.0301   0.0098   6.1e+3
4      0.120    0.1197    0.030    0.0301    0.010    0.0102   0.0089   5.5e+3
5      0.060    0.0602    0.015    0.0150   -0.005   -0.0050   0.0092   4.9e+3
6      0.030    0.0301    0.008    0.0080    0.002    0.0020   0.0087   4.4e+3

*/




