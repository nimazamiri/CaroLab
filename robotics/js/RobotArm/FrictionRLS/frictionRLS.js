class FrictionRLS {
  /**
   * Recursive Least-Squares friction identifier (per joint, 3 params).
   *
   *   θ_j = [τ_c, b, τ_offset]
   *   φ_j = [tanh(α·q̇), q̇, 1]
   *
   * @param {number} nJoints
   * @param {object} opts
   *        lambda  : forgetting factor (default 0.995)
   *        P0      : initial covariance (default 100)
   *        smooth  : tanh slope α (default 10)
   *        reg     : P regularization (default 1e-8)
   *        theta0  : initial guess per joint, [τ_c, b, τ_off]
   *        qdMin   : minimum |q̇| below which update is skipped (default 0)
   */
  constructor(nJoints, opts = {}) {
    this.n      = nJoints;
    this.lambda = opts.lambda  ?? 0.995;
    this.P0     = opts.P0      ?? 100;
    this.smooth = opts.smooth  ?? 10.0;
    this.reg    = opts.reg     ?? 1e-8;
    this.qdMin  = opts.qdMin   ?? 0.0;

    const init = opts.theta0 ?? [0.1, 0.01, 0.0];
    this.theta = Array.from({length: nJoints}, () => init.slice());
    this.P     = Array.from({length: nJoints}, () =>
      this.P0 === 0
        ? [[1e-6,0,0],[0,1e-6,0],[0,0,1e-6]]
        : [[this.P0,0,0],[0,this.P0,0],[0,0,this.P0]]
    );

    this.updates = new Array(nJoints).fill(0);
    this.residLast = new Array(nJoints).fill(0);
    this.residSumSq = new Array(nJoints).fill(0);

    // Persistence-of-excitation diagnostic per joint
    // Accumulated Gramian Φᵀ Φ  (3x3)
    this.gram = Array.from({length: nJoints}, () =>
      [[0,0,0],[0,0,0],[0,0,0]]
    );
  }

  /** One RLS update step for joint `j`. */
  update(j, qd, y) {
    if (Math.abs(qd) < this.qdMin) return 0;

    const sgn = Math.tanh(this.smooth * qd);
    const phi = [sgn, qd, 1.0];
    const theta = this.theta[j];
    const P = this.P[j];

    // Prediction error
    const yHat = phi[0]*theta[0] + phi[1]*theta[1] + phi[2]*theta[2];
    const e = y - yHat;

    // P·φ
    const Pphi = [
      P[0][0]*phi[0] + P[0][1]*phi[1] + P[0][2]*phi[2],
      P[1][0]*phi[0] + P[1][1]*phi[1] + P[1][2]*phi[2],
      P[2][0]*phi[0] + P[2][1]*phi[1] + P[2][2]*phi[2]
    ];
    const denom = this.lambda + phi[0]*Pphi[0] + phi[1]*Pphi[1] + phi[2]*Pphi[2];
    const g = 1.0 / denom;

    // θ ← θ + K·e
    theta[0] += Pphi[0] * g * e;
    theta[1] += Pphi[1] * g * e;
    theta[2] += Pphi[2] * g * e;

    // P ← (P − Pφ φᵀ P / denom) / λ
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 3; k++) {
        P[i][k] = (P[i][k] - Pphi[i] * Pphi[k] * g) / this.lambda;
      }
      P[i][i] += this.reg;
    }

    // Diagnostics
    this.updates[j]++;
    this.residLast[j] = e;
    this.residSumSq[j] += e * e;
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 3; k++)
        this.gram[j][i][k] += phi[i] * phi[k];

    return e;
  }

  /** Current per-joint estimates as { tau_c, b, tau_offset }. */
  estimate() {
    return this.theta.map(t => ({
      tau_c: t[0], b: t[1], tau_offset: t[2]
    }));
  }

  /** RMS residual per joint (indicator of fit quality). */
  rmsResidual() {
    return this.residSumSq.map((s, j) =>
      this.updates[j] > 0 ? Math.sqrt(s / this.updates[j]) : Infinity
    );
  }

  /**
   * Persistence-of-excitation quality per joint.
   * Returns the smallest singular value of the accumulated Gramian.
   *   > 1e-3  →  well excited (all 3 parameters identifiable)
   *   < 1e-4  →  under-excited (typically no low-speed motion → τ_c unknown)
   */
  excitationScore() {
    const out = new Array(this.n);
    for (let j = 0; j < this.n; j++) {
      const G = this.gram[j];
      // Eigenvalues of symmetric 3x3 via Jacobi (small, fast)
      const A = G.map(r => r.slice());
      for (let sweep = 0; sweep < 20; sweep++) {
        let off = 0;
        for (let p = 0; p < 2; p++) for (let q = p+1; q < 3; q++) off += A[p][q]*A[p][q];
        if (off < 1e-15) break;
        for (let p = 0; p < 2; p++) for (let q = p+1; q < 3; q++) {
          if (Math.abs(A[p][q]) < 1e-15) continue;
          const theta = (A[q][q] - A[p][p]) / (2*A[p][q]);
          const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta*theta + 1));
          const c = 1/Math.sqrt(t*t+1), s = c*t;
          // rotate
          for (let k = 0; k < 3; k++) {
            const akp = A[k][p], akq = A[k][q];
            A[k][p] = c*akp - s*akq;
            A[k][q] = s*akp + c*akq;
          }
          for (let k = 0; k < 3; k++) {
            const apk = A[p][k], aqk = A[q][k];
            A[p][k] = c*apk - s*aqk;
            A[q][k] = s*apk + c*aqk;
          }
        }
      }
      const ev = [A[0][0], A[1][1], A[2][2]].sort((a,b)=>a-b);
      out[j] = ev[0];
    }
    return out;
  }
}

if (typeof module !== "undefined") module.exports = FrictionRLS;