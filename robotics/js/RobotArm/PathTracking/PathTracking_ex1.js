const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// use default PUMA
const p1 = [0.40, 0.00, 0.40];
const p2 = [0.30, 0.00, 0.50];
const path = arm.pathTracking(p1, p2, "line", { steps: 20 });

/*
// use a different robot
arm.pathTracking(P1, P2, "line", {
  steps: 20,
  model: arm.DH_Lib.ur5,
  useNumerical: true,
  q0: [0,0,0,0,0,0]
});
*/

console.log("path ok:", path.every(w => w.ok));

path.forEach((wp, i) =>
  console.log(`step ${i}: ok=${wp.ok} q=[${wp.q.map(x=>x.toFixed(2)).join(",")}]`)
);