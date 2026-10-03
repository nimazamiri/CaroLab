const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

const q = [0.3, -0.4, 0.5, 0.0, 0.6, 0.2];
const J = arm.jacobian(puma, q);

console.log("Jacobian (6 x 6):");
J.forEach(row => console.log(row.map(x => x.toFixed(4).padStart(8))));

const xDot = [0.01, 0, 0, 0, 0, 0];   // 1 cm/s along world X

// Simple damped least-squares (Tikhonov) solve: q̇ = Jᵀ(JJᵀ + λ²I)⁻¹ ẋ
function dls(J, xDot, lambda = 0.01) {
  const m = J.length, n = J[0].length;
  // A = J·Jᵀ + λ²I  (m×m)
  const A = Array.from({length: m}, (_, i) =>
    Array.from({length: m}, (_, j) => {
      let s = i === j ? lambda * lambda : 0;
      for (let k = 0; k < n; k++) s += J[i][k] * J[j][k];
      return s;
    })
  );
  // solve A·y = ẋ
  const y = solveLinear(A, xDot);
  // q̇ = Jᵀ · y
  return Array.from({length: n}, (_, k) => {
    let s = 0;
    for (let i = 0; i < m; i++) s += J[i][k] * y[i];
    return s;
  });
}

function solveLinear(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / M[i][i]);
}

const qDot = dls(J, xDot);
console.log("Joint velocities:", qDot.map(x => x.toFixed(4)));
