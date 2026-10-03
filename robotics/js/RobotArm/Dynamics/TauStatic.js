const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const tauStatic = arm.rne([0, 0, 0, 0, 0, 0], [0,0,0,0,0,0], [0,0,0,0,0,0]);
console.log("Holding torque at zero pose:", tauStatic.map(t => t.toFixed(3)));