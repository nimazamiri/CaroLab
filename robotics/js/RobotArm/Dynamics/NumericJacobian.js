const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

function numericJacobian(arm, model, q, eps = 1e-6) {
  const { T: T0 } = arm.forwardKin(model, q);
  const p0 = [T0[0][3], T0[1][3], T0[2][3]];
  const J = arm._zeros(3, q.length);

  for (let i = 0; i < q.length; i++) {
    const qP = [...q]; qP[i] += eps;
    const { T: Tp } = arm.forwardKin(model, qP);
    const pp = [Tp[0][3], Tp[1][3], Tp[2][3]];
    for (let r = 0; r < 3; r++) J[r][i] = (pp[r] - p0[r]) / eps;
  }
  return J;
}

const q = [0.3, -0.4, 0.5, 0.0, 0.6, 0.2];
const Janal = arm.jacobian(arm.DH_Lib.puma01, q).slice(0, 3);  // linear part
const Jnum  = numericJacobian(arm, arm.DH_Lib.puma01, q);

console.log("Analytical vs numerical (max abs diff):");
for (let r = 0; r < 3; r++) {
  const diff = Janal[r].map((v, i) => Math.abs(v - Jnum[r][i]).toFixed(3));
  console.log(`  row ${r}: max = ${Math.max(...diff).toExponential(2)}`);
}
