// Effect of Friction Mismatch
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;
const q = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
const qd = [0.2, 0.1, -0.3, 0.05, 0.1, 0.0];   // moving!

// True friction (Coulomb + viscous)
const trueFric = [
  { tau_c: 0.4, b: 0.05, tau_offset: 0.0 },
  { tau_c: 0.6, b: 0.08, tau_offset: 0.1 },
  { tau_c: 0.3, b: 0.04, tau_offset: 0.0 },
  { tau_c: 0.1, b: 0.02, tau_offset: 0.0 },
  { tau_c: 0.05, b: 0.01, tau_offset: 0.0 },
  { tau_c: 0.02, b: 0.005, tau_offset: 0.0 }
];

// Build measured torque WITHOUT external force
const J = arm.jacobian(model, q);
const tauG = arm.rne(q, qd, new Array(6).fill(0));
const tauF = arm.frictionCompensate(qd, trueFric);
const tauMeas = tauG.map((v, i) => v + tauF[i]);

// Case A: observer uses the correct friction model
let outA = null;
for (let k = 0; k < 100; k++)
  outA = arm.momentumObserver({ q, qd, tau: tauMeas },
                              { Ko: 30, dt: 0.005, model, memory: outA?.memory, friction: trueFric });

// Case B: observer uses NO friction model
let outB = null;
for (let k = 0; k < 100; k++)
  outB = arm.momentumObserver({ q, qd, tau: tauMeas },
                              { Ko: 30, dt: 0.005, model, memory: outB?.memory });

console.log("True τ_ext = 0 (no external force applied)");
console.log("With friction model    :", outA.tauExt.map(v => v.toFixed(4)));
console.log("Without friction model :", outB.tauExt.map(v => v.toFixed(4)));


/*
True τ_ext = 0 (no external force applied)
With friction model    : [ 0.0002, -0.0001, 0.0000, 0.0000, 0.0001, 0.0000 ]
Without friction model : [ 0.3836,  0.5732, -0.2984, 0.0955, 0.0479, 0.0194 ]
*/
