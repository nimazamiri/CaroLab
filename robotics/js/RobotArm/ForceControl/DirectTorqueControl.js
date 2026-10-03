// direct torque control
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const out = arm.directTorqueControl(
  {
    q:    [0.3,-0.5,0.7,0.1,0.4,-0.2],
    qd:   new Array(6).fill(0),
    qRef: [0.3,-0.5,0.7,0.1,0.4,-0.2],   // hold current
    qdRef: new Array(6).fill(0),
    qddRef: new Array(6).fill(0)
  },
  {
    Kp:[300,300,300, 80, 80, 80],
    Kd:[ 30, 30, 30,  8,  8,  8],
    model,
    feedforward: true
  }
);

console.log("τ_ff:", out.tauFF.map(v => v.toFixed(2)));
console.log("τ_fb:", out.tauFB.map(v => v.toFixed(2)));
console.log("τ   :", out.tau.map(v => v.toFixed(2)));