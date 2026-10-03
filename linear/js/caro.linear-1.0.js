/* =========================================================
 *  CaroLab - Linear Algebra Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */

function solveQuadratic(a, b, c) {
  if (a === 0) {
    if (b === 0) return c === 0 ? "Infinite solutions" : "No solution";
    return [-c / b]; // linear case
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant > 0) {
    const sqrtD = Math.sqrt(discriminant);
    const x1 = (-b + sqrtD) / (2 * a);
    const x2 = (-b - sqrtD) / (2 * a);
    return [x1, x2];
  } else if (discriminant === 0) {
    return [-b / (2 * a)];
  } else {
    const real = -b / (2 * a);
    const imag = Math.sqrt(-discriminant) / (2 * a);
    return [`${real} + ${imag}i`, `${real} - ${imag}i`];
  }
}

function solveCubic(a, b, c, d) {
  if (a === 0) {
    // Falls back to quadratic
    return solveQuadratic(b, c, d);
  }

  // Normalize to x^3 + px + q = 0 form (depressed cubic)
  // Divide everything by a first
  b /= a; c /= a; d /= a;

  const p = c - (b * b) / 3;
  const q = (2 * b * b * b) / 27 - (b * c) / 3 + d;

  const roots = [];
  const shift = -b / 3; // to undo the depression substitution

  const discriminant = (q * q) / 4 + (p * p * p) / 27;

  if (discriminant > 0) {
    // One real root
    const sqrtDisc = Math.sqrt(discriminant);
    const u = Math.cbrt(-q / 2 + sqrtDisc);
    const v = Math.cbrt(-q / 2 - sqrtDisc);
    roots.push(u + v + shift);
  } else if (discriminant === 0) {
    // Multiple real roots, at least two equal
    const u = Math.cbrt(-q / 2);
    roots.push(2 * u + shift);
    roots.push(-u + shift);
  } else {
    // Three distinct real roots (trigonometric method)
    const r = Math.sqrt(-(p * p * p) / 27);
    const phi = Math.acos(-q / (2 * r));
    const m = 2 * Math.sqrt(-p / 3);

    roots.push(m * Math.cos(phi / 3) + shift);
    roots.push(m * Math.cos((phi + 2 * Math.PI) / 3) + shift);
    roots.push(m * Math.cos((phi + 4 * Math.PI) / 3) + shift);
  }

  return roots;
}


function solvePolynomial(coeffs, options = {}) {
  // coeffs: [a_n, a_{n-1}, ..., a_1, a_0] for a_n*x^n + ... + a_0
  const { maxIterations = 500, tolerance = 1e-12 } = options;

  // Strip leading zero coefficients
  while (coeffs.length > 1 && coeffs[0] === 0) coeffs.shift();

  const n = coeffs.length - 1; // degree
  if (n < 1) throw new Error("Degree must be at least 1");

  // Normalize so leading coefficient is 1
  const a = coeffs.map(c => c / coeffs[0]);

  // Complex number helpers
  const cAdd = (x, y) => ({ re: x.re + y.re, im: x.im + y.im });
  const cSub = (x, y) => ({ re: x.re - y.re, im: x.im - y.im });
  const cMul = (x, y) => ({
    re: x.re * y.re - x.im * y.im,
    im: x.re * y.im + x.im * y.re
  });
  const cDiv = (x, y) => {
    const denom = y.re * y.re + y.im * y.im;
    return {
      re: (x.re * y.re + x.im * y.im) / denom,
      im: (x.im * y.re - x.re * y.im) / denom
    };
  };
  const cAbs = (x) => Math.sqrt(x.re * x.re + x.im * x.im);
  const cPow = (x, k) => {
    let result = { re: 1, im: 0 };
    for (let i = 0; i < k; i++) result = cMul(result, x);
    return result;
  };

  // Evaluate polynomial at a complex point
  const evalPoly = (x) => {
    let result = { re: 0, im: 0 };
    for (let i = 0; i <= n; i++) {
      result = cAdd(result, cMul({ re: a[i], im: 0 }, cPow(x, n - i)));
    }
    return result;
  };

  // Initial guesses: spread points on a circle (classic Durand-Kerner trick)
  let roots = [];
  const base = { re: 0.4, im: 0.9 }; // arbitrary non-trivial complex seed
  for (let i = 0; i < n; i++) {
    roots.push(cPow(base, i));
  }

  // Iterate
  for (let iter = 0; iter < maxIterations; iter++) {
    let maxChange = 0;
    const newRoots = roots.slice();

    for (let i = 0; i < n; i++) {
      let denom = { re: 1, im: 0 };
      for (let j = 0; j < n; j++) {
        if (i !== j) denom = cMul(denom, cSub(roots[i], roots[j]));
      }
      const delta = cDiv(evalPoly(roots[i]), denom);
      newRoots[i] = cSub(roots[i], delta);
      maxChange = Math.max(maxChange, cAbs(delta));
    }

    roots = newRoots;
    if (maxChange < tolerance) break;
  }

  // Clean up: snap near-zero imaginary parts to real, round tiny noise
  return roots.map(r => {
    const re = Math.abs(r.re) < 1e-10 ? 0 : r.re;
    const im = Math.abs(r.im) < 1e-10 ? 0 : r.im;
    return im === 0 ? re : `${re.toFixed(6)} ${im >= 0 ? "+" : "-"} ${Math.abs(im).toFixed(6)}i`;
  });
}

