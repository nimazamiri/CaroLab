/* =========================================================
 *  CaroLab - Linear Library Examples
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */

// --- Matrix Example 1: Basic Operations (concat, rotate, translate, swap) ---
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

// --- Matrix Example 2: Inverse, Rank, Solve ---
function matrixExample2() {
    // ===== INVERSE =====
    const A = new Matrix([[4, 7], [2, 6]]);
    const Ainv = A.inverse();
    console.log('A⁻¹:\n' + Ainv.toString());
    // A·A⁻¹ should be identity
    console.log('A·A⁻¹:\n' + A.multiply(Ainv).toString());

    // Singular matrix → throws
    try {
        new Matrix([[1, 2], [2, 4]]).inverse();
    } catch (e) {
        console.log('Error:', e.message);  // Matrix is singular (not invertible)
    }

    // 3×3 example
    const B = new Matrix([[1, 2, 3], [0, 1, 4], [5, 6, 0]]);
    console.log('B⁻¹:\n' + B.inverse().toString());
    console.log('B·B⁻¹:\n' + B.multiply(B.inverse()).toString());

    // ===== RANK =====
    console.log(new Matrix([[1, 2], [3, 4]]).rank());              // 2
    console.log(new Matrix([[1, 2], [2, 4]]).rank());              // 1  (linearly dependent rows)
    console.log(new Matrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]]).rank()); // 2
    console.log(new Matrix([[0, 0], [0, 0]]).rank());              // 0

    // ===== isInvertible =====
    console.log(A.isInvertible());                                  // true
    console.log(new Matrix([[1, 2], [2, 4]]).isInvertible());       // false

    // ===== SOLVE Ax = b =====
    const A2 = new Matrix([[2, 1], [1, 3]]);
    const b = new Matrix([[5], [10]]);
    const x = A2.solve(b);
    console.log('x:\n' + x.toString());        // x = [1, 3]
    console.log('Ax:\n' + A2.multiply(x).toString());  // should equal b

    // Inverse of identity is identity
    console.log(Matrix.identity(3).inverse().toString());

    // (A⁻¹)⁻¹ = A
    const back = A.inverse().inverse();
    console.log('(A⁻¹)⁻¹:\n' + back.toString());   // should print A

    // rank(A) = rank(Aᵀ)
    console.log(A.rank() === A.transpose().rank());  // true

    // rank of A·A⁻¹ = n for invertible A
    console.log(A.multiply(A.inverse()).rank());     // 2
}

// --- Matrix Example 3: SVD (Singular Value Decomposition) ---
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
    console.log('rank via SVD:', C.rankSVD());       // 2
    console.log('rank via RREF:', C.rank());         // 2
}

// --- Matrix Example 4: Pseudoinverse (bonus, from pinv method) ---
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

// ============================================================================
// LINEAR LIBRARY EXAMPLES (caro.linear-1.0.js)
// ============================================================================

// --- Linear Example 1: Quadratic Solver ---
function linearExample1() {
    console.log(solveQuadratic(1, -3, 2)); // [2, 1]
    console.log(solveQuadratic(1, 2, 1));  // [-1]
    console.log(solveQuadratic(1, 0, 1));  // ["0 + 1i", "0 - 1i"]
}

// --- Linear Example 2: Cubic Solver ---
function linearExample2() {
    console.log(solveCubic(1, -6, 11, -6)); // roots ≈ [1, 2, 3]
    console.log(solveCubic(1, 0, 0, -8));   // real cube root of 8 → [2]
}

// --- Linear Example 3: General Polynomial Solver ---
function linearExample3() {
    console.log(solvePolynomial([1, -6, 11, -6]));       // cubic: [3, 2, 1]
    console.log(solvePolynomial([1, 0, 0, 0, -16]));      // quartic x^4 - 16: [2, -2, 2i, -2i]
    console.log(solvePolynomial([1, -15, 85, -225, 274, -120])); // degree 5: [1,2,3,4,5]
}

// --- Linear Example 4: Gauss-Jordan Elimination ---
function linearExample4() {
    const A = [
        [2, 1, -1],
        [-3, -1, 2],
        [-2, 1, 2]
    ];
    const b = [8, -11, -3];
    console.log(solveGaussJordan(A, b)); // [2, 3, -1]
}

// --- Linear Example 5: Polynomial Fitting ---
function linearExample5() {
    const xData = [0, 1, 2, 3, 4, 5];
    const yData = [1, 2.1, 5.9, 12.8, 22.1, 33.9]; // roughly y ≈ 1 + x + x^2

    const fit = fitPolynomial(xData, yData, 2);
    console.log("Coefficients:", fit.coefficients); // [a0, a1, a2] ≈ [1, ~1, ~1]
    console.log("R²:", fit.rSquared);
    console.log("Predicted at x=6:", fit.evaluate(6));
}

// --- Linear Example 6: Linear Regression ---
function linearExample6() {
    const xData = [1, 2, 3, 4, 5];
    const yData = [2.1, 3.9, 6.2, 7.8, 10.1];

    const line = linearRegression(xData, yData);
    console.log(`y = ${line.slope.toFixed(3)}x + ${line.intercept.toFixed(3)}`);
    console.log("R²:", line.rSquared);
    console.log("Predicted at x=6:", line.evaluate(6));
}

// --- Linear Example 7: PCA (Principal Component Analysis) ---
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

// --- Linear Example 8: Kalman Filter ---
function linearExample8() {
    const dt = 1; // time step

    const F = [
        [1, dt],
        [0, 1]
    ]; // constant-velocity model: position += velocity*dt

    const H = [
        [1, 0]
    ]; // we only measure position, not velocity

    const Q = [
        [0.01, 0],
        [0, 0.01]
    ]; // process noise

    const R = [
        [1]
    ]; // measurement noise

    const x0 = [0, 1]; // initial guess: position 0, velocity 1
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

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

// Uncomment the examples you want to run:

// Matrix examples
const Matrix = require('../caro.matrix-1.0');
matrixExample1();
// matrixExample2();
// matrixExample3();
// matrixExample4();

// Linear examples
// linearExample1();
// linearExample2();
// linearExample3();
// linearExample4();
// linearExample5();
// linearExample6();
// linearExample7();
// linearExample8();