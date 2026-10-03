// hybrid position and force
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;
const out = arm.hybridControl(
  {
    q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
    qd: new Array(6).fill(0),
    xRef: [0.40, 0.05, 0.35, 0, 0, 0],
    Fref: [0, 0, -10, 0, 0, 0],         // push 10 N downward
    Fext: [0, 0, -3, 0, 0, 0]           // current contact is 3 N
  },
  {
    S: [0, 0, 1, 0, 0, 0],              // force along Z
    Kp:[500,500,0, 30,30,30],
    Kd:[ 50, 50,0,  5, 5, 5],
    Kf:[0,0,0.8, 0,0,0],
    Kfi:[0,0,0.05, 0,0,0],
    model
  }
);

console.log("Wrench cmd:", out.wrenchCmd.map(v => v.toFixed(2)));
console.log("τ:", out.tau.map(v => v.toFixed(2)));