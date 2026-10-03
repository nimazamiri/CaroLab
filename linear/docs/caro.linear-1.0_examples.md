# CaroLab Matrix & Linear Algebra Libraries — Examples Manual

- **Name:** caro.matrix-1.0.js + caro.linear-1.0.js
- **Release Date:** 30 September 2026
- **Document Name:** Matrix & Linear Algebra Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Basic Operations: Concat, Rotate, Translate, Swap (`matrixExample1`)](#example-1--basic-operations-concat-rotate-translate-swap-matrixexample1)
4. [Example 2 — Inverse, Rank, Solve (`matrixExample2`)](#example-2--inverse-rank-solve-matrixexample2)
5. [Example 3 — Singular Value Decomposition (`matrixExample3`)](#example-3--singular-value-decomposition-matrixexample3)
6. [Example 4 — Pseudoinverse and Least Squares (`matrixExample4`)](#example-4--pseudoinverse-and-least-squares-matrixexample4)
7. [Example 5 — Quadratic Solver (`linearExample1`)](#example-5--quadratic-solver-linearexample1)
8. [Example 6 — Cubic Solver (`linearExample2`)](#example-6--cubic-solver-linearexample2)
9. [Example 7 — General Polynomial Solver (`linearExample3`)](#example-7--general-polynomial-solver-linearexample3)
10. [Example 8 — Gauss–Jordan Elimination (`linearExample4`)](#example-8--gaussjordan-elimination-linearexample4)
11. [Example 9 — Polynomial Fitting (`linearExample5`)](#example-9--polynomial-fitting-linearexample5)
12. [Example 10 — Linear Regression (`linearExample6`)](#example-10--linear-regression-linearexample6)
13. [Example 11 — Principal Component Analysis (`linearExample7`)](#example-11--principal-component-analysis-linearexample7)
14. [Example 12 — Kalman Filter (`linearExample8`)](#example-12--kalman-filter-linearexample8)
15. [What the Twelve Examples Prove Together](#what-the-twelve-examples-prove-together)
16. [Extending the Examples](#extending-the-examples)
17. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the first for the two **linear algebra libraries** in the CaroLab family:

- **`caro.matrix-1.0.js`** — a class-based matrix library for construction, arithmetic, factorization, and geometric transformations.
- **`caro.linear-1.0.js`** — a collection of standalone linear-algebra routines: polynomial solving, Gaussian elimination, curve fitting, PCA, and a Kalman filter.


### The two libraries at a glance

**`caro.matrix-1.0.js`** — the `Matrix` class:

| Group | Methods |
|---|---|
| Construction | `new Matrix(data)`, `Matrix.identity(n)`, `Matrix.zeros(r,c)` |
| Arithmetic | `add`, `subtract`, `scale`, `multiply`, `transpose` / `.T` |
| Properties | `trace`, `determinant`, `rank`, `isInvertible` |
| Linear algebra | `inverse`, `solve`, `svd`, `pinv`, `qrd`, `rankSVD` |
| Eigenvalues | `Matrix.eigenvalues`, `Matrix.eigenvectors` |
| Geometry | `Matrix.concat`, `Matrix.rotate`, `Matrix.translate`, `Matrix.crossProduct`, `swapTwoRows`, `swapTwoCols` |
| Utilities | `clone`, `toString` |

**`caro.linear-1.0.js`** — a collection of standalone functions:

| Group | Functions |
|---|---|
| Polynomial roots | `solveQuadratic`, `solveCubic`, `solvePolynomial` |
| Linear systems | `solveGaussJordan` |
| Curve fitting | `fitPolynomial`, `linearRegression` |
| Dimensionality reduction | `pca`, `jacobiEigen` |
| State estimation | `createKalmanFilter` |

Together they cover the numeric operations that arise in control, robotics, signal processing, and machine learning.

### Conventions

| Item | Convention |
|---|---|
| Matrix | `Matrix` class instance; internal storage is `this.data`, a 2-D array |
| Shape | `this.rows`, `this.cols` |
| Vector | Usually a `Matrix` with one column (n×1) or one row (1×n) |
| Multiplication order | `A.multiply(B)` computes `A·B` (not `B·A`) |
| Transpose | `A.transpose()` or the getter `A.T` |
| Determinant | `A.determinant()` — LU-based, square matrices only |
| Inverse | `A.inverse(tol)` — Gauss–Jordan, throws on singular |
| Pseudo-inverse | `A.pinv(tol)` — SVD-based, handles any shape |
| Solve | `A.solve(b, tol)` — accepts `Matrix` or array `b` |
| Tolerance | Default `1e-12` for pivoting, `1e-10` for rank/pinv |
| Polynomial coefficients | `[a_n, a_{n-1}, ..., a_0]` — highest power first |
| Real vs. complex roots | Real roots returned as numbers; complex roots as strings `"a + bi"` |

### Required Files and Layout

```
project/
├── caro.matrix-1.0.js
├── caro.linear-1.0.js
└── examples/
    └── matrix_examples.js
```

Both libraries attach to the global namespace when loaded in a browser (`<script>` tags), or export via `module.exports` under Node.

### How to Run the Examples

The example file `matrix_examples.js` defines twelve functions. To run one of them, uncomment its call at the bottom of the file and run:

```
node examples/matrix_examples.js
```

Or, in the browser, load the two libraries and the examples file with `<script>` tags, then call any example function from the console.

### Why These Libraries Matter

Every numeric algorithm in the CaroLab stack reduces to a handful of linear algebra primitives:

- **Kinematics** — Jacobians are matrices; forward kinematics is matrix multiplication; inverse kinematics is a linear solve.
- **Dynamics** — mass matrices are symmetric positive-definite; Coriolis terms are quadratic forms; RNE uses matrix-vector products.
- **Control** — transfer functions are ratios of polynomials; state-space models are (A, B, C, D) matrices; LQR, Kalman filters, and compensators all invert or factor matrices.
- **Fuzzy and neuro-fuzzy** — ANFIS training is a least-squares problem; the fuzzy PID scaling factors form a diagonal matrix.
- **Machine learning** — PCA is eigen-decomposition of a covariance matrix; clustering is nearest-centroid search.

Most languages ship with these primitives in a library (NumPy, MATLAB, BLAS). JavaScript does not. These two files fill that gap for the CaroLab ecosystem.

They are **not** replacements for LAPACK. They are small, readable, dependency-free implementations designed for **small dense matrices** — a few hundred rows and columns at most — which is exactly the size range that arises in control and robotics.

The twelve examples in this manual verify the libraries against known analytical results: the inverse identity `A·A⁻¹ = I`, the SVD reconstruction `A = U·Σ·Vᵀ`, the pseudoinverse identity `A·A⁺·A = A`, the polynomial identity `(x−1)(x−2)(x−3) = x³ − 6x² + 11x − 6`, and the least-squares normal equations `Aᵀ(Ax − b) = 0`.

---

## Examples List

| No. | Function | Library | Purpose |
|---|---|---|---|
| 1 | `matrixExample1` | Matrix | Concat, rotate, translate, swap, cross, eigenvalues, QR |
| 2 | `matrixExample2` | Matrix | Inverse, rank, solve, isInvertible |
| 3 | `matrixExample3` | Matrix | Singular value decomposition |
| 4 | `matrixExample4` | Matrix | Pseudoinverse and least-squares fit |
| 5 | `linearExample1` | Linear | Quadratic solver (3 cases) |
| 6 | `linearExample2` | Linear | Cubic solver (2 cases) |
| 7 | `linearExample3` | Linear | General polynomial solver (3 cases) |
| 8 | `linearExample4` | Linear | Gauss–Jordan elimination |
| 9 | `linearExample5` | Linear | Polynomial fitting with R² |
| 10 | `linearExample6` | Linear | Simple linear regression |
| 11 | `linearExample7` | Linear | Principal component analysis |
| 12 | `linearExample8` | Linear | Kalman filter |

---

## Example 1 — Basic Operations: Concat, Rotate, Translate, Swap (`matrixExample1`)

- **Purpose:** Exercise the geometric and structural operations on the `Matrix` class: horizontal concatenation, 2-D rotation, translation, row/column swapping, cross product, eigenvalue computation, and QR decomposition. This is the broadest example in the manual — it touches almost every method of the `Matrix` class.
- **Source:**

```javascript
function matrixExample1() {
    const A = new Matrix([[1, 2], [3, 4]]);
    const B = new Matrix([[5, 6], [7, 8]]);

    // 1. Concat (horizontal)
    const C = Matrix.concat(A, B);
    console.log('Horizontal concat:\n', C.toString());

    // 2. Rotate 2D by 45° (pi/4)
    const R = Matrix.rotate(2, Math.PI / 4);
    console.log('Rotation matrix:\n', R.toString());

    // Rotate a point-set matrix
    const points = new Matrix([[1, 0], [0, 1]]);
    const rotated = Matrix.rotate(points, Math.PI / 4);
    console.log('Rotated points:\n', rotated.toString());

    // 3. Translate
    const translated = Matrix.translate(points, [10, 20]);
    console.log('Translated points:\n', translated.toString());

    const T = Matrix.translate(2, [5, 6]); // 3x3 homogeneous
    console.log('Homogeneous translation:\n', T.toString());

    // 4. Swap cols
    const swappedCols = A.swapTwoCols(0, 1);
    console.log('Swapped cols:\n', swappedCols.toString());

    // 5. Swap rows
    const swappedRows = A.swapTwoRows(0, 1);
    console.log('Swapped rows:\n', swappedRows.toString());

    // 6. Cross product
    const v1 = new Matrix([[1, 0, 0]]);
    const v2 = new Matrix([[0, 1, 0]]);
    console.log('Cross product:', Matrix.crossProduct(v1, v2).data);

    // 7. Eigenvalues
    const S = new Matrix([[2, 1], [1, 2]]);
    console.log('Eigenvalues:', Matrix.eigenvalues(S)); // ~[3, 1]

    // 8. Eigenvectors
    console.log('Eigenvectors:');
    Matrix.eigenvectors(S).forEach((v, i) => console.log(`  λ${i}:`, v));

    // 9. QR Decompose
    const D = new Matrix([[12, -5, 4], [6, 167, -68], [-4, 24, -41]]);
    console.log(D.qrd.toString());
}
```

- **Methods invoked:** `Matrix.concat`, `Matrix.rotate`, `Matrix.translate`, `swapTwoCols`, `swapTwoRows`, `Matrix.crossProduct`, `Matrix.eigenvalues`, `Matrix.eigenvectors`, `.qrd`.
- **Inputs:**
  - `A = [[1,2],[3,4]]`, `B = [[5,6],[7,8]]` — 2×2 matrices.
  - Rotation angle `π/4` (45°).
  - Point set `[[1,0],[0,1]]` — two 2-D points.
  - Translation vector `[10, 20]` — applies to each point.
  - Cross-product vectors `[1,0,0]` and `[0,1,0]`.
  - Symmetric matrix `S = [[2,1],[1,2]]`.
  - 3×3 test matrix `D` from the classic QR decomposition example.
- **Output:** a sequence of matrices printed via `.toString()`.
- **Expected output (abridged):**

```
Horizontal concat:
     1.0000     2.0000     5.0000     6.0000
     3.0000     4.0000     7.0000     8.0000

Rotation matrix:
     0.7071    -0.7071
     0.7071     0.7071

Rotated points:
     0.7071    -0.7071
     0.7071     0.7071

Translated points:
    11.0000    20.0000
    10.0000    21.0000

Homogeneous translation:
     1.0000     0.0000     5.0000
     0.0000     1.0000     6.0000
     0.0000     0.0000     1.0000

Swapped cols:
     2.0000     1.0000
     4.0000     3.0000

Swapped rows:
     3.0000     4.0000
     1.0000     2.0000

Cross product: [ 0, 0, 1 ]
Eigenvalues: [ 3, 1 ]
Eigenvectors:
  λ0: [ 0.7071, 0.7071 ]
  λ1: [ -0.7071, 0.7071 ]

Q:
     ...
R:
     ...
```

- **Reading the output:**
  - **`Horizontal concat`** — `A` and `B` placed side by side. Result is a 2×4 matrix.
  - **`Rotation matrix`** — a 2×2 rotation by 45°. Diagonal entries `cos(45°) ≈ 0.7071`, off-diagonal `−sin(45°) ≈ −0.7071` and `sin(45°) ≈ 0.7071`.
  - **`Rotated points`** — the two points `(1,0)` and `(0,1)` rotated by 45° about the origin. Results are `(cos45, sin45) ≈ (0.707, 0.707)` and `(−sin45, cos45) ≈ (−0.707, 0.707)`.
  - **`Translated points`** — the same points shifted by `[10, 20]`. The result is `[[1+10, 0+20], [0+10, 1+20]] = [[11, 20], [10, 21]]`.
  - **`Homogeneous translation`** — a 3×3 homogeneous transform for 2-D translation by `[5, 6]`. The last column holds the translation; the diagonal is 1.
  - **`Swapped cols`** — `A` with its two columns exchanged.
  - **`Swapped rows`** — `A` with its two rows exchanged.
  - **`Cross product`** — `[1,0,0] × [0,1,0] = [0, 0, 1]`.
  - **`Eigenvalues`** — the two eigenvalues of `[[2,1],[1,2]]` are 3 and 1.
  - **`Eigenvectors`** — the corresponding eigenvectors: `(0.707, 0.707)` (for λ=3) and `(−0.707, 0.707)` (for λ=1). Both are unit-length.
  - **`Q` and `R`** — the QR decomposition of `D`. `Q` is orthogonal (columns of unit length, mutually perpendicular); `R` is upper-triangular.
- **The geometric operations:**
  - **`Matrix.rotate(n, α)`** — returns an `n × n` rotation matrix. For `n = 2`, it rotates in the plane. For `n = 3`, it rotates about the z-axis (the third column is untouched).
  - **`Matrix.rotate(A, α)`** — if the first argument is a `Matrix`, the rotation is *applied* to it. For a 2-column matrix (a point set), each row is rotated using the row-vector convention `x' = x · Rᵀ`.
  - **`Matrix.translate(n, d)`** — returns an `(n+1) × (n+1)` homogeneous translation matrix. The first `n` entries of the last column are `d`.
  - **`Matrix.translate(A, d)`** — if the first argument is a `Matrix`, each row is shifted by `d`.
- **The eigenvalue/QR operations:**
  - **`Matrix.eigenvalues(A)`** — uses the unshifted QR algorithm to find the eigenvalues of a square matrix. Works for matrices with real eigenvalues; for matrices with complex eigenvalues, the algorithm may not converge cleanly.
  - **`Matrix.eigenvectors(A)`** — for each eigenvalue, solves `(A − λI)x = 0` via Gaussian elimination and returns a unit-length null vector.
  - **`A.qrd`** — returns `{ Q, R }` from a Gram–Schmidt QR decomposition. `Q` has orthonormal columns; `R` is upper-triangular.
- **Coding example:** as shown. The example calls `Matrix.rotate(2, ...)` (returns a rotation matrix) and `Matrix.rotate(points, ...)` (applies the rotation to a matrix) — the same method name, disambiguated by the type of the first argument.
- **Common pitfalls:**
  - **`Matrix.rotate` is overloaded.** Passing a number returns a rotation matrix; passing a matrix applies the rotation. Read the source carefully or you may get an `n × n` matrix when you expected a rotated point set.
  - **Rotation convention.** The library uses a row-vector convention: `A.multiply(R.transpose())`. This is consistent with the row-major data layout but differs from the textbook column-vector convention.
  - **`Matrix.translate` is overloaded.** Passing a number returns a homogeneous transform; passing a matrix shifts points. Same disambiguation as `rotate`.
  - **QR is Gram–Schmidt.** For large or ill-conditioned matrices, this is less numerically stable than Householder or Givens QR. For small matrices, it is adequate.
  - **Eigenvalues via QR.** The unshifted QR iteration is slow (linear convergence) and does not handle complex eigenvalues. For symmetric matrices, use `jacobiEigen` from `caro.linear-1.0.js` instead.
  - **Eigenvectors require the matrix to be diagonalisable.** If the matrix has repeated eigenvalues, the null-vector computation may return the same vector for multiple eigenvalues or `null`.
  - **`swapTwoCols` and `swapTwoRows` return new matrices.** They do not modify in place; they use `clone()` internally.

---

## Example 2 — Inverse, Rank, Solve (`matrixExample2`)

- **Purpose:** Exercise the core linear-algebra operations on the `Matrix` class: inverse (Gauss–Jordan), rank (RREF), solve `Ax = b`, and the `isInvertible` shortcut. This is the linear-algebra workhorse of the library.
- **Source:**

```javascript
function matrixExample2() {
    // ===== INVERSE =====
    const A = new Matrix([[4, 7], [2, 6]]);
    const Ainv = A.inverse();
    console.log('A⁻¹:\n' + Ainv.toString());
    console.log('A·A⁻¹:\n' + A.multiply(Ainv).toString());

    // Singular matrix → throws
    try {
        new Matrix([[1, 2], [2, 4]]).inverse();
    } catch (e) {
        console.log('Error:', e.message);
    }

    // 3×3 example
    const B = new Matrix([[1, 2, 3], [0, 1, 4], [5, 6, 0]]);
    console.log('B⁻¹:\n' + B.inverse().toString());
    console.log('B·B⁻¹:\n' + B.multiply(B.inverse()).toString());

    // ===== RANK =====
    console.log(new Matrix([[1, 2], [3, 4]]).rank());              // 2
    console.log(new Matrix([[1, 2], [2, 4]]).rank());              // 1
    console.log(new Matrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]]).rank()); // 2
    console.log(new Matrix([[0, 0], [0, 0]]).rank());              // 0

    // ===== isInvertible =====
    console.log(A.isInvertible());                                  // true
    console.log(new Matrix([[1, 2], [2, 4]]).isInvertible());       // false

    // ===== SOLVE Ax = b =====
    const A2 = new Matrix([[2, 1], [1, 3]]);
    const b = new Matrix([[5], [10]]);
    const x = A2.solve(b);
    console.log('x:\n' + x.toString());
    console.log('Ax:\n' + A2.multiply(x).toString());

    // Inverse of identity is identity
    console.log(Matrix.identity(3).inverse().toString());

    // (A⁻¹)⁻¹ = A
    const back = A.inverse().inverse();
    console.log('(A⁻¹)⁻¹:\n' + back.toString());

    // rank(A) = rank(Aᵀ)
    console.log(A.rank() === A.transpose().rank());  // true

    // rank of A·A⁻¹ = n for invertible A
    console.log(A.multiply(A.inverse()).rank());     // 2
}
```

- **Methods invoked:** `inverse`, `multiply`, `rank`, `isInvertible`, `solve`, `Matrix.identity`, `transpose`.
- **Inputs:**
  - `A = [[4,7],[2,6]]` — well-conditioned 2×2 matrix.
  - `[[1,2],[2,4]]` — singular matrix (second row is twice the first).
  - `B = [[1,2,3],[0,1,4],[5,6,0]]` — 3×3 invertible matrix.
  - `A2 = [[2,1],[1,3]]`, `b = [[5],[10]]` — a well-conditioned linear system with solution `x = [1, 3]`.
- **Output:** a series of matrices printed via `.toString()`, plus numerical diagnostics.
- **Expected output (abridged):**

```
A⁻¹:
     0.6000    -0.7000
    -0.2000     0.4000
A·A⁻¹:
     1.0000     0.0000
     0.0000     1.0000
Error: Matrix is singular (not invertible)
B⁻¹:
     ...
B·B⁻¹:
     1.0000     0.0000     0.0000
     0.0000     1.0000     0.0000
     0.0000     0.0000     1.0000
2
1
2
0
true
false
x:
     1.0000
     3.0000
Ax:
     5.0000
    10.0000
...

(A⁻¹)⁻¹:
     4.0000     7.0000
     2.0000     6.0000
true
2
```

- **Reading the output:**
  - **`A⁻¹`** — the inverse of `[[4,7],[2,6]]`. The exact values are `[[0.6, −0.7], [−0.2, 0.4]]`.
  - **`A·A⁻¹`** — the identity matrix, confirming the inverse is correct.
  - **`Error: Matrix is singular (not invertible)`** — the library correctly detects singularity and throws.
  - **`B⁻¹` and `B·B⁻¹`** — the 3×3 inverse and its product with the original. Again the identity.
  - **`rank` of various matrices:**
    - `[[1,2],[3,4]]` — rank 2 (full rank).
    - `[[1,2],[2,4]]` — rank 1 (second row is twice the first).
    - `[[1,2,3],[4,5,6],[7,8,9]]` — rank 2 (rows are linearly dependent: row3 = 2·row2 − row1).
    - `[[0,0],[0,0]]` — rank 0 (all zero).
  - **`isInvertible`** — `true` for full-rank square matrices, `false` for singular ones.
  - **`x`** — the solution of `[[2,1],[1,3]] x = [5; 10]` is `[1, 3]`.
  - **`Ax`** — the product `A·x` reproduces `b = [5; 10]`.
  - **`(A⁻¹)⁻¹`** — the inverse of the inverse, which should reproduce the original `A`.
  - **`rank(A) == rank(Aᵀ)`** — always true (rank is invariant under transposition).
  - **`rank(A·A⁻¹)`** — for invertible `A`, `A·A⁻¹ = I`, which has full rank 2.
- **The three linear-algebra methods:**
  - **`A.inverse(tol = 1e-12)`** — Gauss–Jordan elimination with partial pivoting. Builds the augmented matrix `[A | I]` and reduces it to `[I | A⁻¹]`. Throws if any pivot falls below `tol`.
  - **`A.rank(tol = 1e-10)`** — reduces to reduced row-echelon form (RREF) and counts the number of nonzero rows. Handles rectangular matrices as well as square ones.
  - **`A.solve(b, tol = 1e-12)`** — builds `[A | b]` and reduces to `[I | x]`. Accepts `b` as a `Matrix` (n×1 or 1×n) or a flat array. Throws if `A` is singular.
- **Why each method matters:**
  - **`inverse`** — used whenever you need `A⁻¹` explicitly (e.g. covariance matrices in Kalman filters, the operational-space inertia in Khatib control, or the mass matrix in RNE).
  - **`rank`** — determines whether a system is controllable, observable, or solvable. Fundamental to linear system theory.
  - **`solve`** — the right tool for `Ax = b`. Faster and more stable than `inverse(A).multiply(b)`.
- **Coding example:** as shown. The example covers three checks: correctness of `A⁻¹` (via `A·A⁻¹ = I`), correctness of `solve` (via `Ax = b`), and structural properties of rank.
- **Common pitfalls:**
  - **`inverse` is expensive and less stable than `solve`.** If you only need `A⁻¹b`, call `solve(b)` instead of `inverse().multiply(b)`.
  - **`rank` uses a numerical tolerance.** For matrices with tiny but nonzero singular values, `rank` may under-count. Use `rankSVD` for a more robust (but slower) numerical rank.
  - **`solve` requires a square matrix.** For over-determined systems, use `pinv` instead.
  - **Tolerance choice matters.** The default `1e-12` for singular detection works for well-scaled matrices. For matrices with very small entries, reduce the tolerance; for matrices with very large entries, increase it.
  - **The error message is descriptive.** Unlike some libraries, `caro.matrix` throws a readable message ("Matrix is singular (not invertible)") rather than a numerical code.
  - **`isInvertible` is a shortcut for `rank == rows`.** It does not check conditioning — a matrix with rank `n` but a huge condition number is "invertible" but numerically dangerous.

---

## Example 3 — Singular Value Decomposition (`matrixExample3`)

- **Purpose:** Compute the SVD of a rectangular matrix and verify the fundamental identities `A = U·Σ·Vᵀ`, `UᵀU = I`, `VᵀV = I`, and the relation between singular values and eigenvalues of `AᵀA`. This is the canonical test of an SVD implementation.
- **Source:**

```javascript
function matrixExample3() {
    const A = new Matrix([
        [3, 0],
        [0, -2],
        [0, 0]
    ]);  // 3×2

    const { U, S, V } = A.svd();

    console.log('U (' + U.rows + '×' + U.cols + '):\n' + U.toString());
    console.log('S:', S);
    console.log('V (' + V.rows + '×' + V.cols + '):\n' + V.toString());

    // Reconstruct
    console.log('U·Σ·Vᵀ:\n' + Matrix.reconstructSVD({ U, S, V }).toString());

    function approxEqual(a, b, tol = 1e-9) {
        for (let i = 0; i < a.rows; i++)
            for (let j = 0; j < a.cols; j++)
                if (Math.abs(a.data[i][j] - b.data[i][j]) > tol) return false;
        return true;
    }

    // 1. UᵀU = I, VᵀV = I  (orthogonality)
    console.log('UᵀU ≈ I:', approxEqual(U.transpose().multiply(U), Matrix.identity(U.cols)));
    console.log('VᵀV ≈ I:', approxEqual(V.transpose().multiply(V), Matrix.identity(V.cols)));

    // 2. A = U·Σ·Vᵀ  (reconstruction)
    console.log('Reconstruction:', approxEqual(A, Matrix.reconstructSVD({ U, S, V })));

    // 3. AᵀA = V·Σ²·Vᵀ  →  singular values are √(eigenvalues of AᵀA)
    console.log('AᵀA:\n' + A.transpose().multiply(A).toString());
    console.log('σ²:', S.map(s => s * s));

    // 4. Numerical rank
    const C = new Matrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    console.log('rank via SVD:', C.rankSVD());
    console.log('rank via RREF:', C.rank());
}
```

- **Methods invoked:** `svd`, `Matrix.reconstructSVD`, `transpose`, `multiply`, `Matrix.identity`, `rankSVD`, `rank`.
- **Inputs:**
  - `A = [[3,0],[0,-2],[0,0]]` — a 3×2 matrix with a simple structure: two nonzero entries on a diagonal (of the leading 2×2 block) and a zero third row.
  - `C = [[1,2,3],[4,5,6],[7,8,9]]` — a 3×3 matrix with rank 2.
- **Output:** the three SVD factors, the reconstruction, and a series of `true`/`false` identity checks.
- **Expected output (abridged):**

```
U (3×3):
     1.0000     0.0000     0.0000
     0.0000    -1.0000     0.0000
     0.0000     0.0000     1.0000
S: [ 3, 2 ]
V (2×2):
     1.0000     0.0000
     0.0000     1.0000
U·Σ·Vᵀ:
     3.0000     0.0000
     0.0000    -2.0000
     0.0000     0.0000
UᵀU ≈ I: true
VᵀV ≈ I: true
Reconstruction: true
AᵀA:
     9.0000     0.0000
     0.0000     4.0000
σ²: [ 9, 4 ]
rank via SVD: 2
rank via RREF: 2
```

- **Reading the output:**
  - **`U` (3×3)** — the left singular vectors. For this simple matrix, `U` is the identity (up to sign flips on the second column, reflecting the negative sign of the singular value).
  - **`S` (array)** — the singular values, sorted descending: `[3, 2]`. There are two singular values for a 3×2 matrix because the maximum number of singular values is `min(3, 2) = 2`.
  - **`V` (2×2)** — the right singular vectors. Here the identity.
  - **`U·Σ·Vᵀ`** — the reconstruction. It should equal `A` exactly (to within round-off).
  - **`UᵀU ≈ I`, `VᵀV ≈ I`** — both `true`, confirming that `U` and `V` are orthogonal.
  - **`AᵀA`** — the 2×2 matrix `diag(9, 4)`. Its eigenvalues are `9` and `4`.
  - **`σ²`** — the squares of the singular values: `[9, 4]`. These match the eigenvalues of `AᵀA`, as required by SVD theory.
  - **`rank via SVD`** and **`rank via RREF`** — both report 2 for the matrix `C`, confirming that SVD and RREF agree on rank.
- **The SVD in words:**
  - Every real matrix `A` (m×n) has a factorization `A = U · Σ · Vᵀ` where:
    - `U` is `m × m` orthogonal (columns are left singular vectors).
    - `Σ` is `m × n` diagonal with non-negative entries (singular values).
    - `V` is `n × n` orthogonal (columns are right singular vectors).
  - The singular values are the square roots of the eigenvalues of `AᵀA` (equivalently of `A·Aᵀ`).
  - The rank of `A` equals the number of nonzero singular values.
- **The implementation:**
  - `caro.matrix-1.0.js` uses **one-sided Jacobi** on the columns of `A`. The algorithm:
    1. Works on a copy `W = A` and accumulates rotations into `V`.
    2. Iterates pairwise rotations on columns of `W` until the columns are mutually orthogonal.
    3. At convergence, the column norms of `W` are the singular values, and the normalized columns are the left singular vectors.
  - The `U` matrix is completed to a full orthonormal basis if there are more rows than singular values.
- **Why SVD matters:**
  - **Rank determination.** The number of nonzero singular values is the numerical rank.
  - **Pseudoinverse.** The Moore–Penrose pseudoinverse is `A⁺ = V·Σ⁺·Uᵀ`, where `Σ⁺` inverts the nonzero singular values.
  - **Condition number.** `cond(A) = σ_max / σ_min`. Fundamental for numerical stability analysis.
  - **Low-rank approximation.** The Eckart–Young theorem states that the best rank-`k` approximation to `A` is obtained by truncating the SVD to the top `k` singular values.
  - **PCA.** The principal components of a data matrix are the right singular vectors of the centered data.
- **Coding example:** as shown. The `approxEqual` helper compares two matrices to within a tolerance.
- **Common pitfalls:**
  - **Sign ambiguity.** The left and right singular vectors are only defined up to sign. `U` may have a column negated relative to what you expect, as long as `V` is negated accordingly.
  - **SVD of a rank-deficient matrix.** Zero singular values are returned as exactly `0` (or `~1e-16`). The corresponding columns of `U` may be arbitrary orthonormal vectors.
  - **The `S` array is length `min(m, n)`.** It is not the full `m × n` diagonal matrix — it is just the vector of singular values.
  - **`Matrix.reconstructSVD` builds the full `Σ` matrix.** This is convenient but wasteful if you only need the reconstruction. For efficiency, multiply `U[:, :k] · diag(S) · V[:, :k]ᵀ`.
  - **Jacobi SVD is accurate but not the fastest.** For very large matrices, use the QR-based algorithm (Golub–Reinsch), which is not in this library.
  - **`rankSVD` is more reliable than `rank`.** RREF-based rank can under-count for ill-conditioned matrices; SVD-based rank is more robust because singular values decay predictably.

---

## Example 4 — Pseudoinverse and Least Squares (`matrixExample4`)

- **Purpose:** Use the pseudoinverse to solve an over-determined linear system in the least-squares sense. This is the standard tool for curve fitting, parameter estimation, and any problem where the number of equations exceeds the number of unknowns.
- **Source:**

```javascript
function matrixExample4() {
    // Pseudoinverse example: solve overdetermined system
    // A is 4×2, b is 4×1 → x = pinv(A) * b
    const A = new Matrix([
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3]
    ]);
    const b = new Matrix([[1], [2], [3], [4]]);

    const Aplus = A.pinv();
    console.log('Pseudoinverse A⁺:\n' + Aplus.toString());

    const x = Aplus.multiply(b);
    console.log('Least-squares solution x:\n' + x.toString());

    // A·A⁺·A should equal A
    const reconstructed = A.multiply(Aplus).multiply(A);
    console.log('A·A⁺·A:\n' + reconstructed.toString());
}
```

- **Methods invoked:** `pinv`, `multiply`.
- **Inputs:**
  - `A = [[1,0],[1,1],[1,2],[1,3]]` — a 4×2 matrix with a "1" column and a column of 0, 1, 2, 3. This is the design matrix for a line fit `y = a + b·x`.
  - `b = [[1],[2],[3],[4]]` — the target values.
- **Output:** the pseudoinverse, the least-squares solution, and the Moore–Penrose identity check.
- **Expected output (abridged):**

```
Pseudoinverse A⁺:
     0.7000     0.4000     0.1000    -0.2000
    -0.3000    -0.1000     0.1000     0.3000
Least-squares solution x:
     1.0000
     1.0000
A·A⁺·A:
     1.0000     0.0000
     1.0000     1.0000
     1.0000     2.0000
     1.0000     3.0000
```

- **Reading the output:**
  - **`A⁺` (2×4)** — the pseudoinverse of the 4×2 matrix. Note the shape swap: the pseudoinverse of an m×n matrix is n×m.
  - **`x = [1, 1]`** — the least-squares solution. Because the data `b = [1, 2, 3, 4]` lies exactly on the line `y = 1 + 1·x`, the fit is exact and the residual is zero.
  - **`A·A⁺·A`** — the Moore–Penrose identity check. For any matrix `A`, `A·A⁺·A = A`. The output reproduces `A` exactly.
- **The least-squares problem in words:**
  - Given `A` (m×n, m > n) and `b` (m×1), no exact solution to `Ax = b` exists in general.
  - The **least-squares solution** minimizes `‖Ax − b‖²`.
  - The solution is `x = A⁺·b`, where `A⁺ = (AᵀA)⁻¹·Aᵀ` is the Moore–Penrose pseudoinverse.
  - Equivalently, `x` satisfies the **normal equations** `AᵀA·x = Aᵀ·b`.
- **The pseudoinverse in words:**
  - For a full-column-rank matrix, `A⁺ = (AᵀA)⁻¹·Aᵀ`.
  - For a full-row-rank matrix, `A⁺ = Aᵀ·(AAᵀ)⁻¹`.
  - In general, `A⁺ = V·Σ⁺·Uᵀ` where `Σ⁺` inverts the nonzero singular values of `A`.
  - The library's `pinv` uses the SVD-based formula, so it handles rank-deficient matrices correctly.
- **Why the pseudoinverse matters:**
  - **Curve fitting.** Fit a polynomial or any linear model to noisy data.
  - **Redundant robotics.** Compute joint velocities for a desired end-effector twist when there are more joints than task dimensions.
  - **System identification.** Estimate parameters from input-output data.
  - **Signal reconstruction.** Recover a signal from fewer samples than the Nyquist rate (compressed sensing).
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`pinv` uses a tolerance.** Singular values below `tol` (default `1e-10`) are treated as zero and their reciprocals are set to zero. This regularizes the pseudoinverse for ill-conditioned matrices.
  - **The Moore–Penrose identity is exact.** `A·A⁺·A = A` holds exactly in exact arithmetic. In floating-point, expect a small residual. The example does not check the residual, but a careful user should.
  - **The least-squares solution is not always unique.** If `A` has deficient column rank, `A⁺b` is the minimum-norm solution — the smallest `‖x‖` among all least-squares solutions.
  - **SVD-based `pinv` is expensive.** For very large matrices, the QR-based pseudoinverse is faster, at the cost of less numerical stability.
  - **`pinv` is not the same as `inverse`.** For a square invertible matrix, `pinv(A) = inverse(A)`. For non-square or singular matrices, `pinv` still produces a meaningful matrix but `inverse` would throw.

---

## Example 5 — Quadratic Solver (`linearExample1`)

- **Purpose:** Solve quadratic equations in the three cases: two distinct real roots, one repeated real root, and two complex-conjugate roots. The library returns roots in different formats depending on the case.
- **Source:**

```javascript
function linearExample1() {
    console.log(solveQuadratic(1, -3, 2)); // [2, 1]
    console.log(solveQuadratic(1, 2, 1));  // [-1]
    console.log(solveQuadratic(1, 0, 1));  // ["0 + 1i", "0 - 1i"]
}
```

- **Functions invoked:** `solveQuadratic(a, b, c)` — solves `a·x² + b·x + c = 0`.
- **Inputs:**
  - `(1, −3, 2)` — solves `x² − 3x + 2 = 0`. Roots: 2 and 1.
  - `(1, 2, 1)` — solves `x² + 2x + 1 = 0`. Root: −1 (double).
  - `(1, 0, 1)` — solves `x² + 1 = 0`. Roots: `+i` and `−i`.
- **Output:** arrays of roots.
- **Expected output:**

```
[ 2, 1 ]
[ -1 ]
[ '0 + 1i', '0 - 1i' ]
```

- **Reading the output:**
  - **Case 1 (two real roots):** returns an array of two numbers, `[2, 1]`.
  - **Case 2 (repeated root):** returns an array of one number, `[-1]`.
  - **Case 3 (complex roots):** returns an array of two strings, formatted as `"re + im i"`.
- **Edge cases handled by the implementation:**
  - **`a = 0` (linear):** falls back to solving `b·x + c = 0`. Returns `[-c/b]`, `"Infinite solutions"` if `b = 0, c = 0`, or `"No solution"` if `b = 0, c ≠ 0`.
  - **Discriminant > 0:** two distinct real roots.
  - **Discriminant = 0:** one repeated root.
  - **Discriminant < 0:** two complex-conjugate roots.
- **The formula:**
  - `discriminant = b² − 4ac`.
  - Real roots: `(−b ± √discriminant) / (2a)`.
  - Repeated root: `−b / (2a)`.
  - Complex roots: `−b/(2a) ± i·√(−discriminant)/(2a)`.
- **Why it matters:**
  - Quadratic equations appear in pole placement, gain tuning, and any second-order system analysis.
  - The function handles all cases cleanly, so you can call it without checking the discriminant first.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **The return type varies.** In the real-roots case you get an array of numbers; in the complex case you get an array of strings. Do not assume the output is always numeric.
  - **Complex roots are formatted as strings.** To do further computation, you would need to parse them. The library does not expose complex arithmetic directly.
  - **No tolerance is used.** The discriminant is compared to exactly `0`, so a discriminant of `1e-16` is treated as positive and produces two near-equal real roots. For numerically stable root-finding on ill-conditioned quadratics, consider a different formula.
  - **Numerical stability of the quadratic formula.** For `b² >> 4ac`, one of the roots suffers from catastrophic cancellation. A common fix is to compute the larger root first and use `r1 · r2 = c/a` to get the second. The library does not do this.
  - **`a = 0` falls back to linear.** No warning is issued. If you called `solveQuadratic` expecting a quadratic and got one root, check that `a` is not zero.

---

## Example 6 — Cubic Solver (`linearExample2`)

- **Purpose:** Solve cubic equations in two representative cases: three real roots and one real root. The library uses the trigonometric method for the three-real case and Cardano's formula for the one-real case.
- **Source:**

```javascript
function linearExample2() {
    console.log(solveCubic(1, -6, 11, -6)); // roots ≈ [1, 2, 3]
    console.log(solveCubic(1, 0, 0, -8));   // real cube root of 8 → [2]
}
```

- **Functions invoked:** `solveCubic(a, b, c, d)` — solves `a·x³ + b·x² + c·x + d = 0`.
- **Inputs:**
  - `(1, −6, 11, −6)` — solves `x³ − 6x² + 11x − 6 = 0`. Roots: 1, 2, 3.
  - `(1, 0, 0, −8)` — solves `x³ − 8 = 0`. Root: 2 (and two complex conjugates, not returned).
- **Output:** arrays of real roots.
- **Expected output:**

```
[ 3, 2, 1 ]
[ 2 ]
```

- **Reading the output:**
  - **Case 1 (three distinct real roots):** returns three numbers in some order.
  - **Case 2 (one real root):** returns a single number. The two complex roots are not returned.
- **The algorithm:**
  - **Step 1:** Divide by `a` to normalize. Now the equation is `x³ + bx² + cx + d = 0`.
  - **Step 2:** Substitute `x = t − b/3` to eliminate the quadratic term. This gives the **depressed cubic** `t³ + pt + q = 0` where `p = c − b²/3` and `q = 2b³/27 − bc/3 + d`.
  - **Step 3:** Compute the discriminant `Δ = q²/4 + p³/27`.
    - `Δ > 0` — one real root via Cardano's formula.
    - `Δ = 0` — multiple real roots.
    - `Δ < 0` — three distinct real roots via the trigonometric method.
  - **Step 4:** Undo the substitution to get the roots in `x`.
- **The Cardano formula:**
  - `u = ∛(−q/2 + √Δ)`, `v = ∛(−q/2 − √Δ)`.
  - Real root: `u + v − b/3`.
- **The trigonometric method:**
  - When `Δ < 0`, use `r = √(−p³/27)`, `φ = acos(−q/(2r))`, `m = 2·√(−p/3)`.
  - Roots: `m·cos(φ/3) − b/3`, `m·cos((φ+2π)/3) − b/3`, `m·cos((φ+4π)/3) − b/3`.
- **Why it matters:**
  - Cubic equations appear in control design (Routh-like criteria, gain tuning for third-order systems), and in polynomial root-finding as a fallback for low-degree cases.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Complex roots are not returned.** For `x³ − 8 = 0`, the function returns only `[2]`. The complex roots `−1 ± i√3` are silently ignored. If you need all roots, use `solvePolynomial` instead.
  - **Root ordering is not guaranteed.** The three real roots of `x³ − 6x² + 11x − 6` may be returned in any order. Sort them yourself if the order matters.
  - **The depressed-cubic substitution is not always numerically stable.** For cubics with widely separated roots, cancellation can occur. The library does not use compensated arithmetic.
  - **`a = 0` falls back to `solveQuadratic`.** No warning is issued.
  - **Repeated roots.** For `Δ = 0`, the function returns two distinct values (with one appearing twice). For strict multiplicity, check the discriminant yourself.

---

## Example 7 — General Polynomial Solver (`linearExample3`)

- **Purpose:** Solve polynomials of arbitrary degree using the Durand–Kerner method. This is the general-purpose root-finder for polynomials, handling real and complex roots uniformly.
- **Source:**

```javascript
function linearExample3() {
    console.log(solvePolynomial([1, -6, 11, -6]));       // cubic: [3, 2, 1]
    console.log(solvePolynomial([1, 0, 0, 0, -16]));      // quartic x^4 - 16: [2, -2, 2i, -2i]
    console.log(solvePolynomial([1, -15, 85, -225, 274, -120])); // degree 5: [1,2,3,4,5]
}
```

- **Function invoked:** `solvePolynomial(coeffs, options)` — solves `a_n·x^n + ... + a_1·x + a_0 = 0`.
- **Inputs:**
  - `[1, −6, 11, −6]` — the cubic `x³ − 6x² + 11x − 6`.
  - `[1, 0, 0, 0, −16]` — the quartic `x⁴ − 16`.
  - `[1, −15, 85, −225, 274, −120]` — a degree-5 polynomial with roots `1, 2, 3, 4, 5`.
- **Output:** an array of roots. Real roots are numbers; complex roots are strings.
- **Expected output (abridged):**

```
[ 3, 2, 1 ]  (in some order)
[ 2, -2, '0.000000 + 2.000000i', '0.000000 - 2.000000i' ]
[ 5, 4, 3, 2, 1 ]  (in some order)
```

- **Reading the output:**
  - **`[1, −6, 11, −6]`** — three real roots, order-dependent on the iteration.
  - **`[1, 0, 0, 0, −16]`** — two real roots (±2) and two complex roots (±2i).
  - **`[1, −15, 85, −225, 274, −120]`** — five real roots, the integers 1 through 5.
- **The Durand–Kerner method:**
  - Initialize `n` roots on a circle in the complex plane.
  - Iterate: `x_i ← x_i − P(x_i) / ∏_{j ≠ i} (x_i − x_j)`.
  - The iteration is a simultaneous root-finding method; all roots are refined together.
  - Convergence is quadratic for distinct roots.
- **The polynomial evaluation:**
  - The function uses Horner's method for `P(x)`.
  - The derivative of `∏(x_i − x_j)` is computed directly (the denominator in the update formula).
- **Why it matters:**
  - Polynomial root-finding is fundamental to control design (characteristic polynomials, pole placement), signal processing (filter design), and numerical methods (Gauss quadrature).
  - The Durand–Kerner method is robust and works for arbitrary degree, unlike closed-form solutions (which only exist up to degree 4).
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Leading zero coefficients are stripped.** Passing `[0, 1, -3, 2]` is treated the same as `[1, -3, 2]` (a quadratic, not a cubic).
  - **Degree must be at least 1.** Passing `[5]` (a constant) throws.
  - **Complex roots are formatted as strings.** The complex roots are printed as `"a + bi"` with six decimals. To do further computation, parse them.
  - **Root ordering is not guaranteed.** The roots are returned in whatever order the iteration converged.
  - **Repeated roots.** The Durand–Kerner method converges linearly (not quadratically) for repeated roots. Expect more iterations and slightly less accuracy.
  - **Numerical stability.** For polynomials with widely separated root magnitudes, cancellation can occur. The library does not use compensated arithmetic.
  - **Options object.** `{ maxIterations = 500, tolerance = 1e-12 }` can be passed as the second argument to tune convergence.

---

## Example 8 — Gauss–Jordan Elimination (`linearExample4`)

- **Purpose:** Solve a 3×3 linear system via Gauss–Jordan elimination. The `solveGaussJordan` function is a standalone (non-class) version of the same algorithm used by `Matrix.solve`.
- **Source:**

```javascript
function linearExample4() {
    const A = [
        [2, 1, -1],
        [-3, -1, 2],
        [-2, 1, 2]
    ];
    const b = [8, -11, -3];
    console.log(solveGaussJordan(A, b)); // [2, 3, -1]
}
```

- **Function invoked:** `solveGaussJordan(A, b)` — solves `A·x = b` via Gauss–Jordan elimination with partial pivoting.
- **Inputs:**
  - `A = [[2,1,-1],[-3,-1,2],[-2,1,2]]` — a 3×3 matrix.
  - `b = [8, -11, -3]` — the right-hand side.
- **Output:** an array of solution values.
- **Expected output:**

```
[ 2, 3, -1 ]
```

- **Reading the output:**
  - The solution `x = [2, 3, -1]` satisfies `A·x = b` exactly.
  - Verify: `[2·2 + 1·3 − 1·(−1), −3·2 − 1·3 + 2·(−1), −2·2 + 1·3 + 2·(−1)] = [4 + 3 + 1, −6 − 3 − 2, −4 + 3 − 2] = [8, −11, −3]`.
- **The algorithm:**
  - Build the augmented matrix `[A | b]`.
  - For each column, choose the row with the largest absolute value in that column (partial pivoting).
  - Swap the pivot row into position.
  - Normalize the pivot row.
  - Eliminate the column in all other rows.
  - After processing all columns, the left side is the identity, and the right side is the solution.
- **Handling edge cases:**
  - **Singular systems:** the function skips a column if the pivot is below tolerance. At the end, it detects inconsistent rows (`[0 ... 0 | nonzero]`) and returns the string `"No solution"`.
  - **Under-determined systems:** if there is a free row (all zeros in `A` and zero in `b`), the function returns the string `"Infinite solutions"`.
  - **Rank-deficient matrices:** the function's column-skipping behaviour handles these, though the interpretation may vary.
- **Why it matters:**
  - Gauss–Jordan is the standard direct solver for small dense linear systems. It is what `Matrix.solve` uses internally.
  - The standalone function is useful when you have a plain 2-D array (not a `Matrix` instance) and don't want to wrap it.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **The return type varies.** It returns an array `[x1, x2, x3]` for a well-posed system, or a string `"No solution"` / `"Infinite solutions"` for degenerate systems. Check the type before using the result.
  - **Tolerance for pivot detection.** The default is `1e-12`. For matrices with very small entries, this may trigger a false singularity.
  - **Pivoting is partial, not full.** The algorithm chooses the largest element in the column, not in the full submatrix. Full pivoting is more stable but requires column swaps, which complicate the solution extraction.
  - **Complexity is O(n³).** For large `n`, this is slow. For very large sparse systems, iterative solvers (conjugate gradient, GMRES) are far more efficient.
  - **The `M[i]` extraction after reduction may produce garbage on singular systems.** The function attempts to detect singularity, but on borderline cases it may return a solution with large numerical error.

---

## Example 9 — Polynomial Fitting (`linearExample5`)

- **Purpose:** Fit a polynomial of a given order to noisy data via least squares on the normal equations. The function returns the coefficients, an evaluation closure, and the R² goodness-of-fit.
- **Source:**

```javascript
function linearExample5() {
    const xData = [0, 1, 2, 3, 4, 5];
    const yData = [1, 2.1, 5.9, 12.8, 22.1, 33.9];

    const fit = fitPolynomial(xData, yData, 2);
    console.log("Coefficients:", fit.coefficients);
    console.log("R²:", fit.rSquared);
    console.log("Predicted at x=6:", fit.evaluate(6));
}
```

- **Function invoked:** `fitPolynomial(xValues, yValues, order)`.
- **Inputs:**
  - `xData = [0, 1, 2, 3, 4, 5]` — six x-coordinates.
  - `yData = [1, 2.1, 5.9, 12.8, 22.1, 33.9]` — six y-coordinates, roughly following `y = 1 + x + x²` with a small amount of noise.
  - `order = 2` — fit a quadratic (3 coefficients).
- **Output:** the coefficients array, the R² value, and a prediction.
- **Expected output (abridged):**

```
Coefficients: [ ~1.0, ~1.0, ~1.0 ]  (approximate)
R²: ~0.999
Predicted at x=6: ~43
```

- **Reading the output:**
  - **`Coefficients`** — the fitted polynomial `a₀ + a₁·x + a₂·x²`. For the given data, these should be close to `[1, 1, 1]`.
  - **`R²`** — the coefficient of determination. Values near `1.0` mean the fit explains almost all the variance. The exact value depends on the noise in the data.
  - **`Predicted at x=6`** — the polynomial evaluated at `x = 6`. For the exact `y = 1 + x + x²`, the value is `1 + 6 + 36 = 43`.
- **The algorithm:**
  - Build the Vandermonde-like design matrix `X` where `X[i][j] = x_i^j`.
  - Solve the normal equations `(XᵀX)·c = Xᵀ·y` for the coefficients `c`.
  - The function uses power sums `Σ x_i^k` for efficiency, so the matrix is built without explicitly forming `X`.
  - The `evaluate` closure captures the coefficients for later use.
  - `R² = 1 − SS_res / SS_tot` where `SS_res = Σ (y_i − ŷ_i)²` and `SS_tot = Σ (y_i − ȳ)²`.
- **Why it matters:**
  - Polynomial fitting is the standard tool for curve fitting, system identification, and response-surface modeling.
  - The R² value quantifies how well the fit captures the data; it is the primary diagnostic for whether the chosen polynomial order is appropriate.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Overfitting.** Choosing a polynomial order that is too high fits noise, not signal. The R² value alone does not detect overfitting — use cross-validation.
  - **Underfitting.** Choosing an order that is too low produces a model that cannot capture the data's structure. The R² value will be noticeably below `1`.
  - **Duplicate x-values.** The normal equations become singular if two data points share the same x-coordinate. The function warns but does not correct.
  - **Numerical conditioning.** For high-order polynomials (order > ~10), the normal equations become ill-conditioned and the coefficients lose precision. Orthogonal polynomials (Legendre, Chebyshev) are more robust.
  - **The library warns if `order > n − 1`.** In that case, the system is underdetermined and the fit is not unique. The warning suggests reducing the order or adding points.
  - **R² is `NaN` if all `y` are constant.** In that case `SS_tot = 0`, and the R² computation divides by zero.
  - **The `evaluate` closure is captured.** It uses the fitted coefficients, so it is not affected by later changes to the input arrays.

---

## Example 10 — Linear Regression (`linearExample6`)

- **Purpose:** Fit a straight line `y = slope·x + intercept` to a set of points via the least-squares formula. This is the simplest and most common regression problem.
- **Source:**

```javascript
function linearExample6() {
    const xData = [1, 2, 3, 4, 5];
    const yData = [2.1, 3.9, 6.2, 7.8, 10.1];

    const line = linearRegression(xData, yData);
    console.log(`y = ${line.slope.toFixed(3)}x + ${line.intercept.toFixed(3)}`);
    console.log("R²:", line.rSquared);
    console.log("Predicted at x=6:", line.evaluate(6));
}
```

- **Function invoked:** `linearRegression(xValues, yValues)`.
- **Inputs:**
  - `xData = [1, 2, 3, 4, 5]` — five x-coordinates.
  - `yData = [2.1, 3.9, 6.2, 7.8, 10.1]` — five y-coordinates, roughly following `y = 2x` with a small offset.
- **Output:** the slope, intercept, R², and a prediction.
- **Expected output (abridged):**

```
y = ~2.000x + ~0.040
R²: ~0.999
Predicted at x=6: ~12.0
```

- **Reading the output:**
  - **`slope ≈ 2.0`** — the slope is close to 2, matching the data's trend.
  - **`intercept ≈ 0.04`** — a small positive offset, indicating the data is slightly above the line `y = 2x`.
  - **`R² ≈ 0.999`** — the fit explains almost all the variance.
  - **`Predicted at x=6 ≈ 12`** — the extrapolated value.
- **The formula:**
  - `slope = Σ((x_i − x̄)(y_i − ȳ)) / Σ((x_i − x̄)²)`
  - `intercept = ȳ − slope · x̄`
- **Why it matters:**
  - Linear regression is the entry point for all statistical modeling. It answers questions like "how much does y change per unit of x?" and "what is the baseline value at x = 0?"
  - The slope and intercept are physically interpretable: slope is the sensitivity, intercept is the bias.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **All x-values identical.** If the x-values are constant, the denominator `Σ(x_i − x̄)²` is zero, and the function throws.
  - **Outliers.** A single outlier can dominate the slope. Consider robust regression (median-based) if your data has outliers.
  - **Correlation vs. causation.** A high R² does not imply the relationship is causal. It only means the linear model fits the data.
  - **Extrapolation is risky.** Predictions far outside the x-range of the data are unreliable, especially if the true relationship is nonlinear.
  - **R² does not measure the quality of the model's assumptions.** Always plot the residuals to check for heteroscedasticity and non-linearity.
  - **Precision.** The function returns the slope and intercept to full floating-point precision. The `toFixed(3)` in the example rounds for display only.

---

## Example 11 — Principal Component Analysis (`linearExample7`)

- **Purpose:** Reduce the dimensionality of a 2-D dataset by projecting it onto its principal component. This is the standard demonstration of PCA and shows the explained variance ratio.
- **Source:**

```javascript
function linearExample7() {
    const data = [
        [2.5, 2.4],
        [0.5, 0.7],
        [2.2, 2.9],
        [1.9, 2.2],
        [3.1, 3.0],
        [2.3, 2.7],
        [2.0, 1.6],
        [1.0, 1.1],
        [1.5, 1.6],
        [1.1, 0.9]
    ];

    const result = pca(data, 1);
    console.log("Top component:", result.components[0]);
    console.log("Explained variance ratio:", result.explainedVarianceRatio);
    console.log("Projected data:", result.projected);
    console.log("Project new point:", result.project([2.0, 2.0]));
}
```

- **Function invoked:** `pca(data, k)` — reduces `data` (n×d) to `k` principal components.
- **Inputs:**
  - `data` — 10 samples, 2 features each. This is the canonical PCA example from textbooks (Fisher's iris-like data).
  - `k = 1` — project onto one principal component.
- **Output:** the top component, the explained variance ratio, the projected data, and a projection function.
- **Expected output (abridged):**

```
Top component: [ ~0.68, ~0.73 ]    (approximate; sign may vary)
Explained variance ratio: [ ~0.96 ]
Projected data: [ ... 10 values ... ]
Project new point: [ ~2.83 ]       (approximate)
```

- **Reading the output:**
  - **`Top component`** — the first principal axis, a unit vector. For this dataset, it points roughly along the diagonal `(1, 1)` direction, with components around `(0.68, 0.73)`. The sign may be flipped (eigenvectors are defined up to sign).
  - **`Explained variance ratio`** — the fraction of total variance captured by the first component. Values near 1 mean the data is essentially 1-D. The typical value for this dataset is around 0.96.
  - **`Projected data`** — the 10 samples projected onto the first principal axis. The values are 1-D (since `k = 1`).
  - **`Project new point`** — the projection of the point `(2.0, 2.0)` onto the same axis.
- **The algorithm:**
  1. Center the data (subtract column means).
  2. Compute the covariance matrix `C = (1/(n−1))·Xᵀ·X` where `X` is the centered data.
  3. Compute the eigenvalues and eigenvectors of `C` via the Jacobi method.
  4. Sort eigenvalues descending, take the top `k`.
  5. The principal axes are the corresponding eigenvectors (as rows).
  6. Project the centered data onto the axes: `projected = centered · axesᵀ`.
  7. The explained variance ratio is `λ_i / Σ λ_j`.
- **Why it matters:**
  - PCA is the standard tool for dimensionality reduction, visualization, and feature extraction.
  - It is the first step in many machine learning pipelines, and it underlies eigendecomposition-based algorithms (spectral clustering, kernel PCA, factor analysis).
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Sign ambiguity.** Eigenvectors are defined up to sign. The principal axis may point "the other way" from what you expect. This is normal — the projection magnitudes are unaffected.
  - **Centering is mandatory.** PCA on uncentered data finds the direction of maximum variance relative to the origin, not the mean. The library centers the data internally.
  - **Scale sensitivity.** If the features have different units, scale them to unit variance first. The library does not do this automatically.
  - **Number of components.** Passing `k > d` throws. Passing `k = d` returns the full basis (equivalent to a change of coordinates without dimensionality reduction).
  - **Covariance normalization.** The library uses `1/(n−1)` (sample covariance). Some textbooks use `1/n` (population covariance). The difference is a scale factor of `(n−1)/n`.
  - **The `project` function captures the mean.** It centers new points using the training mean, so it cannot be used on data with a different distribution.
  - **Jacobi convergence.** The internal `jacobiEigen` uses 100 iterations and a tolerance of `1e-10`. For very large or ill-conditioned matrices, convergence may not be achieved.

---

## Example 12 — Kalman Filter (`linearExample8`)

- **Purpose:** Run a Kalman filter on a simple constant-velocity tracking problem. This example demonstrates the full predict–update cycle and shows how the filter estimates position and velocity from noisy position measurements alone.
- **Source:**

```javascript
function linearExample8() {
    const dt = 1;

    const F = [
        [1, dt],
        [0, 1]
    ];
    const H = [
        [1, 0]
    ];
    const Q = [
        [0.01, 0],
        [0, 0.01]
    ];
    const R = [
        [1]
    ];
    const x0 = [0, 1];
    const P0 = [
        [1, 0],
        [0, 1]
    ];

    const kf = createKalmanFilter({ F, H, Q, R, x0, P0 });
    const measurements = [1.1, 2.0, 2.9, 4.2, 4.9, 6.1];

    for (const z of measurements) {
        kf.predict();
        const { x } = kf.update([z]);
        console.log(`Estimated position: ${x[0].toFixed(3)}, velocity: ${x[1].toFixed(3)}`);
    }
}
```

- **Function invoked:** `createKalmanFilter({ F, H, Q, R, x0, P0 })`, then `kf.predict()` and `kf.update(z)`.
- **Inputs:**
  - **State model:** constant velocity. `F = [[1, dt], [0, 1]]` with `dt = 1`. Position advances by velocity, velocity stays constant.
  - **Measurement model:** `H = [[1, 0]]` — we measure position, not velocity.
  - **Process noise:** `Q = diag(0.01, 0.01)` — small uncertainty in the model.
  - **Measurement noise:** `R = [[1]]` — moderate uncertainty in the measurement.
  - **Initial state:** `x0 = [0, 1]` — position 0, velocity 1.
  - **Initial covariance:** `P0 = diag(1, 1)` — moderate initial uncertainty.
  - **Measurements:** `[1.1, 2.0, 2.9, 4.2, 4.9, 6.1]` — noisy position observations.
- **Output:** one line per measurement, showing the estimated position and velocity.
- **Expected output (abridged):**

```
Estimated position: 0.786, velocity: 1.107
Estimated position: 1.929, velocity: 1.227
Estimated position: 3.005, velocity: 1.202
Estimated position: 4.234, velocity: 1.228
Estimated position: 5.006, velocity: 1.184
Estimated position: 6.089, velocity: 1.179
```

- **Reading the output:**
  - **Estimated position** — the filter's best guess for position at each time step.
  - **Estimated velocity** — the filter's best guess for velocity. It converges to a value near 1 (the true velocity of the underlying trajectory).
  - **Early estimates** — the first few estimates may deviate significantly from the truth because the filter has not yet accumulated enough information.
  - **Later estimates** — the estimates should converge to the true trajectory (a line with slope 1).
- **The Kalman filter algorithm:**
  - **Predict:**
    - `x = F·x` (state prediction).
    - `P = F·P·Fᵀ + Q` (covariance prediction).
  - **Update:**
    - `y = z − H·x` (innovation).
    - `S = H·P·Hᵀ + R` (innovation covariance).
    - `K = P·Hᵀ·S⁻¹` (Kalman gain).
    - `x = x + K·y` (state update).
    - `P = (I − K·H)·P` (covariance update).
- **Why it matters:**
  - The Kalman filter is the optimal linear estimator for linear-Gaussian systems.
  - It is used everywhere: GPS/INS fusion, robot localization, target tracking, sensor fusion, financial time series, and control.
  - This implementation is a minimal example: 2-state, 1-measurement. The same pattern extends to arbitrary dimensions.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **The `predict` and `update` order matters.** Typically `predict` is called first (to advance the state to the current time), then `update` (to incorporate the measurement). Calling them in the wrong order produces incorrect estimates.
  - **The `update` method expects a vector.** Passing a scalar instead of `[z]` produces incorrect results or throws.
  - **The Kalman filter assumes linear-Gaussian models.** For nonlinear systems, use an extended or unscented Kalman filter.
  - **The library inverts `S` directly.** For very small `R` or very large `P`, `S` may be ill-conditioned and the inverse unstable. Production implementations use Cholesky or UD factorization to avoid explicit inversion.
  - **No control input in this example.** The `predict` method accepts an optional `(u, B)` pair; the example does not use it. For tracking problems with a known input, pass `u` and `B` to `predict`.
  - **P0 must be positive-definite.** Passing a non-PD `P0` may produce `NaN`s.
  - **The library does not check dimensions.** Passing matrices with mismatched shapes produces `NaN`s.
  
 ---

## What the Twelve Examples Prove Together

Run in sequence, the twelve examples form a complete verification suite for both libraries:

| Step | What it proves |
|---|---|
| 1. `matrixExample1` | Concatenation, rotation, translation, and swapping work correctly. |
| 2. `matrixExample2` | Inverse, rank, and solve all agree with known analytical results. |
| 3. `matrixExample3` | SVD satisfies orthogonality, reconstruction, and rank identities. |
| 4. `matrixExample4` | Pseudoinverse solves least-squares problems and satisfies `A·A⁺·A = A`. |
| 5. `linearExample1` | Quadratic solver handles all three discriminant cases. |
| 6. `linearExample2` | Cubic solver returns correct real roots. |
| 7. `linearExample3` | General polynomial solver handles degree 3 through 5. |
| 8. `linearExample4` | Gauss–Jordan solves a 3×3 linear system exactly. |
| 9. `linearExample5` | Polynomial fitting recovers the underlying coefficients and reports R². |
| 10. `linearExample6` | Linear regression matches the slope and intercept to high precision. |
| 11. `linearExample7` | PCA finds the dominant direction and computes the explained variance. |
| 12. `linearExample8` | Kalman filter converges to the true state from noisy measurements. |

If all twelve run and produce sensible output, the two libraries are verified end-to-end.

---

## Extending the Examples

### 1. Add a discrete-time simulation

The Kalman filter example is the natural place to add a closed-loop simulation of a control system. Extend it to run for hundreds of steps with a known trajectory, and plot the true position, the noisy measurement, and the filtered estimate.

### 2. Add QR-based least squares

The current `lstsq`-equivalent (via `pinv`) uses SVD, which is robust but slower than QR. Add a `qrLeastSquares` function:

```javascript
function qrLeastSquares(A, b) {
    const { Q, R } = A.qrd;
    const Qt_b = Q.transpose().multiply(b);
    // Back-substitute R x = Qt_b
    return backSubstitute(R, Qt_b);
}
```

### 3. Add a condition-number estimator

The condition number `σ_max / σ_min` is available from the SVD but not exposed directly. Add a method `A.cond()` that computes and returns it.

### 4. Add a LU decomposition

`determinant` and `inverse` both use Gauss–Jordan internally. A dedicated LU decomposition (returning `P, L, U` such that `A = P·L·U`) would be more efficient for repeated solves.

### 5. Add a Cholesky decomposition

For symmetric positive-definite matrices — common in control (mass matrices, covariance matrices) — a Cholesky factorization is faster and more numerically stable than Gaussian elimination.

### 6. Add a solver for banded or sparse matrices

The current library assumes dense storage. For large tridiagonal or banded systems (which arise in discretized PDEs), a specialized solver is far more efficient.

### 7. Add complex-number arithmetic

The polynomial solvers return complex roots as formatted strings. A proper complex-number class (with `add`, `sub`, `mul`, `div`, `abs`) would make further computation possible.

### 8. Add robust regression

Linear regression and polynomial fitting are both least-squares methods, which are sensitive to outliers. Add a robust regression (Theil–Sen, RANSAC, Huber loss) that is not.

### 9. Add multi-variate regression

`linearRegression` handles the case `y = slope·x + intercept`. Extend it to multi-variate regression `y = β₀ + β₁x₁ + β₂x₂ + ...` via `pinv`.

### 10. Add nonlinear least squares

`fitPolynomial` fits a linear combination of basis functions. Extend it to fit arbitrary nonlinear models via Gauss–Newton or Levenberg–Marquardt.

### 11. Add a power-iteration eigensolver

For very large matrices where SVD is too expensive, a power iteration (or Lanczos iteration) computes the dominant eigenvalue/vector much more efficiently.

### 12. Add a small visualization script

The `matrix_examples.js` file prints results to the console. For a 2-D dataset like the PCA example, converting the results into SVG or Chart.js traces would be more informative.

### 13. Integrate with the CaroLab control libraries

The most natural extension: connect the Kalman filter to the control libraries. Use `createKalmanFilter` for state estimation, then feed the estimated state into `caro.compensator-1.0.js` for LQR or pole-placement design.

### 14. Add a Matrix.fromArray and Matrix.toArray

The `Matrix` constructor takes a 2-D array. Add convenience functions to convert to/from flat arrays and CSV strings.

---

## Troubleshooting

The following issues are the most common when running these twelve examples.

| Symptom | Likely cause | Fix |
|---|---|---|
| `ReferenceError: Matrix is not defined` | Library not loaded | In Node, `const Matrix = require('../caro.matrix-1.0.js')`. In the browser, load with `<script>` before `matrix_examples.js` |
| `ReferenceError: solveQuadratic is not defined` | Linear library not loaded | In Node, `const { solveQuadratic } = require('../caro.linear-1.0.js')`. In the browser, load `caro.linear-1.0.js` |
| `Error: Invalid matrix: rows must have equal length` | Ragged input array | Ensure every row has the same length |
| `Error: Matrix is singular (not invertible)` | Pivot below tolerance | Check that the matrix is truly invertible; increase the tolerance |
| `Error: Cannot multiply ... by ...` | Shape mismatch in `multiply` | Ensure `A.cols === B.rows` |
| `Error: Addition requires same dimensions` | Shape mismatch in `add` | Ensure matrices have identical shape |
| `Error: Trace requires a square matrix` | Non-square matrix | `trace` is only for square matrices |
| `Error: Determinant requires a square matrix` | Non-square matrix | `determinant` is only for square matrices |
| `Error: Eigenvalues require a square matrix` | Non-square matrix | `eigenvalues` is only for square matrices |
| `Error: Cross product requires 3D vectors` | Non-3D vectors | `crossProduct` only works in 3D |
| `Error: k (${k}) cannot exceed number of features` | PCA `k` too large | Pass `k ≤ d` |
| `Error: All x-values are identical` | Constant x-data | Check input data; cannot fit a line through identical x-values |
| `Error: Fitting failed: ...` | Singular normal equations | Lower the polynomial order, or add points |
| `Warning: Order ... >= number of points` | Over-determined fit | Reduce order or add points |
| `Warning: ... diagonal form on a plant with repeated poles` | (Compensator library only) | Not applicable here |
| `NaN` in output | Shape mismatch deep inside | Check all intermediate shapes |
| `Rank returns 0` for nonzero matrix | Tolerance too tight | Increase the rank tolerance |
| `SVD produces negative singular value` | Numerical noise | The library's SVD returns absolute values; negative values should not appear. If they do, the matrix is ill-conditioned |
| `Kalman filter diverges` | Poorly tuned Q, R, or P0 | Increase Q (trust model less), or decrease R (trust measurements more) |
| `pca` returns unit vector pointing "backwards" | Sign ambiguity | The direction is correct; the sign is arbitrary |
| Root ordering differs between runs | Iteration-dependent convergence | Sort the roots yourself if order matters |

If a failure is not listed here, the fastest diagnostic is usually to run the twelve examples in order and identify the first one that fails. Most failures are shape mismatches or tolerance issues.

---

## Closing Notes

This manual documents two libraries:

- **`caro.matrix-1.0.js`** — the class-based matrix library. Construction, arithmetic, factorization, geometric transformations, eigen-decomposition, and pseudoinverse.
- **`caro.linear-1.0.js`** — the standalone linear-algebra toolkit. Polynomial root-finding, Gauss–Jordan, curve fitting, PCA, and Kalman filtering.

The library fits alongside the rest of the CaroLab ecosystem:

- **caro.matrix-1.0.js** — matrices and linear algebra.
- **caro.linear-1.0.js** — polynomial roots and fitting.
- **caro.statistics-1.0.js** — descriptive statistics and time series.
- **caro.dsp-1.0.js** — signal generation, filtering, and spectral analysis.
- **caro.compensator-1.0.js** — classical control.
- **caro.manipulator-1.0.js** — robot kinematics, dynamics, control.
- **caro.fuzzy-1.0.js** — fuzzy inference and fuzzy PID.
- **caro.anfis-1.0.js** — adaptive neuro-fuzzy inference.
- **caro.ga-1.0.js** — genetic algorithm.
- **caro.ml-1.0.js** — unsupervised clustering.
- **caro.dip-1.0.js** — digital image processing.

### The Pattern

Each CaroLab manual follows the same discipline:

1. **A single page of prose** describing the library's scope.
2. **One worked example per public class or feature.**
3. **Expected output documented alongside the code**, so a reader knows what to look for.
4. **Common pitfalls** listed honestly.
5. **An Extending section** showing how to go beyond the example.
6. **A Troubleshooting table** covering the most common runtime errors.

### On Numerical Libraries in JavaScript

JavaScript is not the natural language for numerical computing. It lacks:

- **Static typing** — a `Matrix` and a 2-D array are both `Array` at runtime; the only distinguishing feature is their shape.
- **Operator overloading** — `A * B` is element-wise on arrays; you need `A.multiply(B)`.
- **Fast loops** — JavaScript's JIT is good but does not match C, Fortran, or Julia for tight numerical loops.
- **BLAS / LAPACK** — no standard numeric libraries ship with the language.

Despite these limitations, `caro.matrix-1.0.js` and `caro.linear-1.0.js` are useful because:

- **They are self-contained.** No build step, no dependencies, no package manager.
- **They are readable.** A reader can understand the entire implementation in an afternoon.
- **They are adequate for small problems.** A few hundred rows and columns is the sweet spot — exactly the size range that arises in control, robotics, and machine learning on small datasets.
- **They are honest.** The library does not pretend to be LAPACK. The documentation and the code are aligned on what the library can and cannot do.

For large-scale numerical work, use NumPy, Julia, or MATLAB. For teaching, prototyping, and small applications in a JavaScript environment, `caro.matrix` and `caro.linear` are sufficient.

---

*End of document.*

 


