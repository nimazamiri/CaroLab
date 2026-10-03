// parallel position force (contour following)
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;
const out = arm.parallelControl(
  {
    q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
    qd: new Array(6).fill(0),
    xRef: [0.40, 0.05, 0.35, 0, 0, 0],
    Fref: [0, 0, -5, 0, 0, 0],
    Fext: [0, 0, -2, 0, 0, 0]
  },
  {
    Kp:[400,400,400, 20,20,20],
    Kd:[ 40, 40, 40,  5, 5, 5],
    Kf:[0.0005,0.0005,0.005, 0,0,0],   // compliance
    model
  }
);

console.log("Modified x:", out.xModified.map(v => v.toFixed(4)));
console.log("τ:", out.tau.map(v => v.toFixed(2)));