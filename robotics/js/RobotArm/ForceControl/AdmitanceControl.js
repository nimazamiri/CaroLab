const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.defaultModel;

// Encoders only
const q  = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
const qd = [0.0,  0.0, 0.0, 0.0, 0.0,  0.0];

// Motor current × kt  (measured torque)
const tauMeas = [0.0, -42.0, 11.0, 0.5, 0.2, 0.1];

// Model gravity torque
const tauModel = arm.rne(q, qd, [0,0,0,0,0,0]);
const tauResid = tauMeas.map((v, i) => v - tauModel[i]);

// Residual → Cartesian wrench
const J = arm.jacobian(model, q);

// Option A (no new helper):
const Jpinv  = arm._pseudoInverse(J);                  // n × 6
const JpinvT = Jpinv[0].map((_, i) => Jpinv.map(r => r[i])); // 6 × n
const Fext   = arm._mat_vec(JpinvT, tauResid);

// Option B (if _pinvJT has been added):
// const Fext = arm._mat_vec(arm._pinvJT(J), tauResid);

console.log("tauResid:", tauResid.map(v => v.toFixed(3)));
console.log("Fext    :", Fext.map(v => v.toFixed(3)));

const out = arm.admittanceControl(
  { q: q, qd: qd, xRef: arm._fkPose(model, q), Fext: Fext, dt: 0.005 },
  { Md: [5,5,5, 0.5,0.5,0.5],
    Dd: [200,200,200, 20,20,20],
    Kd: [500,500,500, 30,30,30],
    model: model, dt: 0.005 }
);

console.log("xMod :", out.xMod.map(v => v.toFixed(4)));
console.log("qDes :", out.qDes ? out.qDes.map(v => v.toFixed(3)) : "(no IK)");
console.log("ok   :", out.converged);