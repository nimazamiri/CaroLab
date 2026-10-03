# CaroLab Linear Algebra & Estimation Library

- **Name:** caro.linear-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Equation Solving, Regression & Estimation](#a-primary-library-for-equation-solving-regression--estimation)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
   - [Debugging Programs](#debugging-programs)
3. [CaroLab Linear Library — Functions List](#carolab-linear-library--functions-list)
4. [Detail Description](#detail-description)
   - [Polynomial & Equation Solving](#polynomial--equation-solving)
   - [Linear Systems](#linear-systems)
   - [Regression & Curve Fitting](#regression--curve-fitting)
   - [Dimensionality Reduction](#dimensionality-reduction)
   - [State Estimation](#state-estimation)

---

## Introduction

### A Primary Library for Equation Solving, Regression & Estimation

`caro.linear-1.0.js` is a **plain-function** library (no classes, no shared instance state) covering equation solving, linear-system solving, curve fitting, dimensionality reduction, and recursive state estimation. Unlike `caro.statistics-1.0.js` and `caro.matrix-1.0.js`, whose operations hang off a `Sample`/`Matrix` instance constructed once from the data, every function here takes its data **directly as arguments on each call** — there is no wrapper object to construct first.

The library covers five broad areas:

| Area | Examples |
|---|---|
| Polynomial & equation solving | `solveQuadratic`, `solveCubic`, `solvePolynomial` |
| Linear systems | `solveGaussJordan` |
| Regression & curve fitting | `linearRegression`, `fitPolynomial` |
| Dimensionality reduction | `pca`, `jacobiEigen` |
| State estimation | `createKalmanFilter` |

The library has no external dependencies and runs unmodified in a browser `<script>` tag or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/caro.linear-1.0.js"></script>
<script>
  const roots = solveQuadratic(1, -3, 2);
  console.log('Roots:', roots);
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const { solveQuadratic } = require('./caro.linear-1.0.js');

const roots = solveQuadratic(1, -3, 2);

console.log('Roots:', roots);
```

Then run it by node.js:

```
node program1.js
```

> **Note on usage:** unlike `Sample`/`Matrix`, there is no constructor step — every function is called directly with its own data each time (`solveQuadratic(a, b, c)`, `linearRegression(xValues, yValues)`, etc.). `createKalmanFilter` is the one exception: it is a **factory** — called once with the model matrices to get back a stateful `{ predict, update, getState }` object that then carries its own internal state (`x`, `P`) across repeated `predict`/`update` calls.

### Debugging Programs

- Equation solvers degrade gracefully rather than throwing in most edge cases: `solveQuadratic` returns `"Infinite solutions"` or `"No solution"` for the degenerate `a = 0, b = 0` case, and falls back to the linear/quadratic case when the leading coefficient(s) vanish. `solveCubic` falls back to `solveQuadratic` when `a = 0`.
- `solveGaussJordan` and `solveGaussJordan`-based callers (`fitPolynomial`) return the **string** `"No solution"` or `"Infinite solutions"` instead of a numeric array when the system is inconsistent or rank-deficient — check the return type before indexing into it.
- `fitPolynomial` throws `Fitting failed: ...` (wrapping the `solveGaussJordan` string result) when the normal-equations system cannot be solved unambiguously, and logs a `console.warn` (does not throw) when `order >= n` (more coefficients than data points).
- `linearRegression` throws explicit `Error`s for mismatched array lengths (`xValues and yValues must have the same length`), too few points (`Need at least 2 points`), and identical x-values (`All x-values are identical; cannot fit a line`).
- `pca` throws `k (${k}) cannot exceed number of features (${d})` if more components are requested than available features.
- `createKalmanFilter`'s internal `invert` helper throws `Matrix is singular, cannot invert` if the innovation covariance `S` is singular during `update`.
- `solvePolynomial` never throws for a valid degree ≥ 1; it throws `Degree must be at least 1` only after stripping leading zero coefficients leaves nothing of higher degree.
- Complex results (`solveQuadratic`, `solvePolynomial`) are returned as **formatted strings** (e.g. `"1.000000 + 2.000000i"`), not numeric objects — parse them yourself if you need the real/imaginary parts back out.

---

## CaroLab Linear Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `solveQuadratic` | Solves `ax² + bx + c = 0`, including linear and complex-root cases |
| 2 | `solveCubic` | Solves `ax³ + bx² + cx + d = 0` via the depressed-cubic method |
| 3 | `solvePolynomial` | Solves a polynomial of any degree via the Durand–Kerner method |
| 4 | `solveGaussJordan` | Solves a linear system `Ax = b` via Gauss–Jordan elimination |
| 5 | `fitPolynomial` | Least-squares polynomial curve fit of a chosen order |
| 6 | `linearRegression` | Ordinary least-squares simple linear regression |
| 7 | `pca` | Principal Component Analysis via covariance + Jacobi eigendecomposition |
| 8 | `jacobiEigen` | Jacobi eigenvalue algorithm for symmetric matrices |
| 9 | `createKalmanFilter` | Factory for a linear Kalman filter (`predict` / `update` / `getState`) |

---

## Detail Description

### Polynomial & Equation Solving

- **Function:** `solveQuadratic`
  **Description:** Solves `ax² + bx + c = 0`. Falls back to the linear case if `a = 0`, and to `"Infinite solutions"` / `"No solution"` if both `a = 0` and `b = 0`. Returns two real roots, one repeated root, or two complex roots (as formatted strings) depending on the sign of the discriminant.
  **Syntax:** `roots = solveQuadratic(a, b, c);`
  **Input Arguments:** `a`, `b`, `c`: numbers (quadratic coefficients)
  **Output Arguments:** `roots`: array of numbers or complex-root strings, or `"Infinite solutions"` / `"No solution"`
  **Formula:** `x = (−b ± √(b² − 4ac)) / 2a`
  **Coding Example:**
  ```javascript
  const roots = solveQuadratic(1, -3, 2); // [2, 1]
  ```

- **Function:** `solveCubic`
  **Description:** Solves `ax³ + bx² + cx + d = 0`. Falls back to `solveQuadratic` if `a = 0`. Normalizes to a depressed cubic `t³ + pt + q = 0`, then branches on the discriminant: one real root (Cardano's formula via cube roots), a repeated root, or three distinct real roots (trigonometric method).
  **Syntax:** `roots = solveCubic(a, b, c, d);`
  **Input Arguments:** `a`, `b`, `c`, `d`: numbers (cubic coefficients)
  **Output Arguments:** `roots`: array of 1–3 real numbers
  **Method:** Substitutes `x = t − b/3a` to remove the quadratic term, giving `p = c − b²/3`, `q = 2b³/27 − bc/3 + d`; the sign of `Δ = q²/4 + p³/27` selects the solving branch.

- **Function:** `solvePolynomial`
  **Description:** Solves a polynomial of arbitrary degree `n` given as coefficients `[aₙ, aₙ₋₁, …, a₀]`, using the Durand–Kerner method — simultaneous fixed-point iteration over all `n` complex roots from circular initial guesses.
  **Syntax:** `roots = solvePolynomial(coeffs, options);`
  **Input Arguments:** `coeffs`: array of `n + 1` numbers, highest degree first; `options.maxIterations`: iteration cap (default `500`); `options.tolerance`: convergence threshold on the largest per-root update (default `1e-12`)
  **Output Arguments:** `roots`: array of `n` values — real numbers, or complex roots formatted as `"re + imi"` / `"re - imi"` strings
  **Errors:** `Degree must be at least 1` (after stripping leading zero coefficients)
  **Method:** Normalizes so the leading coefficient is 1, seeds `n` initial guesses as powers of a fixed complex seed `0.4 + 0.9i`, then repeatedly updates each root `rᵢ ← rᵢ − p(rᵢ) / Πⱼ≠ᵢ(rᵢ − rⱼ)` until convergence; near-zero imaginary parts (`< 1e-10`) are snapped to real.

---

### Linear Systems

- **Function:** `solveGaussJordan`
  **Description:** Solves the linear system `Ax = b` via Gauss–Jordan elimination with partial pivoting on the augmented matrix `[A | b]`, reducing all the way to reduced row-echelon form (eliminating both above and below each pivot) rather than stopping at upper-triangular form.
  **Syntax:** `x = solveGaussJordan(A, b);`
  **Input Arguments:** `A`: 2D array (`n × n`); `b`: array of length `n`
  **Output Arguments:** `x`: array of length `n`, or the string `"No solution"` / `"Infinite solutions"` for an inconsistent or rank-deficient system
  **Method:** Skips normalizing/eliminating any column whose pivot magnitude falls below `1e-12` (handling rank-deficient systems without throwing), then classifies the result by scanning for all-zero rows with a nonzero (`No solution`) or zero (`Infinite solutions`) right-hand side.

---

### Regression & Curve Fitting

- **Function:** `fitPolynomial`
  **Description:** Least-squares polynomial fit of a chosen `order` to `(x, y)` data, by forming and solving the normal equations `(XᵀX)c = Xᵀy` with `solveGaussJordan`.
  **Syntax:** `result = fitPolynomial(xValues, yValues, order);`
  **Input Arguments:** `xValues`, `yValues`: arrays of equal length `n`; `order`: non-negative integer degree of the fitted polynomial
  **Output Arguments:** `result`: `{ coefficients, evaluate, rSquared }` — `coefficients`: array `[a₀, a₁, …, a_order]` for `a₀ + a₁x + … `; `evaluate(x)`: function returning the fitted value at `x`; `rSquared`: coefficient of determination
  **Errors:** `xValues and yValues must have the same length`; `Order must be >= 0`; `Fitting failed: ...` (wrapping a `solveGaussJordan` string result)
  **Notes:** Logs a `console.warn` (does not throw) when `order >= n`, since the system is then underdetermined. Precomputes power sums of `x` up to `2·order` to build the normal-equations matrix efficiently.

- **Function:** `linearRegression`
  **Description:** Ordinary least-squares fit of a straight line `y = slope·x + intercept` to `(x, y)` data, via the closed-form covariance/variance formula (equivalent to `fitPolynomial(x, y, 1)` but computed directly, without a linear-system solve).
  **Syntax:** `result = linearRegression(xValues, yValues);`
  **Input Arguments:** `xValues`, `yValues`: arrays of equal length `n ≥ 2`
  **Output Arguments:** `result`: `{ slope, intercept, evaluate, rSquared }` — `evaluate(x)`: function returning the fitted value at `x`
  **Errors:** `xValues and yValues must have the same length`; `Need at least 2 points`; `All x-values are identical; cannot fit a line`
  **Formula:** `slope = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)²`, `intercept = ȳ − slope·x̄`

---

### Dimensionality Reduction

- **Function:** `pca`
  **Description:** Principal Component Analysis on an `n × d` data matrix: centers the data, builds the `d × d` covariance matrix, eigendecomposes it with `jacobiEigen`, and projects the centered data onto the top `k` eigenvectors (ranked by eigenvalue, descending).
  **Syntax:** `result = pca(data, k);`
  **Input Arguments:** `data`: array of `n` rows, each an array of `d` feature values; `k`: number of principal components to keep, `k ≤ d`
  **Output Arguments:** `result`: `{ components, eigenvalues, explainedVarianceRatio, projected, mean, project }` — `components`: `k × d` array of principal axes; `eigenvalues`: top `k` eigenvalues; `explainedVarianceRatio`: each top eigenvalue divided by the total; `projected`: `n × k` transformed data; `mean`: length-`d` column-mean vector used for centering; `project(x)`: function projecting a new length-`d` point onto the `k` components
  **Errors:** `` k (${k}) cannot exceed number of features (${d}) ``
  **Method:** Covariance entries use the unbiased divisor `n − 1`; component ordering and sign are whatever `jacobiEigen` produces (no fixed sign convention is enforced).

- **Function:** `jacobiEigen`
  **Description:** Classic Jacobi eigenvalue algorithm for a **symmetric** matrix: repeatedly zeroes the largest-magnitude off-diagonal element via a plane rotation until the matrix is (nearly) diagonal. Used internally by `pca` to eigendecompose the covariance matrix, but usable standalone for any symmetric matrix.
  **Syntax:** `result = jacobiEigen(matrix, maxIterations, tolerance);`
  **Input Arguments:** `matrix`: 2D array, `n × n` and symmetric; `maxIterations`: sweep cap (default `100`); `tolerance`: convergence threshold on the largest off-diagonal magnitude (default `1e-10`)
  **Output Arguments:** `result`: `{ eigenvalues, eigenvectors }` — `eigenvalues`: array of `n` numbers (final diagonal); `eigenvectors`: `n × n` array whose **columns** are the eigenvectors
  **Method:** At each iteration, finds the single largest off-diagonal entry `A[p][q]`, computes a rotation angle that zeroes it, applies the rotation to both the working matrix and the accumulated eigenvector matrix `V`, and stops early once the largest off-diagonal magnitude drops below `tolerance`.

---

### State Estimation

- **Function:** `createKalmanFilter`
  **Description:** Factory for a discrete linear Kalman filter. Given the model matrices once, returns a stateful object exposing `predict`, `update`, and `getState`, which internally track and mutate the current state estimate `x` and its covariance `P` across calls.
  **Syntax:** `kf = createKalmanFilter({ F, H, Q, R, x0, P0 });`
  **Input Arguments:** `F`: state transition matrix (`n × n`); `H`: observation matrix (`m × n`); `Q`: process noise covariance (`n × n`); `R`: measurement noise covariance (`m × m`); `x0`: initial state estimate (flat array, length `n`); `P0`: initial estimate covariance (`n × n`)
  **Output Arguments:** `kf`: `{ predict(u, B), update(z), getState() }`
  **Method:**
  - `predict(u, B)` — advances the state with `x = Fx (+ Bu` if a control input/matrix is given`)` and `P = FPFᵀ + Q`; returns `{ x, P }`.
  - `update(z)` — incorporates measurement `z`: innovation `y = z − Hx`, innovation covariance `S = HPHᵀ + R`, Kalman gain `K = PHᵀS⁻¹`, then `x = x + Ky` and `P = (I − KH)P`; returns `{ x, P }`.
  - `getState()` — returns the current `{ x, P }` without advancing the filter.
  **Errors:** `Matrix is singular, cannot invert` (from the internal matrix-inversion helper, thrown by `update` if `S` is singular)
  **Notes:** All matrix/vector arithmetic (`matMul`, `matVecMul`, `transpose`, `matAdd`, `matSub`, `invert`, etc.) is implemented privately inside the closure returned by `createKalmanFilter`, independent of `caro.matrix-1.0.js`'s `Matrix` class.

---
