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

const result = arm.numericalIK(p, R, { q0: [0,0,0,0,0,0] });

console.log("Cold start → converged:", result.converged,
            "| iter:", result.iterations,
            "| err:", result.error.toExponential(2));
            
