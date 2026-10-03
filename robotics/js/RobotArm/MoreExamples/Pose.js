const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const q = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];

const pose = arm._fkPose(arm.defaultModel, q);
console.log("pose:", pose.map(v => v.toFixed(4)));

// round-trip: pose → T → pose
const p = pose.slice(0, 3);
const R = arm._eulerToR(pose.slice(3, 6));   // small-angle only!
const T = arm._poseToT(p, R);
console.log("T[0..2][3]:", [T[0][3], T[1][3], T[2][3]].map(v => v.toFixed(4)));

