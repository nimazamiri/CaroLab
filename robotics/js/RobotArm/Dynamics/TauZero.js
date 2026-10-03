const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const tauZero = arm.rne([0,0,0,0,0,0], [0,0,0,0,0,0], [0,0,0,0,0,0], [0,0,0]);
console.log(tauZero); // Should be [0, 0, 0, 0, 0, 0]