const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

const q = [0.3, -0.4, 0.5, 0.0, 0.6, 0.2];

// Build Ai list manually
const Ai = puma.map((row, i) => {
  const [th0, a, d, alpha] = row;
  return arm.DH(th0 + q[i], a, d, alpha);
});

const { T: T2, flat: flat2 } = arm.forwardKin(Ai);

const T2_ = T2.map(row =>
  row.map(v => Math.round(v * 1e4) / 1e4)
);

console.log("Position from Ai chain:", [T2_[0][3], T2_[1][3], T2_[2][3]]);