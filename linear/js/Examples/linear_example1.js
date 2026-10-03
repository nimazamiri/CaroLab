/* =========================================================
 *  CaroLab - Linear Library Examples
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */

const Matrix = require('../caro.matrix-1.0');

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
Matrix.eigenvectors(S).forEach((v, i) => console.log(`  ?${i}:`, v));

// 9. QR Decompose
const D = new Matrix([[12, -5, 4], [6, 167, -68], [-4, 24, -41]]);
console.log(D.qrd.toString());