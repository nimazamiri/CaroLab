//operational space control
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

const out = arm.operationalSpaceControl(
  {
    q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
    qd: new Array(6).fill(0),
    xRef: [0.42, 0.02, 0.38, 0, 0, 0],
    xdRef: new Array(6).fill(0),
    xddRef: new Array(6).fill(0)
  },
  {
    Kp:[800,800,800, 40,40,40],
    Kd:[ 60, 60, 60,  6,  6,  6],
    model
  }
);

console.log("Λ (op-space inertia diag):", out.Λ.map((row,i) => row[i].toFixed(3)).join(", "));
console.log("F_cmd:", out.F_cmd.map(v => v.toFixed(2)));
console.log("τ:", out.tau.map(v => v.toFixed(2)));