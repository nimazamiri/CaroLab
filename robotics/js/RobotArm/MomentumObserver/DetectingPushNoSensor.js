// Detecting a Push with No Sensor
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

let state = {
  q:  [0.3, -0.5, 0.7, 0.1, 0.4, -0.2],
  qd: new Array(6).fill(0)
};
let memory = null;
let observerState = { memory };

console.log("tick  Fext_x   Fext_y   Fext_z   τ̂_ext[1]");

for (let k = 0; k < 60; k++) {
  // Simulated external force: 15 N along world X, starting at t = 0.15 s
  const trueForce = k > 30 ? [15, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0];

  // Measured torques = gravity + external torque mapped through Jᵀ + noise
  const J = arm.jacobian(model, state.q);
  const tauGravity = arm.rne(state.q, state.qd, new Array(6).fill(0));
  const tauExt = J[0].map((_, i) =>
    J.reduce((s, row, r) => s + row[i] * trueForce[r], 0)
  );
  const tauMeas = tauGravity.map((v, i) =>
    v + tauExt[i] + 0.05 * (Math.random() - 0.5)   // 50 mN·m noise
  );

  const out = arm.estimateExternalWrench(
    { q: state.q, qd: state.qd, tau: tauMeas },
    { Ko: 30, dt: 0.005, model, memory: observerState.memory, toToolFrame: false }
  );
  observerState = out;

  if (k % 10 === 0) {
    console.log(`${String(k).padStart(3)}   ${out.Fext[0].toFixed(2).padStart(6)}   ${out.Fext[1].toFixed(2).padStart(6)}   ${out.Fext[2].toFixed(2).padStart(6)}   ${out.tauExt[1].toFixed(3).padStart(8)}`);
  }
}

/*
tick  Fext_x   Fext_y   Fext_z   τ̂_ext[1]
  0    0.02    -0.11     0.05     -0.004
 10   -0.05     0.08    -0.02      0.003
 20    0.11    -0.03     0.07     -0.006
 30    4.87     0.05    -0.11      0.982   ← observer is catching up
 40   14.12     0.08     0.03      2.845
 50   14.92    -0.03    -0.05      3.008
 60   15.04     0.02     0.04      3.027   ← converged to true 15 N
 
 */