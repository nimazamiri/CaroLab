const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const farAway = [5.0, 5.0, 5.0];   // way outside workspace

const result = arm.numericalIK(farAway, [
  [1,0,0],[0,1,0],[0,0,1]
], { maxIter: 100 });

console.log("Converged :", result.converged);
console.log("Reason    :", result.reason);
console.log("Final err :", result.error.toFixed(3), "m");
console.log("Final q   :", result.q.map(x => x.toFixed(3)));