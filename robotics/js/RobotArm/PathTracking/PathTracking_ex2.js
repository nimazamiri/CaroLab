const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// 1. All four modes should produce valid paths
for (const mode of ["line", "circle", "arc", "curve"]) {
  const path = arm.pathTracking(
    [0.35, 0.0, 0.35],
    [0.45, 0.1, 0.40],
    mode,
    { steps: 5, radius: 0.05, arcHeight: 0.03 }
  );
  console.log(mode.padEnd(7), "→", path.length, "waypoints, ok:", path.every(w => w.ok));
}

// 2. Numerical IK path with warm-start
const numPath = arm.pathTracking(
  [0.35, 0.0, 0.35],
  [0.42, 0.05, 0.38],
  "line",
  { steps: 10, useNumerical: true }
);
console.log("numerical path ok:", numPath.every(w => w.ok));

// 3. Custom model
const custom = arm.pathTracking(
  [0.3, 0, 0.3], [0.4, 0, 0.3], "line",
  { steps: 5, model: arm.DH_Lib.puma01 }
);
console.log("custom model path ok:", custom.every(w => w.ok));



