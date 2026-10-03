const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

const q0   = [0, 0, 0, 0, 0, 0];   // all joints at zero

const { T, flat } = arm.forwardKin(puma, q0);

const T_ = T.map(row =>
  row.map(v => Math.round(v * 1e4) / 1e4)
);

const flat_ = flat.map(v => Number(v.toFixed(4)));

console.log("Tool position  p =", [T_[0][3], T_[1][3], T_[2][3]]);
console.log("Tool x-axis   n =", [T_[0][0], T_[1][0], T_[2][0]]);
console.log("Tool y-axis   o =", [T_[0][1], T_[1][1], T_[2][1]]);
console.log("Tool z-axis   a =", [T_[0][2], T_[1][2], T_[2][2]]);
console.log("Flattened n,o,a,p tuple:", flat_);
