const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;
const out = arm.assistAsNeeded(
  {
    q:    [0.3,-0.5,0.7,0.1,0.4,-0.2],
    qd:   new Array(6).fill(0),
    qRef: [0.4,-0.6,0.8,0.1,0.4,-0.2],   // 0.1 rad away on joint 0
  },
  {
    Kp:[50,50,50, 20,20,20],             // transparent stiffness
    Kd:[ 5, 5, 5,  2,  2,  2],
    KpTransparent:[0,0,0,0,0,0],
    KdTransparent:[0,0,0,0,0,0],
    eMin: 0.02,
    eMax: 0.10,
    model
  }
);

console.log(`alpha = ${out.alpha.toFixed(3)} (0=transparent, 1=assist)`);
console.log("τ:", out.tau.map(v => v.toFixed(2)));