function solveGaussJordan(A, b) {
  const n = A.length;

  // Build augmented matrix [A | b]
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // --- Partial pivoting: find row with largest absolute value in this column ---
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivotRow][col])) {
        pivotRow = row;
      }
    }

    // Swap current row with pivot row
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];

    const pivot = M[col][col];

    if (Math.abs(pivot) < 1e-12) {
      // Column is effectively all zeros below/at this row → singular or dependent system
      continue; // skip normalizing this column, move on (handles rank-deficient cases)
    }

    // --- Normalize pivot row so pivot element becomes 1 ---
    for (let j = 0; j <= n; j++) {
      M[col][j] /= pivot;
    }

    // --- Eliminate this column from all OTHER rows (both above and below) ---
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = M[row][col];
        for (let j = 0; j <= n; j++) {
          M[row][j] -= factor * M[col][j];
        }
      }
    }
  }

  // --- Extract solution & check consistency ---
  const x = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    // Check for row like [0 0 ... 0 | nonzero] => no solution
    const rowIsZero = A[i] ? M[i].slice(0, n).every(v => Math.abs(v) < 1e-9) : false;
    if (rowIsZero && Math.abs(M[i][n]) > 1e-9) {
      return "No solution";
    }
    x[i] = M[i][n];
  }

  // Detect infinite solutions (any all-zero row, including RHS)
  const hasFreeRow = M.some(row => row.slice(0, n).every(v => Math.abs(v) < 1e-9) && Math.abs(row[n]) < 1e-9);
  if (hasFreeRow) {
    return "Infinite solutions";
  }

  return x;
}


function fitPolynomial(xValues, yValues, order) {
  const n = xValues.length;

  if (yValues.length !== n) {
    throw new Error("xValues and yValues must have the same length");
  }
  if (order < 0) {
    throw new Error("Order must be >= 0");
  }
  if (order > n - 1) {
    console.warn(`Order ${order} >= number of points (${n}). System may be underdetermined; reduce order or add points.`);
  }

  const m = order + 1; // number of coefficients (a0..am)

  // Build normal equations: (X^T X) c = X^T y
  // A[i][j] = sum(x^(i+j)), for i,j = 0..order
  // B[i]    = sum(x^i * y)
  const A = Array.from({ length: m }, () => new Array(m).fill(0));
  const B = new Array(m).fill(0);

  // Precompute power sums of x up to 2*order to avoid recomputation
  const powerSums = new Array(2 * order + 1).fill(0);
  for (let k = 0; k <= 2 * order; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Math.pow(xValues[i], k);
    powerSums[k] = sum;
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      A[i][j] = powerSums[i + j];
    }
    let bSum = 0;
    for (let k = 0; k < n; k++) {
      bSum += Math.pow(xValues[k], i) * yValues[k];
    }
    B[i] = bSum;
  }

  const coeffs = solveGaussJordan(A, B); // [a0, a1, ..., am] for a0 + a1*x + ... + am*x^m

  if (coeffs === "No solution" || coeffs === "Infinite solutions") {
    throw new Error(`Fitting failed: ${coeffs}. Try a lower order or check for duplicate x-values.`);
  }

  // Helper to evaluate the fitted polynomial at any x
  const evaluate = (x) => coeffs.reduce((sum, c, i) => sum + c * Math.pow(x, i), 0);

  // R² goodness-of-fit
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;
  const ssTot = yValues.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  const ssRes = yValues.reduce((sum, y, i) => sum + (y - evaluate(xValues[i])) ** 2, 0);
  const rSquared = 1 - ssRes / ssTot;

  return { coefficients: coeffs, evaluate, rSquared };
}


