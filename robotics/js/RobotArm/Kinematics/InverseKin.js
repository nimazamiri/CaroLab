const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

const qTarget = [0.2, -0.5, 0.8, 0.3, 0.4, -0.1];

// Forward: get pose
const { T } = arm.forwardKin(puma, qTarget);
const position    = [T[0][3], T[1][3], T[2][3]];
const orientation = [
  [T[0][0], T[0][1], T[0][2]],
  [T[1][0], T[1][1], T[1][2]],
  [T[2][0], T[2][1], T[2][2]]
];

// Inverse: recover angles
const qSolved = arm.inverseKin(position, orientation);

console.log("Target q :", qTarget.map(x => x.toFixed(3)));
console.log("Solved q :", qSolved.map(x => x.toFixed(3)));
