const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

function compareSolvers(arm, qTrue) {
  const { T } = arm.forwardKin(arm.DH_Lib.puma01, qTrue);
  const p = [T[0][3], T[1][3], T[2][3]];
  const R = [
    [T[0][0], T[0][1], T[0][2]],
    [T[1][0], T[1][1], T[1][2]],
    [T[2][0], T[2][1], T[2][2]]
  ];

  const qAna = arm.inverseKin(p, R);
  const num  = arm.numericalIK(p, R, { q0: qAna });   // seed from analytic

  // FK from each solution -> compare final pose
  const { T: Ta } = arm.forwardKin(arm.DH_Lib.puma01, qAna);
  const { T: Tn } = arm.forwardKin(arm.DH_Lib.puma01, num.q);

  const poseDiff = (A, B) => {
    let s = 0;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 4; j++)
        s += (A[i][j] - B[i][j]) ** 2;
    return Math.sqrt(s);
  };

  return {
    analytic:      { q: qAna, poseErr: poseDiff(Ta, T) },
    numerical:     { q: num.q, poseErr: poseDiff(Tn, T),
                     iter: num.iterations, converged: num.converged }
  };
}

const report = compareSolvers(arm, [0.3, -0.6, 0.9, 0.2, 0.5, -0.1]);
console.log(JSON.stringify(report, null, 2));