function linearRegression(xValues, yValues) {
  const n = xValues.length;

  if (yValues.length !== n) {
    throw new Error("xValues and yValues must have the same length");
  }
  if (n < 2) {
    throw new Error("Need at least 2 points");
  }

  const xMean = xValues.reduce((a, b) => a + b, 0) / n;
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
  }

  if (Math.abs(denominator) < 1e-12) {
    throw new Error("All x-values are identical; cannot fit a line");
  }

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  const evaluate = (x) => slope * x + intercept;

  // R² goodness-of-fit
  const ssTot = yValues.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  const ssRes = yValues.reduce((sum, y, i) => sum + (y - evaluate(xValues[i])) ** 2, 0);
  const rSquared = 1 - ssRes / ssTot;

  return { slope, intercept, evaluate, rSquared };
}

function pca(data, k) {
  // data: array of rows, each row an array of feature values (n samples x d features)
  const n = data.length;
  const d = data[0].length;

  if (k > d) {
    throw new Error(`k (${k}) cannot exceed number of features (${d})`);
  }

  // --- 1. Center the data (subtract column means) ---
  const means = new Array(d).fill(0);
  for (const row of data) {
    for (let j = 0; j < d; j++) means[j] += row[j];
  }
  for (let j = 0; j < d; j++) means[j] /= n;

  const centered = data.map(row => row.map((v, j) => v - means[j]));

  // --- 2. Covariance matrix (d x d) ---
  const cov = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      let sum = 0;
      for (let s = 0; s < n; s++) sum += centered[s][i] * centered[s][j];
      cov[i][j] = sum / (n - 1);
    }
  }

  // --- 3. Eigen-decomposition of covariance matrix (Jacobi method) ---
  const { eigenvalues, eigenvectors } = jacobiEigen(cov);

  // --- 4. Sort by eigenvalue descending, take top k ---
  const order = eigenvalues
    .map((val, idx) => ({ val, idx }))
    .sort((a, b) => b.val - a.val)
    .slice(0, k);

  const topEigenvalues = order.map(o => o.val);
  // eigenvectors[i] is the i-th eigenvector (as a row); pick corresponding columns
  const components = order.map(o => eigenvectors.map(row => row[o.idx])); // k x d

  // --- 5. Project centered data onto top-k components ---
  const projected = centered.map(row =>
    components.map(comp => row.reduce((sum, v, i) => sum + v * comp[i], 0))
  );

  // --- 6. Explained variance ratio ---
  const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);
  const explainedVarianceRatio = topEigenvalues.map(v => v / totalVariance);

  return {
    components,              // k x d: principal axes (rows)
    eigenvalues: topEigenvalues,
    explainedVarianceRatio,
    projected,                // n x k: transformed data
    mean: means,
    project: (x) => components.map(comp => x.reduce((sum, v, i) => sum + (v - means[i]) * comp[i], 0))
  };
}

// Jacobi eigenvalue algorithm for symmetric matrices
function jacobiEigen(matrix, maxIterations = 100, tolerance = 1e-10) {
  const n = matrix.length;
  const A = matrix.map(row => [...row]);
  let V = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let iter = 0; iter < maxIterations; iter++) {
    // Find largest off-diagonal element
    let off = 0, p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) > off) {
          off = Math.abs(A[i][j]);
          p = i; q = j;
        }
      }
    }

    if (off < tolerance) break;

    // Compute rotation angle
    const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
    const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;

    const App = A[p][p], Aqq = A[q][q], Apq = A[p][q];
    A[p][p] = c * c * App - 2 * s * c * Apq + s * s * Aqq;
    A[q][q] = s * s * App + 2 * s * c * Apq + c * c * Aqq;
    A[p][q] = A[q][p] = 0;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const Aip = A[i][p], Aiq = A[i][q];
        A[i][p] = A[p][i] = c * Aip - s * Aiq;
        A[i][q] = A[q][i] = s * Aip + c * Aiq;
      }
    }

    for (let i = 0; i < n; i++) {
      const Vip = V[i][p], Viq = V[i][q];
      V[i][p] = c * Vip - s * Viq;
      V[i][q] = s * Vip + c * Viq;
    }
  }

  const eigenvalues = A.map((row, i) => row[i]);
  return { eigenvalues, eigenvectors: V }; // V's columns are eigenvectors
}



