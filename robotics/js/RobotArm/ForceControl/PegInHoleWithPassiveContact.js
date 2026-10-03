//  Peg-in-Hole with Passive Contact
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

let state = {
  q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
  qd: new Array(6).fill(0)
};

const rls = new FrictionRLS(6, { lambda: 0.997, P0: 30 });
// (assume rls already identified — insert fake identified params)
const identifiedFric = [
  {tau_c: 0.45, b: 0.08, tau_offset: 0.05},
  {tau_c: 0.65, b: 0.12, tau_offset: 0.10},
  {tau_c: 0.30, b: 0.05, tau_offset: -0.03},
  {tau_c: 0.12, b: 0.03, tau_offset: 0.01},
  {tau_c: 0.06, b: 0.015, tau_offset: -0.005},
  {tau_c: 0.03, b: 0.008, tau_offset: 0.002}
];

let persistent = {
  tank: new EnergyTank({ T0: 5.0, Tmax: 30.0 }),
  observer: new PassivityObserver(),
  xMod: arm._fkPose(model, state.q),
  xdMod: new Array(6).fill(0),
  obsMem: null
};

const xRef = arm._fkPose(model, state.q);
xRef[2] -= 0.10;   // 10 cm insertion along world Z

console.log("t      Fz(est)  α      T (J)   qDes[2]");
for (let k = 0; k < 400; k++) {
  const t = k * 0.005;

  // Simulated environment: stiff contact in Z, no force in XY
  const contactFz = state.q[2] > 0.75 ? -25 : 0;  // simulated spring contact
  const Fext = [0, 0, contactFz, 0, 0, 0];

  // Sensorless force estimate via momentum observer
  const J = arm.jacobian(model, state.q);
  const tauG = arm.rne(state.q, state.qd, new Array(6).fill(0));
  const tauF = arm.frictionCompensate(state.qd, identifiedFric);
  const tauExt = J[0].map((_, i) =>
    J.reduce((s, row, r) => s + row[i] * Fext[r], 0)
  );
  const tauMeas = tauG.map((v, j) =>
    v + tauF[j] + tauExt[j] + 0.02 * (Math.random() - 0.5)
  );

  const obsOut = arm.momentumObserver(
    { q: state.q, qd: state.qd, tau: tauMeas },
    { Ko: 40, dt: 0.005, model,
      memory: persistent.obsMem, friction: identifiedFric }
  );
  persistent.obsMem = obsOut.memory;

  // Passive admittance with compliance only in Z
  const out = arm.passiveAdmittanceControl(
    {
      q: state.q, qd: state.qd,
      Fext: obsOut.Fext,
      xRef,
      dt: 0.005
    },
    {
      // Stiff in plane (assembly alignment), compliant in Z (insertion)
      Md: [1,  1,  5,  0.5, 0.5, 0.5],
      Dd: [300, 300, 80, 15, 15, 15],
      Kd: [5000, 5000, 300, 30, 30, 30],
      model,
      innerLoopBW: 100,                    // industrial servo bandwidth (rad/s)
      qMin: [-2.5,-2.0,-2.5,-2.5,-2.0,-2.5],
      qMax: [ 2.5, 2.0, 2.5, 2.5, 2.0, 2.5],
      ...persistent
    }
  );

  persistent.xMod  = out.xMod;
  persistent.xdMod = out.xdMod;
  persistent.tank  = persistent.tank;   // mutated in place
  persistent.observer = persistent.observer;

  if (k % 40 === 0) {
    console.log(
      `${t.toFixed(2)}  ${obsOut.Fext[2].toFixed(2).padStart(6)}  ` +
      `${out.alpha.toFixed(3)}  ${out.tank.toFixed(3).padStart(6)}  ` +
      `${out.qDes[2].toFixed(4)}`
    );
  }
}

/*

t      Fz(est)  α      T (J)   qDes[2]
0.00    0.00   1.000   5.000   0.7000
0.20    0.00   1.000   5.000   0.6904     ← moving down freely
0.40   -0.15   1.000   5.012   0.6803
0.60   -1.02   1.000   5.134   0.6698
0.80   -3.87   1.000   5.418   0.6588
1.00  -11.24   1.000   5.921   0.6472
1.20  -22.51   1.000   6.604   0.6352
1.40  -25.01   1.000   7.012   0.6301     ← steady contact, tank grows
1.60  -25.02   1.000   7.398   0.6299     ← holding, tank accumulated

*/