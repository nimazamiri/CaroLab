const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();


// A single revolute joint with twist
const A1 = arm.DH(
  /* theta */ Math.PI / 4,   // 45°
  /* a     */ 0.0,
  /* d     */ 0.0,
  /* alpha */ Math.PI / 2    // 90°
);

const A1_ = A1.map(row =>
  row.map(v => Math.round(v * 1e4) / 1e4)
);

console.table(A1_);
