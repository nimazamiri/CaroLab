const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.defaultModel;

const q  = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
const qd = [0.0,  0.0, 0.0, 0.0, 0.0,  0.0];

const xCur = arm._fkPose(model, q);   // ← now defined
const xRef = xCur.slice();
xRef[0] += 0.05;

const Fext = [-20, 0, 0, 0, 0, 0];

const out = arm.impedanceControl(
  { q: q, qd: qd, xRef: xRef, Fext: Fext },
  {
    Md: [5,5,5, 0.5,0.5,0.5],
    Dd: [150,150,150, 15,15,15],
    Kd: [800,800,800, 40,40,40],
    model: model
  }
);

console.log("Fimp:", out.Fimp.map(v => v.toFixed(2)));
console.log("τ   :", out.tau.map(v => v.toFixed(3)));