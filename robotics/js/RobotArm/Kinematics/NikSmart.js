const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

// A reachable target pose
const qTrue = [0.3, -0.6, 0.9, 0.2, 0.5, -0.1];
const { T } = arm.forwardKin(puma, qTrue);
const p = [T[0][3], T[1][3], T[2][3]];
const R = [
  [T[0][0], T[0][1], T[0][2]],
  [T[1][0], T[1][1], T[1][2]],
  [T[2][0], T[2][1], T[2][2]]
];


// Case 1: analytic path taken
const okTarget = p;
const r1 = arm.inverseKinSmart(okTarget, R);
console.log("Case 1 → method:", r1.method, "| converged:", r1.converged);

// Case 2: seed in a singular wrist config, force numerical
const singularR = [
  [1, 0, 0],
  [0, 0, 1],
  [0,-1, 0]
]; // wrist aligned
const r2 = arm.inverseKinSmart(p, singularR, {
  q0: [0.3, -0.6, 0.9, 0.0, 0.0, 0.0]
});
console.log("Case 2 → method:", r2.method, "| converged:", r2.converged);

// Case 3: unreachable
const r3 = arm.inverseKinSmart([10, 0, 0], [[1,0,0],[0,1,0],[0,0,1]]);
console.log("Case 3 → reason:", r3.reason);