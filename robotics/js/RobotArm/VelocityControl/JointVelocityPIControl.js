// joint velocity PI control
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

let state = {
  q:  [0.3,-0.5,0.7,0.1,0.4,-0.2],
  qd: [0.4, 0.3, 0.6, 0.1, 0.4, 0.2]   // lagging behind
};

let integral = new Array(6).fill(0);
let prevQd   = state.qd.slice();

for (let k = 0; k < 5; k++) {
  const out = arm.jointVelocityControl(
    { q: state.q, qd: state.qd, qdRef: new Array(6).fill(0.5) },
    { Kp: 30, Ki: 3, Kd: 0.5, model, integral, prevQd, dt: 0.005 }
  );
  integral = out.integral;
  prevQd   = state.qd.slice();

  console.log(`tick ${k}: velErr=[${out.velError.map(v=>v.toFixed(2))}]  τ=[${out.tau.map(v=>v.toFixed(2))}]`);

  // simple plant: qd += tau / M * dt
  state.qd = state.qd.map((v, i) => v + out.tau[i] * 0.001);
}