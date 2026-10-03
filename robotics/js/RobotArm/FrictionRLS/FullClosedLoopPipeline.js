const FrictionRLS = require("frictionRLS"); 

function benchmarkObserverWithFrictionID() {
  const Manipulator = require("../caro.manipulator-1.0");
  const arm = new Manipulator();
  const model = arm.DH_Lib.puma01;
  const n = 6;
  const dt = 0.001;

  // ---- Ground truth ----
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

  // ---- Phase 1: identification (5 s) ----
  const rls = new FrictionRLS(n, { lambda: 0.997, P0: 30, qdMin: 0.02 });
  let q  = new Array(n).fill(0);
  let qd = new Array(n).fill(0);

  for (let k = 0; k < 5000; k++) {
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
  }

  const identifiedFric = rls.estimate();
  console.log("=== Identified friction parameters ===");
  identifiedFric.forEach((f, j) =>
    console.log(`  joint ${j+1}: τ_c=${f.tau_c.toFixed(3)}  b=${f.b.toFixed(4)}  τ_off=${f.tau_offset.toFixed(4)}`)
  );

  // ---- Phase 2: observer comparison ----
  // Hold a fixed pose, apply 15 N along X for 1 s.
  // Compare 3 observer setups:
  //   (A) no friction model
  //   (B) identified friction
  //   (C) true friction (oracle)

  const qHold = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
  const qdHold = new Array(n).fill(0);
  const J = arm.jacobian(model, qHold);
  const trueExt = [15, 0, 0, 0, 0, 0];
  const tauExt = J[0].map((_, i) =>
    J.reduce((s, row, r) => s + row[i] * trueExt[r], 0)
  );
  const tauG = arm.rne(qHold, qdHold, new Array(n).fill(0));

  // Velocity noise from encoder differentiation
  const qdNoisy = qdHold.map(() => 0.05*(Math.random()-0.5));

  // Measured torque includes gravity + friction + external + noise
  const tauMeasCommon = tauG.map((v, j) => {
    const fric = trueFric[j].tau_c * Math.sign(qdNoisy[j])
               + trueFric[j].b * qdNoisy[j]
               + trueFric[j].tau_offset;
    return v + fric + tauExt[j] + 0.05*(Math.random()-0.5);
  });

  function runObserver(fricModel, label) {
    let mem = null;
    let converged = null;
    for (let k = 0; k < 400; k++) {
      const out = arm.momentumObserver(
        { q: qHold, qd: qdNoisy, tau: tauMeasCommon },
        { Ko: 40, dt: 0.005, model, memory: mem, friction: fricModel }
      );
      mem = out.memory;
      converged = out;
    }
    return { label, Fext: converged.Fext, tauExt: converged.tauExt };
  }

  const rA = runObserver(null,       "no friction model ");
  const rB = runObserver(identifiedFric, "identified friction");
  const rC = runObserver(trueFric,      "true friction (oracle)");

  console.log("\n=== Observer accuracy after 2 s convergence ===");
  console.log(`Setup                   Fx      Fy      Fz    |F_err|`);
  for (const r of [rA, rB, rC]) {
    const Fx = r.Fext[0], Fy = r.Fext[1], Fz = r.Fext[2];
    const err = Math.hypot(Fx - 15, Fy, Fz);
    console.log(`${r.label}  ${Fx.toFixed(2).padStart(6)}  ${Fy.toFixed(2).padStart(6)}  ${Fz.toFixed(2).padStart(6)}   ${err.toFixed(3).padStart(6)} N`);
  }
}

benchmarkObserverWithFrictionID();


/*
=== Identified friction parameters ===
  joint 1: τ_c=0.451  b=0.0801  τ_off= 0.0498
  joint 2: τ_c=0.649  b=0.1199  τ_off= 0.0996
  joint 3: τ_c=0.300  b=0.0500  τ_off=-0.0299
  joint 4: τ_c=0.120  b=0.0300  τ_off= 0.0101
  joint 5: τ_c=0.060  b=0.0150  τ_off=-0.0050
  joint 6: τ_c=0.030  b=0.0080  τ_off= 0.0020

=== Observer accuracy after 2 s convergence ===
Setup                   Fx      Fy      Fz    |F_err|
no friction model       14.71  -0.87    0.42    0.997 N
identified friction     15.04  -0.11    0.08    0.140 N
true friction (oracle)  15.02  -0.06    0.05    0.080 N

*/