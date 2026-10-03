// resolved-rate cartesian motion
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

const s = {
  q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
  xd: [0.05, 0.0, 0.0, 0.0, 0.0, 0.1]   // 5 cm/s in X, 0.1 rad/s about Z
};

const out = arm.resolvedRateControl(s, { model, method: "dls", lambda: 0.05 });

console.log("q̇_ref:", out.qdRef.map(v => v.toFixed(3)));
console.log("Manipulability:", out.manipulability.toFixed(4));



// compare three methods
const singular = {
  q: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  xd: [0, 0, 0, 0, 0, 0.1]
};

for (const method of ["pinv", "dls", "trans"]) {
  const r = arm.resolvedRateControl(singular, { model, method, lambda: 0.1 });
  console.log(`${method.padEnd(6)} → q̇ = [${r.qdRef.map(v=>v.toFixed(2)).join(", ")}]`);
}