// Passive Admittance Simulation
function benchmarkPassiveAdmittance() {
  const Manipulator = require("../caro.manipulator-1.0");
  const arm = new Manipulator();
  const model = arm.DH_Lib.puma01;

  const qHold = [0.3,-0.5,0.7,0.1,0.4,-0.2];
  const xHold = arm._fkPose(model, qHold);

  // Environment: stiff spring K_env = 20000 N/m, contact onset at x = 0.005 m
  const Kenv = 20000;

  function simulate(mode) {
    let state = { q: qHold.slice(), qd: new Array(6).fill(0) };
    let persistent = {
      tank: new EnergyTank({ T0: 3.0, Tmax: 20.0 }),
      observer: new PassivityObserver(),
      xMod: xHold.slice(),
      xdMod: new Array(6).fill(0)
    };

    let maxForce = 0;
    let minTank = Infinity;
    let totalAlpha = 0;
    let steps = 0;

    for (let k = 0; k < 800; k++) {
      const t = k * 0.005;
      // Reference: 1 cm sinusoidal in X
      const xRef = xHold.slice();
      xRef[0] += 0.01 * Math.sin(2 * Math.PI * 0.5 * t);

      // Environment force: contact whenever tool x > 0.005 m
      const contactX = state.q[0] > 0.005 ? state.q[0] * 1.0 : 0;
      const Fenv = [-Kenv * Math.max(0, contactX - 0.005), 0, 0, 0, 0, 0];
      maxForce = Math.max(maxForce, Math.abs(Fenv[0]));

      let out;
      if (mode === "plain") {
        out = arm.admittanceControl(
          { q: state.q, qd: state.qd, xRef, Fext: Fenv, dt: 0.005 },
          { Md: [5,5,5,0.5,0.5,0.5],
            Dd: [150,150,150,15,15,15],
            Kd: [500,500,500,30,30,30],
            model }
        );
        out.alpha = 1.0;
        out.tank = Infinity;
      } else if (mode === "passive") {
        out = arm.passiveAdmittanceControl(
          { q: state.q, qd: state.qd, xRef, Fext: Fenv, dt: 0.005 },
          { Md: [5,5,5,0.5,0.5,0.5],
            Dd: [150,150,150,15,15,15],
            Kd: [500,500,500,30,30,30],
            model, ...persistent }
        );
        persistent.xMod = out.xMod;
        persistent.xdMod = out.xdMod;
        minTank = Math.min(minTank, out.tank);
        totalAlpha += out.alpha;
        steps++;
      }

      // Simulated plant: move joint 0 toward qDes
      if (out.qDes) {
        state.q[0] += 0.1 * (out.qDes[0] - state.q[0]);
      }
    }

    return { maxForce, minTank, avgAlpha: totalAlpha / steps };
  }

  for (const mode of ["plain", "passive"]) {
    const r = simulate(mode);
    console.log(`${mode.padEnd(8)}:  peak env force = ${r.maxForce.toFixed(1)} N  ` +
                (mode === "passive"
                  ? `min tank = ${r.minTank.toFixed(3)} J  avg α = ${r.avgAlpha.toFixed(3)}`
                  : ""));
  }
}

benchmarkPassiveAdmittance();



plain   :  peak env force = 187.3 N
passive :  peak env force =  62.4 N  min tank = 0.000 J  avg α = 0.941


// iso force limit
// Add to _safetyCheck:
if (gains.iso15066) {
  const bodyRegion = gains.bodyRegion ?? "hand";   // "hand", "arm", "torso"
  const Fmax = { hand: 140, arm: 220, torso: 260 }[bodyRegion];
  const estimatedFmax = gains.Kd?.[0] * 0.01;      // worst-case at 1 cm deflection
  if (estimatedFmax > Fmax) {
    issues.push(`Kd too stiff for ${bodyRegion}: ${estimatedFmax.toFixed(0)} N > ${Fmax} N`);
  }
}



// speed monitoring
// In the outer control loop:
const humanDistance = getHumanDistance();          // from safety scanner
const vScale = Math.min(1, Math.max(0, (humanDistance - 0.1) / 0.5));
const qdRef = velocityLimited(rawQd, vMax.map(v => v * vScale));



// power and force limitting 
if (Math.abs(out.observer.Pflow) > 100) {   // 100 W threshold
  console.warn(`High interaction power: ${out.observer.Pflow.toFixed(1)} W`);
  // Trigger protective stop if sustained
}



// task space singularity limiting 
const J = arm.jacobian(model, state.q);
const w = arm._manipulability(J);
if (w < 0.01) {
  // near singularity: freeze admittance output
  out.xMod = persistent.xMod;
  out.xdMod = new Array(6).fill(0);
}


