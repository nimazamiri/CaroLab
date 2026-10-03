// full velocity stack
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const qdRaw = [2.0, -1.5, 3.0, 0.5, 1.2, -0.8];   // aggressive command
const state = { qdPrev: new Array(6).fill(0), qddPrev: new Array(6).fill(0) };

const { qd, qdd } = arm.velocityTrajectory(qdRaw, state, {
  qdMax: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  aMax:  5.0,
  jMax: 200.0,
  dt: 0.005
});

console.log("raw :", qdRaw);
console.log("lim :", qd.map(v => v.toFixed(3)));
console.log("qdd :", qdd.map(v => v.toFixed(3)));