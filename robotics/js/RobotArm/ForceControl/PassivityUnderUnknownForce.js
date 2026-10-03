// passivity under unknown patient force
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

let state = {
  q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
  qd: new Array(6).fill(0)
};

let persistent = {
  tank: new EnergyTank({ T0: 3.0, Tmax: 20.0 }),
  observer: new PassivityObserver(),
  xMod: arm._fkPose(model, state.q),
  xdMod: new Array(6).fill(0)
};

console.log("t      Fext     α      T (J)   Pflow    Pspring");
for (let k = 0; k < 200; k++) {
  const t = k * 0.005;

  // Patient force: slowly rotating push, magnitude 10 N
  const Fmag = 10;
  const angle = 0.5 * Math.sin(0.4 * t);
  const Fext = [
    Fmag * Math.cos(angle),
    Fmag * Math.sin(angle),
    0, 0, 0, 0
  ];

  const out = arm.passiveAdmittanceControl(
    {
      q: state.q, qd: state.qd,
      Fext,
      xRef: arm._fkPose(model, state.q),   // hold current pose as reference
      dt: 0.005
    },
    {
      Md: [5,5,5, 0.5,0.5,0.5],
      Dd: [150,150,150, 15,15,15],
      Kd: [500,500,500, 30,30,30],
      model,
      ...persistent
    }
  );

  // Update persistent state
  persistent.tank = out.tankRef ?? persistent.tank;
  persistent.xMod = out.xMod;
  persistent.xdMod = out.xdMod;
  persistent.observer = persistent.observer;   // same object mutated

  if (k % 20 === 0) {
    console.log(
      `${t.toFixed(2)}  ${Math.hypot(...Fext.slice(0,3)).toFixed(2)}  ` +
      `${out.alpha.toFixed(3)}  ${out.tank.toFixed(3).padStart(6)}  ` +
      `${out.observer.Pflow.toFixed(3).padStart(7)}  ${out.observer.Pspring.toFixed(3).padStart(8)}`
    );
  }
}


/*
t      Fext     α      T (J)   Pflow    Pspring
0.00   10.00  1.000   3.000     0.000     0.000
0.10   10.00  1.000   3.019     2.104    -0.312
0.20   10.00  1.000   3.052     2.011    -0.208
...
1.00   10.00  1.000   3.251     0.504    -0.011
*/
