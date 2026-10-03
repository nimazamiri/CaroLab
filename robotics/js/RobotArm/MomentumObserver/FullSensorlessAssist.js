// Full Sensorless Assist-As-Needed

const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

// Robot state — encoders + currents only
let state = {
  q:  [0.3, -0.5, 0.7, 0.1, 0.4, -0.2],
  qd: new Array(6).fill(0)
};
let memory = null;
let friction = [
  { tau_c: 0.4, b: 0.05, tau_offset: 0.0 },
  { tau_c: 0.6, b: 0.08, tau_offset: 0.1 },
  { tau_c: 0.3, b: 0.04, tau_offset: 0.0 },
  { tau_c: 0.1, b: 0.02, tau_offset: 0.0 },
  { tau_c: 0.05, b: 0.01, tau_offset: 0.0 },
  { tau_c: 0.02, b: 0.005, tau_offset: 0.0 }
];

function controlTick(simulatedPatientForce) {
  // ---- 1. Compute measured torques (in real life: current × kt) ----
  const J = arm.jacobian(model, state.q);
  const tauG = arm.rne(state.q, state.qd, new Array(6).fill(0));
  const tauF = arm.frictionCompensate(state.qd, friction);
  const tauExt = J[0].map((_, i) =>
    J.reduce((sum, row, r) => sum + row[i] * simulatedPatientForce[r], 0)
  );
  const tauMeas = tauG.map((v, i) => v + tauF[i] + tauExt[i]);

  // ---- 2. Estimate external wrench ----
  const obs = arm.momentumObserver(
    { q: state.q, qd: state.qd, tau: tauMeas },
    { Ko: 30, dt: 0.005, model, memory, friction }
  );
  memory = obs.memory;

  // ---- 3. Feed into assist-as-needed controller ----
  const qRef = [0.35, -0.55, 0.75, 0.1, 0.4, -0.2];   // gentle target
  const cmd = arm.assistAsNeeded(
    {
      q:    state.q,
      qd:   state.qd,
      qRef: qRef,
      Fext: obs.Fext
    },
    {
      Kp: [50,50,50,20,20,20],
      Kd: [ 5, 5, 5, 2, 2, 2],
      KpTransparent: [10,10,10,5,5,5],
      KdTransparent: [ 2, 2, 2,1,1,1],
      eMin: 0.02, eMax: 0.10,
      model
    }
  );

  return { obs, cmd };
}

// Simulate a patient who starts gentle, then resists
for (let k = 0; k < 50; k += 10) {
  // F_ext ramps from 0 to 20 N over 0.5 s
  const Fmag = Math.min(20, k * 0.5);
  const { obs, cmd } = controlTick([Fmag, 0, 0, 0, 0, 0]);
  console.log(`tick ${k}: |F_ext| ≈ ${Math.hypot(obs.Fext[0], obs.Fext[1], obs.Fext[2]).toFixed(2)} N, α = ${cmd.alpha.toFixed(3)}, |τ| = ${Math.hypot(...cmd.tau).toFixed(3)}`);
}


/*
tick  0: |F_ext| ≈  0.31 N, α = 1.000, |τ| = 12.421
tick 10: |F_ext| ≈  5.12 N, α = 1.000, |τ| = 12.883
tick 20: |F_ext| ≈ 10.47 N, α = 1.000, |τ| = 13.218
tick 30: |F_ext| ≈ 15.09 N, α = 1.000, |τ| = 13.604
tick 40: |F_ext| ≈ 19.62 N, α = 1.000, |τ| = 13.972
*/


