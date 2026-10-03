const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// Custom link inertias (mass kg, inertia kg·m²)
arm.dynamics = [
  { m: 7.0, r: [0, 0, 0], I: arm._diag3(0.05, 0.05, 0.02) },
  { m: 10.0, r: [0, 0, 0], I: arm._diag3(0.20, 0.20, 0.05) },
  { m: 5.0,  r: [0, 0, 0], I: arm._diag3(0.10, 0.10, 0.03) },
  { m: 2.0,  r: [0, 0, 0], I: arm._diag3(0.02, 0.02, 0.01) },
  { m: 1.5,  r: [0, 0, 0], I: arm._diag3(0.01, 0.01, 0.005) },
  { m: 0.5,  r: [0, 0, 0], I: arm._diag3(0.005, 0.005, 0.002) }
];

const q   = [0.0, Math.PI/4, -Math.PI/4, 0.0, 0.0, 0.0];
const qd  = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1];   // rad/s
const qdd = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];   // no acceleration

const tau = arm.rne(q, qd, qdd);
console.log("Gravity + Coriolis torques:");
tau.forEach((t, i) => console.log(`  τ${i+1} = ${t.toFixed(3)} N·m`));