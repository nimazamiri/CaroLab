// velocity limiting and S-curve filtering
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// ---- 1. Velocity limiting ----
const rawQd = [2.0, -1.5, 3.0, 0.5, 1.2, -0.8];   // <-- replaces out.qdRef
const limited = arm.velocityLimited(rawQd, 0.5);

console.log("raw     :", rawQd.map(v => v.toFixed(3)));
console.log("limited :", limited.map(v => v.toFixed(3)));
console.log("");

// ---- 2. S-curve acceleration filter ----
let qdPrev  = new Array(6).fill(0);
let qddPrev = new Array(6).fill(0);
const qdRef = new Array(6).fill(1.0);      // step from 0 → 1 rad/s

console.log("step  qd[0]    qdd[0]");
for (let k = 0; k < 40; k++) {
  const step = arm.accelerationLimited(qdRef, qdPrev, qddPrev, {
    aMax: 5.0, jMax: 200.0, dt: 0.005
  });
  qdPrev  = step.qd;
  qddPrev = step.qdd;
  if (k % 5 === 0)
    console.log(`${k}     ${step.qd[0].toFixed(3)}   ${step.qdd[0].toFixed(3)}`);
}