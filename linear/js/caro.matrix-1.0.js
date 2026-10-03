/* =========================================================
 *  CaroLab - Matrix Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */
 
class Matrix {
    constructor(data) {
        // Accept 2D array or create empty matrix
        this.data = data ? this._validateMatrix(data) : [];
        this.rows = this.data.length;
        this.cols = this.rows > 0 ? this.data[0].length : 0;
    }

    // Helper: validate matrix structure
    _validateMatrix(data) {
        if (!Array.isArray(data) || data.length === 0) return [];
        const cols = data[0].length;
        for (let row of data) {
            if (!Array.isArray(row) || row.length !== cols) {
                throw new Error('Invalid matrix: rows must have equal length');
            }
        }
        return data.map(row => [...row]);
    }

    // Helper: clone matrix
    clone() {
        return new Matrix(this.data);
    }

    // Helper: identity matrix
    static identity(n) {
        const data = [];
        for (let i = 0; i < n; i++) {
            data.push(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
        }
        return new Matrix(data);
    }

    // Helper: zeros
    static zeros(rows, cols) {
        return new Matrix(
            Array.from({ length: rows }, () => Array(cols).fill(0))
        );
    }
	
	// ===== TRANSPOSE =====
    // Returns a new matrix with rows and columns swapped (Aᵀ)
    transpose() {
        if (this.rows === 0) return new Matrix([]);
        const result = Array.from({ length: this.cols }, () =>
            Array(this.rows).fill(0)
        );
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                result[j][i] = this.data[i][j];
            }
        }
        return new Matrix(result);
    }

    // ===== Convenience getter (transpose as property) =====
    get T() {
        return this.transpose();
    }
	
	// Public QR decomposition
    get qrd() {
        const { Q, R } = Matrix._qrDecompose(this);
        return {
            Q,
            R,
            toString() {
                return 'Q:\n' + Q.toString() + '\nR:\n' + R.toString();
            }
        };
    }

    // ===== TRACE (sum of diagonal) =====
    trace() {
        if (this.rows !== this.cols) {
            throw new Error('Trace requires a square matrix');
        }
        let sum = 0;
        for (let i = 0; i < this.rows; i++) sum += this.data[i][i];
        return sum;
    }

    // ===== DETERMINANT (LU-based) =====
    determinant() {
        if (this.rows !== this.cols) {
            throw new Error('Determinant requires a square matrix');
        }
        const n = this.rows;
        const A = this.data.map(r => [...r]);
        let det = 1;

        for (let i = 0; i < n; i++) {
            // Partial pivoting
            let pivot = i;
            for (let r = i + 1; r < n; r++) {
                if (Math.abs(A[r][i]) > Math.abs(A[pivot][i])) pivot = r;
            }
            if (Math.abs(A[pivot][i]) < 1e-14) return 0;

            if (pivot !== i) {
                [A[i], A[pivot]] = [A[pivot], A[i]];
                det = -det; // row swap flips sign
            }

            det *= A[i][i];

            for (let r = i + 1; r < n; r++) {
                const factor = A[r][i] / A[i][i];
                for (let c = i; c < n; c++) A[r][c] -= factor * A[i][c];
            }
        }
        return det;
    }

    // ===== ADDITION =====
    add(other) {
        if (this.rows !== other.rows || this.cols !== other.cols) {
            throw new Error('Addition requires same dimensions');
        }
        return new Matrix(this.data.map((row, i) =>
            row.map((v, j) => v + other.data[i][j])
        ));
    }

    // ===== SUBTRACTION =====
    subtract(other) {
        if (this.rows !== other.rows || this.cols !== other.cols) {
            throw new Error('Subtraction requires same dimensions');
        }
        return new Matrix(this.data.map((row, i) =>
            row.map((v, j) => v - other.data[i][j])
        ));
    }

    // ===== SCALAR MULTIPLY =====
    scale(s) {
        return new Matrix(this.data.map(row => row.map(v => v * s)));
    }

    // ===== Matrix multiplication (needed internally) =====
    multiply(other) {
        if (this.cols !== other.rows) {
            throw new Error(`Cannot multiply ${this.rows}x${this.cols} by ${other.rows}x${other.cols}`);
        }
        const result = Array.from({ length: this.rows }, () => Array(other.cols).fill(0));
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < other.cols; j++) {
                let sum = 0;
                for (let k = 0; k < this.cols; k++) {
                    sum += this.data[i][k] * other.data[k][j];
                }
                result[i][j] = sum;
            }
        }
        return new Matrix(result);
    }
	
	
	// ===== INVERSE =====
    // Gauss–Jordan elimination with partial pivoting: [A | I] → [I | A⁻¹]
    inverse(tol = 1e-12) {
        if (this.rows !== this.cols) {
            throw new Error('Inverse requires a square matrix');
        }
        const n = this.rows;
        // Build augmented [A | I]
        const M = this.data.map((row, i) =>
            [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]
        );

        for (let col = 0; col < n; col++) {
            // Partial pivot: find the row with the largest |value| in this column
            let pivot = col;
            for (let r = col + 1; r < n; r++) {
                if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
            }
            if (Math.abs(M[pivot][col]) < tol) {
                throw new Error('Matrix is singular (not invertible)');
            }
            if (pivot !== col) {
                [M[col], M[pivot]] = [M[pivot], M[col]];
            }

            // Normalize pivot row so M[col][col] = 1
            const pv = M[col][col];
            for (let c = 0; c < 2 * n; c++) M[col][c] /= pv;

            // Eliminate this column from all other rows
            for (let r = 0; r < n; r++) {
                if (r === col) continue;
                const factor = M[r][col];
                if (factor === 0) continue;
                for (let c = 0; c < 2 * n; c++) {
                    M[r][c] -= factor * M[col][c];
                }
            }
        }

        // Right half is now A⁻¹
        const inv = M.map(row => row.slice(n));
        return new Matrix(inv);
    }

    // ===== RANK =====
    // Row-reduce to echelon form (RREF) and count nonzero rows / pivots.
    rank(tol = 1e-10) {
        if (this.rows === 0) return 0;
        const A = this.data.map(r => [...r]);
        const rows = this.rows;
        const cols = this.cols;

        let rank = 0;
        let pivotRow = 0;

        for (let col = 0; col < cols && pivotRow < rows; col++) {
            // Find pivot in current column at or below pivotRow
            let pivot = -1;
            for (let r = pivotRow; r < rows; r++) {
                if (Math.abs(A[r][col]) > tol) { pivot = r; break; }
            }
            if (pivot === -1) continue;   // no pivot in this column → skip

            // Swap pivot into position
            [A[pivotRow], A[pivot]] = [A[pivot], A[pivotRow]];

            // Normalize pivot row
            const pv = A[pivotRow][col];
            for (let c = col; c < cols; c++) A[pivotRow][c] /= pv;

            // Eliminate below AND above to get RREF (not strictly needed for rank,
            // but makes the result cleaner and more numerically stable)
            for (let r = 0; r < rows; r++) {
                if (r === pivotRow) continue;
                const factor = A[r][col];
                if (Math.abs(factor) < tol) continue;
                for (let c = col; c < cols; c++) {
                    A[r][c] -= factor * A[pivotRow][c];
                }
            }

            rank++;
            pivotRow++;
        }

        return rank;
    }

    // ===== BONUS: isInvertible (uses rank) =====
    isInvertible(tol = 1e-10) {
        return this.rows === this.cols && this.rank(tol) === this.rows;
    }

    // ===== BONUS: solve linear system Ax = b =====
    // b can be a Matrix (n×1) or a plain array
    solve(b, tol = 1e-12) {
		if (this.rows !== this.cols) {
			throw new Error('solve requires a square matrix');
		}
		const n = this.rows;

		let bArr;
		if (b instanceof Matrix) {
			if (b.cols !== 1 && b.rows !== 1) {
				throw new Error('b must be a column vector (n×1) or row vector (1×n)');
			}
			bArr = b.cols === 1
				? b.data.map(r => r[0])          // n×1 → flat array
				: b.data[0];                     // 1×n → flat array
		} else if (Array.isArray(b)) {
			bArr = [...b];
		} else {
			throw new Error('b must be a Matrix or an array');
		}

		if (bArr.length !== n) {
			throw new Error(`Dimension mismatch: A is ${n}×${n}, b has length ${bArr.length}`);
		}

		// Build augmented [A | b]
		const M = this.data.map((row, i) => [...row, bArr[i]]);

		for (let col = 0; col < n; col++) {
			// Partial pivot
			let pivot = col;
			for (let r = col + 1; r < n; r++) {
				if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
			}
			if (Math.abs(M[pivot][col]) < tol) {
				throw new Error('Matrix is singular; system has no unique solution');
			}
			[M[col], M[pivot]] = [M[pivot], M[col]];

			// Normalize pivot row
			const pv = M[col][col];
			for (let c = col; c <= n; c++) M[col][c] /= pv;

			// Eliminate all other rows
			for (let r = 0; r < n; r++) {
				if (r === col) continue;
				const factor = M[r][col];
				if (factor === 0) continue;
				for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
			}
		}

		return new Matrix(M.map(row => [row[n]]));
	}
	
	// ===== SVD =====
    // Returns { U, S, V } such that A = U · diag(S) · Vᵀ
    //   A : m×n
    //   U : m×m  (orthogonal, columns = left singular vectors)
    //   S : array of min(m,n) singular values, descending
    //   V : n×n  (orthogonal, columns = right singular vectors)
    //
    // Algorithm: one-sided Jacobi on the columns of A.
    //   - Works on a copy W of A and accumulates rotations into V.
    //   - When converged, columns of W are orthogonal; their norms are σᵢ,
    //     and normalized columns are the left singular vectors uᵢ.
    svd(maxSweeps = 100, tol = 1e-12) {
        const m = this.rows;
        const n = this.cols;
        if (m === 0 || n === 0) {
            return { U: Matrix.zeros(m, m), S: [], V: Matrix.identity(n) };
        }

        // W = A (working copy), V = Iₙ (accumulates right rotations)
        const W = this.data.map(r => [...r]);
        const V = Matrix.identity(n).data;

        const eps = tol;

        for (let sweep = 0; sweep < maxSweeps; sweep++) {
            let off = 0;   // total off-diagonal (column Gram) magnitude

            for (let p = 0; p < n - 1; p++) {
                for (let q = p + 1; q < n; q++) {
                    // Compute α = w_pᵀw_p, β = w_qᵀw_q, γ = w_pᵀw_q
                    let alpha = 0, beta = 0, gamma = 0;
                    for (let i = 0; i < m; i++) {
                        const wp = W[i][p];
                        const wq = W[i][q];
                        alpha += wp * wp;
                        beta  += wq * wq;
                        gamma += wp * wq;
                    }

                    // Already orthogonal?
                    if (Math.abs(gamma) < eps * Math.sqrt(alpha * beta) || gamma === 0) {
                        continue;
                    }
                    off += Math.abs(gamma);

                    // Compute Jacobi rotation that zeroes γ
                    const zeta = (beta - alpha) / (2 * gamma);
                    let t;
                    if (zeta >= 0) {
                        t = 1 / (zeta + Math.sqrt(1 + zeta * zeta));
                    } else {
                        t = -1 / (-zeta + Math.sqrt(1 + zeta * zeta));
                    }
                    const c = 1 / Math.sqrt(1 + t * t);
                    const s = c * t;

                    // Apply rotation to columns p, q of W
                    for (let i = 0; i < m; i++) {
                        const wp = W[i][p];
                        const wq = W[i][q];
                        W[i][p] = c * wp - s * wq;
                        W[i][q] = s * wp + c * wq;
                    }
                    // Apply rotation to columns p, q of V
                    for (let i = 0; i < n; i++) {
                        const vp = V[i][p];
                        const vq = V[i][q];
                        V[i][p] = c * vp - s * vq;
                        V[i][q] = s * vp + c * vq;
                    }
                }
            }

            if (off < eps) break;
        }

        // Column norms of W = singular values; normalized columns = U
        const sigma = new Array(n);
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let i = 0; i < m; i++) sum += W[i][j] * W[i][j];
            sigma[j] = Math.sqrt(sum);
        }

        // Sort singular values in descending order (and permute W, V columns)
        const order = sigma
            .map((s, i) => [s, i])
            .sort((a, b) => b[0] - a[0])
            .map(pair => pair[1]);

        const S = order.map(i => sigma[i]);

        // Build m×m U with orthonormal columns: uⱼ = wⱼ / σⱼ
        // For zero singular values, complete to an orthonormal basis.
        const U = Array.from({ length: m }, () => Array(m).fill(0));
        const k = Math.min(m, n);

        for (let j = 0; j < k; j++) {
            const src = order[j];
            const s = sigma[src];
            if (s > tol) {
                for (let i = 0; i < m; i++) U[i][j] = W[i][src] / s;
            }
            // else: leave column zero for now, fill below
        }

        // Fill any remaining columns (σ ≈ 0) with an orthonormal complement
        Matrix._completeOrthonormalBasis(U, m, k, tol);

        // Build n×n V with columns permuted to match S
        const Vsorted = Array.from({ length: n }, () => Array(n).fill(0));
        for (let j = 0; j < n; j++) {
            const src = order[j];
            for (let i = 0; i < n; i++) Vsorted[i][j] = V[i][src];
        }

        return { U: new Matrix(U), S, V: new Matrix(Vsorted) };
    }

    // Complete the first `filled` columns of U (m×m) to a full orthonormal basis
    // using Gram–Schmidt against the standard basis.
    static _completeOrthonormalBasis(U, m, filled, tol) {
        let nextCol = filled;
        for (let e = 0; e < m && nextCol < m; e++) {
            // Candidate = e-th standard basis vector
            const v = Array(m).fill(0);
            v[e] = 1;

            // Subtract projections onto existing columns
            for (let c = 0; c < nextCol; c++) {
                let dot = 0;
                for (let i = 0; i < m; i++) dot += v[i] * U[i][c];
                for (let i = 0; i < m; i++) v[i] -= dot * U[i][c];
            }

            // Normalize
            let norm = 0;
            for (let i = 0; i < m; i++) norm += v[i] * v[i];
            norm = Math.sqrt(norm);
            if (norm > tol) {
                for (let i = 0; i < m; i++) U[i][nextCol] = v[i] / norm;
                nextCol++;
            }
        }
    }

    // ===== Convenience: reconstruct from SVD =====
    // U · diag(S) · Vᵀ  →  should reproduce the original matrix
    static reconstructSVD({ U, S, V }) {
        const m = U.rows;
        const n = V.rows;
        const k = S.length;

        // Σ as m×n
        const Sigma = Matrix.zeros(m, n);
        for (let i = 0; i < k; i++) Sigma.data[i][i] = S[i];

        return U.multiply(Sigma).multiply(V.transpose());
    }

    // ===== Optional: numerical rank via SVD =====
    rankSVD(tol = 1e-10) {
        const { S } = this.svd();
        return S.filter(s => s > tol).length;
    }

    // ===== Optional: pseudoinverse via SVD =====
    // A⁺ = V · Σ⁺ · Uᵀ, where Σ⁺ inverts nonzero singular values
    pinv(tol = 1e-10) {
        const { U, S, V } = this.svd();
        const n = V.rows;
        const m = U.rows;

        // Σ⁺ is n×m
        const SigmaInv = Matrix.zeros(n, m);
        for (let i = 0; i < S.length; i++) {
            if (S[i] > tol) SigmaInv.data[i][i] = 1 / S[i];
        }

        return V.multiply(SigmaInv).multiply(U.transpose());
    }

    // ===== 1. CONCAT =====
    // Concatenates matrices horizontally (side by side) by default,
    // or vertically if axis='vertical'
    static concat(A, B, axis = 'horizontal') {
        if (axis === 'horizontal') {
            if (A.rows !== B.rows) {
                throw new Error('Horizontal concat requires same number of rows');
            }
            const data = A.data.map((row, i) => [...row, ...B.data[i]]);
            return new Matrix(data);
        } else {
            if (A.cols !== B.cols) {
                throw new Error('Vertical concat requires same number of columns');
            }
            const data = [...A.data.map(r => [...r]), ...B.data.map(r => [...r])];
            return new Matrix(data);
        }
    }

    // ===== 2. ROTATE =====
    // Rotation matrix for 2D by angle alpha (radians). If A is given as a point set,
    // it applies the rotation to A. Otherwise returns the rotation matrix.
    // For n-D: rotates in the plane of first two axes.
    static rotate(A, alpha) {
        const cos = Math.cos(alpha);
        const sin = Math.sin(alpha);

        // If A is provided and is a matrix (point set), apply rotation
        if (A instanceof Matrix) {
            if (A.cols === 2) {
                const R = new Matrix([[cos, -sin], [sin, cos]]);
                return A.multiply(R.transpose()); // row-vector convention
            } else if (A.cols === 3) {
                // Rotate about z-axis
                const R = new Matrix([
                    [cos, -sin, 0],
                    [sin,  cos, 0],
                    [0,    0,   1]
                ]);
                return A.multiply(R.transpose());
            } else if (A.rows === 2 || A.rows === 3) {
                // Column-vector convention: R * A
                const n = A.rows;
                const R = Matrix.identity(n);
                R.data[0][0] = cos; R.data[0][1] = -sin;
                R.data[1][0] = sin; R.data[1][1] = cos;
                return R.multiply(A);
            }
            throw new Error('Rotation only supported for 2D or 3D matrices');
        }

        // If A is a number (dimension), return rotation matrix
        const n = A;
        const R = Matrix.identity(n);
        R.data[0][0] = cos;
        R.data[0][1] = -sin;
        R.data[1][0] = sin;
        R.data[1][1] = cos;
        return R;
    }

    // ===== 3. TRANSLATE =====
    // Translation by vector d. If A is a point matrix, translates each point.
    // If A is a number (dimension), returns an (n+1)x(n+1) homogeneous translation matrix.
    static translate(A, d) {
        if (A instanceof Matrix) {
            const dArr = Array.isArray(d) ? d : [d];
            if (A.cols !== dArr.length) {
                throw new Error('Translation vector length must match matrix columns');
            }
            const data = A.data.map(row => row.map((v, j) => v + dArr[j]));
            return new Matrix(data);
        }

        // A is dimension -> return homogeneous translation matrix
        const n = A;
        const dArr = Array.isArray(d) ? d : [d];
        const size = n + 1;
        const T = Matrix.identity(size);
        for (let i = 0; i < n; i++) {
            T.data[i][n] = dArr[i] !== undefined ? dArr[i] : 0;
        }
        return T;
    }

    // ===== 4. SWAP TWO COLUMNS =====
    swapTwoCols(i, j) {
        if (i < 0 || j < 0 || i >= this.cols || j >= this.cols) {
            throw new Error('Column index out of range');
        }
        const result = this.clone();
        for (let r = 0; r < this.rows; r++) {
            const tmp = result.data[r][i];
            result.data[r][i] = result.data[r][j];
            result.data[r][j] = tmp;
        }
        return result;
    }

    // ===== 5. SWAP TWO ROWS =====
    swapTwoRows(i, j) {
        if (i < 0 || j < 0 || i >= this.rows || j >= this.rows) {
            throw new Error('Row index out of range');
        }
        const result = this.clone();
        const tmp = result.data[i];
        result.data[i] = result.data[j];
        result.data[j] = tmp;
        return result;
    }

    // ===== 6. CROSS PRODUCT =====
    // For 3D vectors (1x3 or 3x1 matrices)
    static crossProduct(A, B) {
        const a = A.rows === 1 ? A.data[0] : A.data.map(r => r[0]);
        const b = B.rows === 1 ? B.data[0] : B.data.map(r => r[0]);
        if (a.length !== 3 || b.length !== 3) {
            throw new Error('Cross product requires 3D vectors');
        }
        const result = [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
        // Return same orientation as input
        return A.rows === 1 ? new Matrix([result]) : new Matrix(result.map(v => [v]));
    }

    // ===== Helper: LU / QR for eigenvalues =====
    // ===== 7. EIGENVALUES (QR algorithm for real matrices) =====
    static eigenvalues(A, maxIter = 1000, tol = 1e-10) {
        if (A.rows !== A.cols) {
            throw new Error('Eigenvalues require a square matrix');
        }
        let M = A.clone();

        for (let iter = 0; iter < maxIter; iter++) {
            const { Q, R } = Matrix._qrDecompose(M);
            M = R.multiply(Q);

            // Check if M is (nearly) upper triangular
            let offDiag = 0;
            for (let i = 1; i < M.rows; i++) {
                for (let j = 0; j < i; j++) {
                    offDiag += Math.abs(M.data[i][j]);
                }
            }
            if (offDiag < tol) break;
        }

        // Eigenvalues are the diagonal entries
        return M.data.map((row, i) => row[i]);
    }

    // Gram-Schmidt QR decomposition
    static _qrDecompose(A) {
        const n = A.rows;
        const m = A.cols;
        const Q = Matrix.zeros(n, m);
        const R = Matrix.zeros(m, m);

        const cols = [];
        for (let j = 0; j < m; j++) {
            let v = A.data.map(row => row[j]);
            for (let i = 0; i < j; i++) {
                const q = cols[i];
                const r = q.reduce((s, qv, k) => s + qv * v[k], 0);
                R.data[i][j] = r;
                v = v.map((val, k) => val - r * q[k]);
            }
            const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
            R.data[j][j] = norm;
            const q = norm > 1e-14 ? v.map(x => x / norm) : v.map(() => 0);
            cols.push(q);
            for (let k = 0; k < n; k++) Q.data[k][j] = q[k];
        }
        return { Q, R };
    }

    // ===== 8. EIGENVECTORS =====
    // Find eigenvectors via inverse iteration for each eigenvalue
    static eigenvectors(A, tol = 1e-10, maxIter = 1000) {
        if (A.rows !== A.cols) {
            throw new Error('Eigenvectors require a square matrix');
        }
        const eigenvalues = Matrix.eigenvalues(A, maxIter, tol);
        const n = A.rows;
        const eigenvectors = [];

        for (const lambda of eigenvalues) {
            // Solve (A - lambda*I) x = 0 via inverse iteration / null-space finding
            const M = A.clone();
            for (let i = 0; i < n; i++) M.data[i][i] -= lambda;

            let v = Matrix._nullVector(M);
            if (v === null) {
                // Fallback: standard basis
                v = Array(n).fill(0);
                v[0] = 1;
            }
            eigenvectors.push(v);
        }
        return eigenvectors;
    }

    // Find a null-space vector of M using Gaussian elimination
    static _nullVector(M, tol = 1e-10) {
        const n = M.rows;
        const A = M.data.map(r => [...r]);
        const pivotCols = [];

        // Row echelon
        let row = 0;
        for (let col = 0; col < n && row < n; col++) {
            let pivot = -1;
            for (let r = row; r < n; r++) {
                if (Math.abs(A[r][col]) > tol) { pivot = r; break; }
            }
            if (pivot === -1) continue;
            [A[row], A[pivot]] = [A[pivot], A[row]];
            const pv = A[row][col];
            for (let c = 0; c < n; c++) A[row][c] /= pv;

            for (let r = 0; r < n; r++) {
                if (r !== row && Math.abs(A[r][col]) > tol) {
                    const factor = A[r][col];
                    for (let c = 0; c < n; c++) A[r][c] -= factor * A[row][c];
                }
            }
            pivotCols.push(col);
            row++;
        }

        // Find a free column (not a pivot)
        const pivotSet = new Set(pivotCols);
        let freeCol = -1;
        for (let c = 0; c < n; c++) {
            if (!pivotSet.has(c)) { freeCol = c; break; }
        }
        if (freeCol === -1) return null;

        // Build null vector
        const v = Array(n).fill(0);
        v[freeCol] = 1;
        for (let i = 0; i < pivotCols.length; i++) {
            v[pivotCols[i]] = -A[i][freeCol];
        }

        // Normalize
        const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
        return norm > tol ? v.map(x => x / norm) : null;
    }
	
	
    // Utility: print
    toString() {
        return this.data.map(row => row.map(v => v.toFixed(4).padStart(10)).join(' ')).join('\n');
    }
}

module.exports =  Matrix;

