const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

// Robot state measured by encoders
const q  = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
const qd = [0.0,  0.0, 0.0, 0.0, 0.0,  0.0];

// Reference pose: 5 cm to the right of current
const xCur = arm._fkPose(model, q);
const xRef = [...xCur];
xRef[0] += 0.05;

// External wrench: a 20 N push along -X
const Fext = [-20, 0, 0, 0, 0, 0];

const out = arm.impedanceControl(
  { q, qd, xRef, Fext },
  {
    Md: [5,5,5, 0.5,0.5,0.5],
    Dd: [150,150,150, 15,15,15],
    Kd: [800,800,800, 40,40,40],
    model
  }
);

console.log("Cartesian impedance force Fimp:", out.Fimp.map(v => v.toFixed(1)));
console.log("Joint torques τ:", out.tau.map(v => v.toFixed(2)));
