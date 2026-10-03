const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const curvePath = arm.pathTracking(
  [0.30, 0.00, 0.40],
  [0.50, 0.20, 0.40],
  "curve",
  {
    steps: 6,
    C1: [0.40, -0.10, 0.45],   // first control point
    C2: [0.45,  0.10, 0.35]    // second control point
  }
);

curvePath.forEach(wp =>
  console.log(`p=[${wp.p.map(x => x.toFixed(3)).join(", ")}]`)
);