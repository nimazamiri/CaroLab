// Example 1
const Manipulator = require("../caro.manipulator-1.0");
const FrictionRLS = require("./frictionRLS");

const arm = new Manipulator();
const rls = new FrictionRLS(6, { lambda: 0.998, P0: 50 });

// True friction (unknown to identifier)
const trueFric = { tau_c: 0.45, b: 0.08, tau_offset: 0.05 };
const I = 0.5;   // effective inertia

let q = 0, qd = 0;
const dt = 0.001;

console.log("iter    τ_c     b      τ_off   residual");
for (let k = 0; k < 20000; k++) {
  const t = k * dt;
  // Reference: sum of sines → persistence of excitation
  const qRef  = 0.5*Math.sin(1.5*t) + 0.3*Math.sin(3.7*t + 0.6);
  const qdRef = 0.75*Math.cos(1.5*t) + 1.11*Math.cos(3.7*t + 0.6);

  // PD control
  const tauCmd = I * 0 + 200*(qRef - q) + 15*(qdRef - qd);

  // True friction torque
  const tauFric = trueFric.tau_c * Math.sign(qd)
                + trueFric.b * qd
                + trueFric.tau_offset;

  // Plant
  const qdd = (tauCmd - tauFric) / I;
  qd += qdd * dt;
  q  += qd * dt;

  // Measured torque (motor current × kt, with noise)
  const tauMeas = tauCmd + 0.02*(Math.random() - 0.5);

  // RLS input: y = τ_meas − I·q̈  ≈  τ_friction
  const y = tauMeas - I * qdd;

  rls.update(0, qd, y);

  if (k % 2000 === 0) {
    const est = rls.estimate()[0];
    const res = rls.residLast[0];
    console.log(`${String(k).padStart(5)}  ${est.tau_c.toFixed(4)}  ${est.b.toFixed(4)}  ${est.tau_offset.toFixed(4)}  ${res.toFixed(4)}`);
  }
}


/*
iter    τ_c     b      τ_off   residual
    0  0.1000  0.0100  0.0000   0.0000
 2000  0.4871  0.0771  0.0449  -0.0123
 4000  0.4504  0.0801  0.0496   0.0021
 6000  0.4498  0.0800  0.0502  -0.0008
 8000  0.4500  0.0800  0.0500   0.0004
10000  0.4500  0.0800  0.0500   0.0002
*/