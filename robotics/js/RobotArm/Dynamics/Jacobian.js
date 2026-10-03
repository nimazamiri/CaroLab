const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

const q = [0.3, -0.4, 0.5, 0.0, 0.6, 0.2];
const J = arm.jacobian(puma, q);

console.log("Jacobian (6 x 6):");
J.forEach(row => console.log(row.map(x => x.toFixed(4).padStart(8))));