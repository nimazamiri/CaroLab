// Convergence Diagnostic Over Time
const FrictionRLS = require("frictionRLS");

function convergenceReport() {
  const n = 6;
  const rls = new FrictionRLS(n, { lambda: 0.997, P0: 30 });
  const trueFric = [
    {tau_c: 0.45, b: 0.08,  tau_offset:  0.05},
    {tau_c: 0.65, b: 0.12,  tau_offset:  0.10},
    {tau_c: 0.30, b: 0.05,  tau_offset: -0.03},
    {tau_c: 0.12, b: 0.03,  tau_offset:  0.01},
    {tau_c: 0.06, b: 0.015, tau_offset: -0.005},
    {tau_c: 0.03, b: 0.008, tau_offset:  0.002}
  ];
  const I = [0.5, 0.8, 0.4, 0.15, 0.08, 0.03];
  const freq = [
    {w1: 1.2, w2: 3.7}, {w1: 0.9, w2: 3.1}, {w1: 1.6, w2: 4.4},
    {w1: 2.1, w2: 5.2}, {w1: 2.8, w2: 6.0}, {w1: 3.2, w2: 7.1}
  ];

  let q  = new Array(n).fill(0);
  let qd = new Array(n).fill(0);
  const dt = 0.001;

  console.log("  t(s)  | joint 1 τ_c (true=0.450) | joint 2 b (true=0.120) | joint 1 PE");
  for (let k = 0; k < 6000; k++) {
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
    for (let j = 0; j < n; j++) rls.update(j, qd[j], tauMeas[j] - I[j]*qdd[j]);

    if (k % 500 === 0) {
      const est = rls.estimate();
      const pe  = rls.excitationScore();
      console.log(`  ${t.toFixed(2).padStart(5)}  | ${est[0].tau_c.toFixed(4).padStart(22)} | ${est[1].b.toFixed(4).padStart(22)} | ${pe[0].toExponential(2)}`);
    }
  }
}
convergenceReport();

/*
t(s)  | joint 1 τ_c (true=0.450) | joint 2 b (true=0.120) | joint 1 PE
 0.00  |                 0.1000 |                 0.0100 | 0.00e+0
 0.50  |                 0.2813 |                 0.0694 | 1.23e+3
 1.00  |                 0.4098 |                 0.1072 | 3.87e+3
 1.50  |                 0.4467 |                 0.1187 | 6.42e+3
 2.00  |                 0.4502 |                 0.1199 | 8.91e+3
 2.50  |                 0.4500 |                 0.1200 | 1.12e+4
 3.00  |                 0.4500 |                 0.1200 | 1.35e+4
 ...
 
 */