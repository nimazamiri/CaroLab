// direct force control
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

let state = { q: [0.3,-0.5,0.7,0.1,0.4,-0.2], qd: new Array(6).fill(0) };
let integral = 0;

for (let k = 0; k < 10; k++) {
  const R = [[1,0,0],[0,1,0],[0,0,1]];   // tool facing +Z
  const Fmeas = 15 + 2 * Math.sin(k * 0.5);  // sensor noisy around 15 N

  const out = arm.forceControl(
    { q: state.q, qd: state.qd, F_ref: 20, F_meas: Fmeas, R, dt: 0.005 },
    { Kp: 2.0, Ki: 0.3, model, integral }
  );
  integral = out.integral;

  console.log(`tick ${k}: F_cmd=${out.F_cmd.toFixed(2)}  τ1=${out.tau[0].toFixed(3)}`);
}
