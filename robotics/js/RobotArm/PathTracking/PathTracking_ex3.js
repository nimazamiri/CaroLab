const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const center = [0.40, 0.00, 0.40];
const circlePath = arm.pathTracking(center, center, "circle", {
  steps: 8,
  radius: 0.05
});

circlePath.forEach((wp, i) => {
  console.log(`step ${i}: p=[${wp.p.map(x => x.toFixed(3)).join(", ")}]`);
});
