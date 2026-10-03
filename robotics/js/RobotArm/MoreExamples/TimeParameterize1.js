const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// geometric path
const waypoints = arm.pathTracking(
  [0.35, 0.0, 0.35],
  [0.45, 0.1, 0.40],
  "line",
  { steps: 6 }
);

// timed reference
const traj = arm.timeParameterize(waypoints, {
  method: "quintic",
  dt: 0.005,
  vMax: 1.0,     // rad/s
  aMax: 5.0      // rad/s²
});

console.log(`Samples: ${traj.length}, duration: ${traj[traj.length-1].t.toFixed(3)} s`);
traj.slice(0, 5).forEach(pt =>
  console.log(`t=${pt.t.toFixed(3)}  q1=${pt.q[0].toFixed(3)}  qd1=${pt.qd[0].toFixed(3)}  qdd1=${pt.qdd[0].toFixed(3)}`)
);