function createKalmanFilter({ F, H, Q, R, x0, P0 }) {
  // F: state transition matrix (n x n)
  // H: observation matrix (m x n)
  // Q: process noise covariance (n x n)
  // R: measurement noise covariance (m x m)
  // x0: initial state estimate (n x 1, as flat array)
  // P0: initial estimate covariance (n x n)

  const n = F.length;

  let x = [...x0];          // state estimate
  let P = P0.map(row => [...row]); // estimate covariance

  // --- Matrix helpers ---
  const matMul = (A, B) => {
    const rows = A.length, cols = B[0].length, inner = B.length;
    const result = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        for (let k = 0; k < inner; k++)
          result[i][j] += A[i][k] * B[k][j];
    return result;
  };

  const matVecMul = (A, v) =>
    A.map(row => row.reduce((sum, a, j) => sum + a * v[j], 0));

  const transpose = (A) =>
    A[0].map((_, j) => A.map(row => row[j]));

  const matAdd = (A, B) =>
    A.map((row, i) => row.map((v, j) => v + B[i][j]));

  const matSub = (A, B) =>
    A.map((row, i) => row.map((v, j) => v - B[i][j]));

  const vecSub = (a, b) => a.map((v, i) => v - b[i]);
  const vecAdd = (a, b) => a.map((v, i) => v + b[i]);

  const identity = (size) =>
    Array.from({ length: size }, (_, i) =>
      Array.from({ length: size }, (_, j) => (i === j ? 1 : 0))
    );

  // Matrix inverse via Gauss-Jordan (reuses the same approach as solveGaussJordan,
  // generalized here to invert a full matrix instead of solving Ax = b)
  const invert = (M) => {
    const size = M.length;
    const aug = M.map((row, i) => [
      ...row,
      ...identity(size)[i]
    ]);

    for (let col = 0; col < size; col++) {
      let pivotRow = col;
      for (let row = col + 1; row < size; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[pivotRow][col])) pivotRow = row;
      }
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-12) throw new Error("Matrix is singular, cannot invert");

      for (let j = 0; j < 2 * size; j++) aug[col][j] /= pivot;

      for (let row = 0; row < size; row++) {
        if (row !== col) {
          const factor = aug[row][col];
          for (let j = 0; j < 2 * size; j++) aug[row][j] -= factor * aug[col][j];
        }
      }
    }

    return aug.map(row => row.slice(size));
  };

  return {
    // Advance the state estimate using the motion model (no measurement yet)
    predict(u = null, B = null) {
      // x = F*x (+ B*u if a control input is provided)
      x = matVecMul(F, x);
      if (u && B) x = vecAdd(x, matVecMul(B, u));

      // P = F*P*F^T + Q
      P = matAdd(matMul(matMul(F, P), transpose(F)), Q);

      return { x: [...x], P: P.map(row => [...row]) };
    },

    // Incorporate a new measurement z to correct the state estimate
    update(z) {
      const Ht = transpose(H);

      // Innovation: y = z - H*x
      const y = vecSub(z, matVecMul(H, x));

      // Innovation covariance: S = H*P*H^T + R
      const S = matAdd(matMul(matMul(H, P), Ht), R);

      // Kalman gain: K = P*H^T*S^-1
      const K = matMul(matMul(P, Ht), invert(S));

      // Updated state: x = x + K*y
      x = vecAdd(x, matVecMul(K, y));

      // Updated covariance: P = (I - K*H)*P
      const I = identity(n);
      P = matMul(matSub(I, matMul(K, H)), P);

      return { x: [...x], P: P.map(row => [...row]) };
    },

    getState: () => ({ x: [...x], P: P.map(row => [...row]) })
  };
}


