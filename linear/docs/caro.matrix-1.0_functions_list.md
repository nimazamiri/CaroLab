# CaroLab Matrix Library

- **Name:** caro.matrix-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Matrix Algebra](#a-primary-library-for-matrix-algebra)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
   - [Debugging Programs](#debugging-programs)
3. [CaroLab Matrix Library — Functions List](#carolab-matrix-library--functions-list)
4. [Detail Description](#detail-description)
   - [Construction & Access](#construction--access)
   - [Structural Operations](#structural-operations)
   - [Trace & Determinant](#trace--determinant)
   - [Arithmetic Operations](#arithmetic-operations)
   - [Inverse, Rank & Linear Systems](#inverse-rank--linear-systems)
   - [Decompositions](#decompositions)
   - [Geometric Transformations](#geometric-transformations)
   - [Row & Column Operations](#row--column-operations)
   - [Display](#display)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Matrix Algebra

`caro.matrix-1.0.js` is a single-class JavaScript library built around the **`Matrix`** object — a wrapper around a 2D array of numbers with row/column bookkeeping. All linear-algebra operations — arithmetic, decompositions, solving, transformations — operate as methods on a `Matrix` instance (or as static methods taking one or more `Matrix` arguments), and most operations that produce a new matrix return a **new `Matrix`**, so calls can be chained.

The library covers five broad areas:

| Area | Examples |
|---|---|
| Structural / scalar properties | `transpose`, `T`, `trace`, `determinant`, `rank` |
| Arithmetic | `add`, `subtract`, `scale`, `multiply` |
| Solving & inversion | `inverse`, `solve`, `isInvertible` |
| Decompositions | `qrd`, `svd`, `eigenvalues`, `eigenvectors`, `pinv`, `rankSVD`, `reconstructSVD` |
| Geometry & row/column manipulation | `rotate`, `translate`, `crossProduct`, `concat`, `swapTwoRows`, `swapTwoCols` |

The library has no external dependencies and runs unmodified in a browser `<script>` tag or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/caro.matrix-1.0.js"></script>
<script>
  const A = new Matrix([[4, 2], [1, 3]]);
  const det = A.determinant();
  console.log('Determinant:', det);
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const Matrix = require('./caro.matrix-1.0.js');

const A = new Matrix([[4, 2], [1, 3]]);
const det = A.determinant();

console.log('Determinant:', det);
```

Then run it by node.js:

```
node program1.js
```

> **Note on usage:** data is supplied once, to the `Matrix` **constructor** (`new Matrix(data)`), as a 2D array of rows. Methods such as `determinant()` or `transpose()` then take **no data argument** — they operate on the matrix already stored in the instance. Some operations that inherently need a second matrix (e.g. `add`, `multiply`, `solve`) take that second matrix as an explicit argument; a few multi-matrix or dimension-only operations (`concat`, `rotate`, `translate`, `crossProduct`, `eigenvalues`, `eigenvectors`) are exposed as **static** `Matrix.*` methods rather than instance methods, since they don't naturally belong to a single matrix.

### Debugging Programs

- `Matrix` validates its input eagerly: the constructor throws `Invalid matrix: rows must have equal length` if the rows of the supplied 2D array are not all the same length. An empty or omitted `data` argument silently produces a `0×0` matrix rather than throwing.
- Square-only operations check shape first and throw a descriptive `Error` if violated: `Trace requires a square matrix`, `Determinant requires a square matrix`, `Inverse requires a square matrix`, `solve requires a square matrix`, `Eigenvalues require a square matrix`, `Eigenvectors require a square matrix`.
- Dimension-mismatch errors are similarly explicit: `Addition requires same dimensions`, `Subtraction requires same dimensions`, `` Cannot multiply RxC by RxC ``, `Horizontal concat requires same number of rows`, `Vertical concat requires same number of columns`, `Dimension mismatch: A is NxN, b has length L`.
- Numerically singular or ill-conditioned inputs throw rather than silently returning garbage: `Matrix is singular (not invertible)` from `inverse`, `Matrix is singular; system has no unique solution` from `solve`. `determinant` instead returns `0` for a (near-)singular matrix rather than throwing.
- Because most transforms return a new `Matrix`, use `.toString()` at the point of logging to inspect values, e.g. `console.log(A.inverse().toString())`. `.data` is also directly available as a plain 2D array.
- Wrap calls in `try { ... } catch (e) { ... }` when input shape is not guaranteed valid ahead of time (e.g. before `inverse`, `solve`, `determinant`, `trace`, or the `concat`/dimension-sensitive statics).

---

## CaroLab Matrix Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `constructor` / `new Matrix` | Builds a Matrix from a 2D array, validating equal row lengths |
| 2 | `Matrix.identity` | Identity matrix of size `n` |
| 3 | `Matrix.zeros` | Zero-filled matrix of given shape |
| 4 | `clone` | Independent copy of the matrix |
| 5 | `transpose` | Returns Aᵀ as a new Matrix |
| 6 | `T` | Getter alias for `transpose()` |
| 7 | `qrd` | Getter: QR decomposition `{ Q, R }` of the matrix |
| 8 | `trace` | Sum of the diagonal entries |
| 9 | `determinant` | Determinant via LU-style elimination with partial pivoting |
| 10 | `add` | Element-wise matrix addition |
| 11 | `subtract` | Element-wise matrix subtraction |
| 12 | `scale` | Scalar multiplication |
| 13 | `multiply` | Matrix–matrix multiplication |
| 14 | `inverse` | Matrix inverse via Gauss–Jordan elimination |
| 15 | `rank` | Rank via row reduction to RREF |
| 16 | `isInvertible` | Whether the matrix is square and full rank |
| 17 | `solve` | Solves `Ax = b` via Gaussian elimination |
| 18 | `svd` | Singular Value Decomposition via one-sided Jacobi |
| 19 | `Matrix.reconstructSVD` | Rebuilds `A ≈ U·Σ·Vᵀ` from an `svd()` result |
| 20 | `rankSVD` | Numerical rank via singular values |
| 21 | `pinv` | Moore–Penrose pseudoinverse via SVD |
| 22 | `Matrix.concat` | Concatenates two matrices horizontally or vertically |
| 23 | `Matrix.rotate` | 2D/3D rotation matrix, or applies rotation to a point set |
| 24 | `Matrix.translate` | Translation vector/matrix, or applies translation to a point set |
| 25 | `swapTwoCols` | Returns a copy with two columns swapped |
| 26 | `swapTwoRows` | Returns a copy with two rows swapped |
| 27 | `Matrix.crossProduct` | 3D vector cross product |
| 28 | `Matrix.eigenvalues` | Eigenvalues via the QR algorithm |
| 29 | `Matrix.eigenvectors` | Eigenvectors via null-space extraction per eigenvalue |
| 30 | `toString` | Formats the matrix as an aligned, fixed-precision string |

*(Construction and access helpers not listed as standalone statistics — `clone`, and the `data`/`rows`/`cols` instance fields — are described under [Construction & Access](#construction--access).)*

---

## Detail Description

### Construction & Access

- **Function:** `constructor` / `new Matrix(data)`
  **Description:** Creates a new `Matrix` from a 2D array of rows. Validates that every row has the same length; throws `Invalid matrix: rows must have equal length` otherwise. An omitted or empty `data` produces a `0×0` matrix.
  **Syntax:** `const A = new Matrix(data);`
  **Input Arguments:** `data`: 2D array of numbers (rows of equal length)
  **Output Arguments:** `A`: `Matrix` instance, with `A.data` (2D array copy), `A.rows`, `A.cols`
  **Coding Example:**
  ```javascript
  const A = new Matrix([[4, 2], [1, 3]]);
  ```

- **Function:** `Matrix.identity`
  **Description:** Static constructor for the `n×n` identity matrix.
  **Syntax:** `I = Matrix.identity(n);`
  **Input Arguments:** `n`: integer size
  **Output Arguments:** `I`: `Matrix` instance

- **Function:** `Matrix.zeros`
  **Description:** Static constructor for a `rows×cols` matrix filled with zeros.
  **Syntax:** `Z = Matrix.zeros(rows, cols);`
  **Input Arguments:** `rows`, `cols`: integers
  **Output Arguments:** `Z`: `Matrix` instance

- **Function:** `clone`
  **Description:** Returns an independent copy of the matrix (deep-copies the underlying data).
  **Syntax:** `B = A.clone();`
  **Output Arguments:** `B`: `Matrix` instance

---

### Structural Operations

- **Function:** `transpose`
  **Description:** Returns a new matrix with rows and columns swapped (`Aᵀ`).
  **Syntax:** `At = A.transpose();`
  **Output Arguments:** `At`: `Matrix` instance, `cols×rows` shaped

- **Function:** `T`
  **Description:** Convenience getter — property form of `transpose()`.
  **Syntax:** `At = A.T;`
  **Output Arguments:** `At`: `Matrix` instance

- **Function:** `qrd`
  **Description:** Getter that computes and returns the matrix's QR decomposition via Gram–Schmidt (`Matrix._qrDecompose`), such that `A = Q·R`.
  **Syntax:** `const { Q, R } = A.qrd;`
  **Output Arguments:** `{ Q, R }`: `Matrix` instances (`Q` orthonormal-columns, `R` upper triangular), plus a `toString()` that prints both

---

### Trace & Determinant

- **Function:** `trace`
  **Description:** Sum of the diagonal entries. Requires a square matrix.
  **Syntax:** `t = A.trace();`
  **Output Arguments:** `t`: float value
  **Formula:** `tr(A) = Σᵢ Aᵢᵢ`

- **Function:** `determinant`
  **Description:** Determinant computed via LU-style Gaussian elimination with partial pivoting. Requires a square matrix; returns `0` for a (near-)singular matrix rather than throwing.
  **Syntax:** `d = A.determinant();`
  **Output Arguments:** `d`: float value
  **Method:** Row-reduces to upper-triangular form, tracking pivot swaps (each swap flips the sign) and multiplying the pivots; a pivot below `1e-14` short-circuits to `0`.

---

### Arithmetic Operations

- **Function:** `add`
  **Description:** Element-wise addition of two matrices of identical shape.
  **Syntax:** `C = A.add(B);`
  **Input Arguments:** `other`: `Matrix` with the same `rows`/`cols` as `A`
  **Output Arguments:** `C`: `Matrix` instance
  **Formula:** `C[i][j] = A[i][j] + B[i][j]`

- **Function:** `subtract`
  **Description:** Element-wise subtraction of two matrices of identical shape.
  **Syntax:** `C = A.subtract(B);`
  **Input Arguments:** `other`: `Matrix` with the same `rows`/`cols` as `A`
  **Output Arguments:** `C`: `Matrix` instance
  **Formula:** `C[i][j] = A[i][j] - B[i][j]`

- **Function:** `scale`
  **Description:** Multiplies every entry of the matrix by a scalar.
  **Syntax:** `C = A.scale(s);`
  **Input Arguments:** `s`: number
  **Output Arguments:** `C`: `Matrix` instance
  **Formula:** `C[i][j] = s · A[i][j]`

- **Function:** `multiply`
  **Description:** Standard matrix–matrix multiplication. Requires `A.cols === other.rows`.
  **Syntax:** `C = A.multiply(B);`
  **Input Arguments:** `other`: `Matrix` with `rows === A.cols`
  **Output Arguments:** `C`: `Matrix` instance, shaped `A.rows × other.cols`
  **Formula:** `C[i][j] = Σₖ A[i][k]·B[k][j]`

---

### Inverse, Rank & Linear Systems

- **Function:** `inverse`
  **Description:** Matrix inverse via Gauss–Jordan elimination with partial pivoting on the augmented matrix `[A | I]`. Requires a square matrix; throws `Matrix is singular (not invertible)` if a pivot falls below `tol`.
  **Syntax:** `Ainv = A.inverse(tol);`
  **Input Arguments:** `tol`: pivot tolerance (default `1e-12`)
  **Output Arguments:** `Ainv`: `Matrix` instance
  **Method:** Row-reduces `[A | I]` to `[I | A⁻¹]`, swapping in the largest-magnitude pivot at each column and normalizing/eliminating.

- **Function:** `rank`
  **Description:** Numerical rank via row reduction to reduced row-echelon form (RREF), counting pivot columns.
  **Syntax:** `r = A.rank(tol);`
  **Input Arguments:** `tol`: pivot detection tolerance (default `1e-10`)
  **Output Arguments:** `r`: integer

- **Function:** `isInvertible`
  **Description:** Convenience check combining squareness and full rank.
  **Syntax:** `b = A.isInvertible(tol);`
  **Input Arguments:** `tol`: passed through to `rank()` (default `1e-10`)
  **Output Arguments:** `b`: boolean — `true` iff `A` is square and `rank(A) === A.rows`

- **Function:** `solve`
  **Description:** Solves the linear system `Ax = b` for `x`, via Gaussian elimination with partial pivoting on the augmented matrix `[A | b]`. Requires a square matrix. `b` may be a plain array, or a `Matrix` given as either an `n×1` column vector or a `1×n` row vector.
  **Syntax:** `x = A.solve(b, tol);`
  **Input Arguments:** `b`: array of length `n`, or `Matrix` (`n×1` or `1×n`); `tol`: pivot tolerance (default `1e-12`)
  **Output Arguments:** `x`: `Matrix` instance, `n×1` column vector
  **Errors:** `b must be a column vector (n×1) or row vector (1×n)`; `b must be a Matrix or an array`; `Dimension mismatch: A is NxN, b has length L`; `Matrix is singular; system has no unique solution`

---

### Decompositions

- **Function:** `svd`
  **Description:** Singular Value Decomposition `A = U·diag(S)·Vᵀ`, computed via one-sided Jacobi rotations on the columns of a working copy of `A`, accumulating rotations into `V`. Singular values are sorted in descending order; any zero/near-zero singular directions in `U` are completed to a full orthonormal basis.
  **Syntax:** `const { U, S, V } = A.svd(maxSweeps, tol);`
  **Input Arguments:** `maxSweeps`: maximum Jacobi sweep count (default `100`); `tol`: convergence / singular-value tolerance (default `1e-12`)
  **Output Arguments:** `{ U, S, V }` — `U`: `Matrix` (`m×m`, orthogonal); `S`: array of `min(m, n)` singular values, descending; `V`: `Matrix` (`n×n`, orthogonal)
  **Method:** Sweeps over column pairs `(p, q)`, computing a Jacobi rotation angle that zeroes their Gram-matrix cross term `wₚᵀw_q`, applying it to both the working copy and `V`, until total off-diagonal magnitude falls below `tol`. Column norms of the converged working copy are the singular values; normalized columns (completed via Gram–Schmidt where needed) form `U`.

- **Function:** `Matrix.reconstructSVD`
  **Description:** Rebuilds the original matrix (approximately) from an `{ U, S, V }` result: `U·Σ·Vᵀ`.
  **Syntax:** `A_approx = Matrix.reconstructSVD({ U, S, V });`
  **Input Arguments:** `{ U, S, V }`: an `svd()`-shaped result
  **Output Arguments:** `A_approx`: `Matrix` instance

- **Function:** `rankSVD`
  **Description:** Numerical rank computed as the count of singular values above `tol`, using `svd()` internally.
  **Syntax:** `r = A.rankSVD(tol);`
  **Input Arguments:** `tol`: singular-value threshold (default `1e-10`)
  **Output Arguments:** `r`: integer

- **Function:** `pinv`
  **Description:** Moore–Penrose pseudoinverse, computed from `svd()` as `A⁺ = V·Σ⁺·Uᵀ`, inverting only the singular values above `tol`.
  **Syntax:** `Aplus = A.pinv(tol);`
  **Input Arguments:** `tol`: singular-value threshold below which `Σ⁺` entries are left at `0` (default `1e-10`)
  **Output Arguments:** `Aplus`: `Matrix` instance, shaped `n×m` for an `m×n` input

- **Function:** `Matrix.eigenvalues`
  **Description:** Eigenvalues of a square matrix via the (unshifted) QR algorithm: repeatedly decomposes `M = Q·R` and re-forms `M = R·Q` until the sub-diagonal magnitude falls below `tol`, then reads the diagonal.
  **Syntax:** `vals = Matrix.eigenvalues(A, maxIter, tol);`
  **Input Arguments:** `A`: square `Matrix`; `maxIter`: maximum QR iterations (default `1000`); `tol`: sub-diagonal convergence tolerance (default `1e-10`)
  **Output Arguments:** `vals`: array of `n` floats (diagonal of the converged, nearly-upper-triangular matrix)

- **Function:** `Matrix.eigenvectors`
  **Description:** Eigenvectors corresponding to each eigenvalue from `Matrix.eigenvalues`, found by null-space extraction of `A − λI` (`Matrix._nullVector`) for each `λ`. Falls back to a standard basis vector if no null vector is found.
  **Syntax:** `vecs = Matrix.eigenvectors(A, tol, maxIter);`
  **Input Arguments:** `A`: square `Matrix`; `tol`: tolerance passed to eigenvalue/null-space finding (default `1e-10`); `maxIter`: maximum QR iterations (default `1000`)
  **Output Arguments:** `vecs`: array of `n` normalized eigenvector arrays, one per eigenvalue

---

### Geometric Transformations

- **Function:** `Matrix.rotate`
  **Description:** Builds a 2D/3D rotation, or applies it directly to a supplied point set / vector. If `A` is a `Matrix` with `cols === 2` or `cols === 3`, rotates each row (point) by angle `alpha` (row-vector convention, about the z-axis in 3D); if `A` has `rows === 2` or `rows === 3` instead, treats it as column vector(s) and applies `R·A`. If `A` is a plain number, returns the `n×n` rotation matrix itself.
  **Syntax:** `R_or_rotated = Matrix.rotate(A, alpha);`
  **Input Arguments:** `A`: `Matrix` (point set / vector) or integer (dimension); `alpha`: rotation angle in radians
  **Output Arguments:** `R_or_rotated`: `Matrix` instance — either the rotated points/vector, or the bare rotation matrix
  **Errors:** `Rotation only supported for 2D or 3D matrices`

- **Function:** `Matrix.translate`
  **Description:** Translates a point set by a vector `d`, or builds an `(n+1)×(n+1)` homogeneous translation matrix. If `A` is a `Matrix`, adds `d` to every row; if `A` is a plain number (dimension), returns the homogeneous translation matrix instead.
  **Syntax:** `translated_or_T = Matrix.translate(A, d);`
  **Input Arguments:** `A`: `Matrix` (point set) or integer (dimension); `d`: number or array of numbers (translation components)
  **Output Arguments:** `translated_or_T`: `Matrix` instance — either the translated points, or the homogeneous transform
  **Errors:** `Translation vector length must match matrix columns`

- **Function:** `Matrix.crossProduct`
  **Description:** Cross product of two 3D vectors, each given as a `1×3` or `3×1` `Matrix`. Preserves the orientation (row/column) of the inputs in the result.
  **Syntax:** `c = Matrix.crossProduct(A, B);`
  **Input Arguments:** `A`, `B`: `1×3` or `3×1` `Matrix` instances
  **Output Arguments:** `c`: `Matrix` instance, same orientation as `A`
  **Errors:** `Cross product requires 3D vectors`
  **Formula:** `c = (a₁b₂ − a₂b₁,  a₂b₀ − a₀b₂,  a₀b₁ − a₁b₀)`

---

### Row & Column Operations

- **Function:** `Matrix.concat`
  **Description:** Concatenates two matrices horizontally (side by side, matching row counts) or vertically (stacked, matching column counts).
  **Syntax:** `C = Matrix.concat(A, B, axis);`
  **Input Arguments:** `A`, `B`: `Matrix` instances; `axis`: `'horizontal'` (default) or `'vertical'`
  **Output Arguments:** `C`: `Matrix` instance
  **Errors:** `Horizontal concat requires same number of rows`; `Vertical concat requires same number of columns`

- **Function:** `swapTwoCols`
  **Description:** Returns a new matrix with columns `i` and `j` swapped; the original matrix is left unmodified.
  **Syntax:** `B = A.swapTwoCols(i, j);`
  **Input Arguments:** `i`, `j`: integer column indices, `0 ≤ i, j < A.cols`
  **Output Arguments:** `B`: `Matrix` instance
  **Errors:** `Column index out of range`

- **Function:** `swapTwoRows`
  **Description:** Returns a new matrix with rows `i` and `j` swapped; the original matrix is left unmodified.
  **Syntax:** `B = A.swapTwoRows(i, j);`
  **Input Arguments:** `i`, `j`: integer row indices, `0 ≤ i, j < A.rows`
  **Output Arguments:** `B`: `Matrix` instance
  **Errors:** `Row index out of range`

---

### Display

- **Function:** `toString`
  **Description:** Formats the matrix as rows of fixed-precision (4 decimal places), right-aligned (10-character-wide) numbers, newline-separated.
  **Syntax:** `str = A.toString();`
  **Output Arguments:** `str`: string

---

### Internal Helpers

These are implementation details, not part of the public API, but documented here for maintainers extending the library:

| Function | Description |
|---|---|
| `_validateMatrix(data)` | Validates that a 2D array has equal-length rows and returns a deep copy; throws `Invalid matrix: rows must have equal length` otherwise. Used by the constructor. |
| `Matrix._qrDecompose(A)` | Gram–Schmidt QR decomposition producing `{ Q, R }`; used by `qrd` and by `Matrix.eigenvalues` (QR algorithm iteration). |
| `Matrix._completeOrthonormalBasis(U, m, filled, tol)` | Extends the first `filled` columns of an `m×m` matrix `U` to a full orthonormal basis via Gram–Schmidt against the standard basis; used by `svd` to fill columns corresponding to zero singular values. |
| `Matrix._nullVector(M, tol)` | Finds a (normalized) null-space vector of `M` via Gaussian elimination to row-echelon form and back-substitution against a free column; used by `Matrix.eigenvectors` to recover an eigenvector for each eigenvalue from `A − λI`. |

---
