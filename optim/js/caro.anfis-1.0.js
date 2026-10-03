/* =========================================================
 *  CaroLab - ANFIS Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */
 
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ANFISLib = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EPS = 1e-9;

  function gauss(x, c, s) { const z = (x - c) / s; return Math.exp(-0.5 * z * z); }

  /** Solve A x = b (A: n x n, b: length n) by Gaussian elimination with partial pivoting. */
  function solveLinear(A, b) {
    const n = b.length;
    const M = A.map((row, i) => row.slice().concat([b[i]]));
    for (let col = 0; col < n; col++) {
      let piv = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      if (Math.abs(M[piv][col]) < 1e-14) { M[piv][col] += 1e-10; } // regularize a (near-)singular pivot
      if (piv !== col) { const t = M[piv]; M[piv] = M[col]; M[col] = t; }
      const pv = M[col][col];
      for (let r = col + 1; r < n; r++) {
        const f = M[r][col] / pv;
        if (f !== 0) for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
      }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
      let s = M[r][n];
      for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c];
      x[r] = s / M[r][r];
    }
    return x;
  }

  /** Least squares solve of A x ≈ b via normal equations (A^T A + ridge I) x = A^T b. */
  function lstsq(A, b, ridge) {
    const m = A.length, n = A[0].length;
    const AtA = Array.from({ length: n }, () => new Array(n).fill(0));
    const Atb = new Array(n).fill(0);
    for (let k = 0; k < m; k++) {
      const row = A[k], bk = b[k];
      for (let i = 0; i < n; i++) {
        if (row[i] === 0) continue;
        Atb[i] += row[i] * bk;
        for (let j = 0; j < n; j++) if (row[j] !== 0) AtA[i][j] += row[i] * row[j];
      }
    }
    for (let i = 0; i < n; i++) AtA[i][i] += ridge;
    return solveLinear(AtA, Atb);
  }

  class ANFIS {
    /**
     * @param {object} o
     *  ranges: [[lo,hi], ...] one per input                              [required]
     *  nMFs:   number of Gaussian membership functions per input (array or scalar) [required]
     *  nOutputs: how many Sugeno (linear) outputs share this rule base (default 1)
     *  outputNames: optional names, e.g. ['Kp','Ki','Kd'] — evaluate() then returns an object
     *  rules: optional array of antecedent index-tuples (one term-index per input) to use
     *         instead of the full grid-partition cartesian product (which is R = Π nMFs[i])
     *  ridge: L2 regularization for the least-squares consequent solve (default 1e-6)
     */
    constructor(o = {}) {
      if (!Array.isArray(o.ranges) || !o.ranges.length) throw new Error('ANFIS: "ranges" (one [lo,hi] per input) is required');
      this.nIn = o.ranges.length;
      this.ranges = o.ranges.map(r => [+r[0], +r[1]]);
      const nMFs = Array.isArray(o.nMFs) ? o.nMFs.slice() : new Array(this.nIn).fill(o.nMFs || 3);
      if (nMFs.length !== this.nIn) throw new Error('ANFIS: "nMFs" length must equal the number of inputs');
      this.nMFs = nMFs;
      this.nOutputs = o.nOutputs || (o.outputNames ? o.outputNames.length : 1);
      this.outputNames = o.outputNames || null;
      this.ridge = o.ridge === undefined ? 1e-6 : o.ridge;

      // premise parameters: mf[i][j] = {c, s}
      this.mf = this.ranges.map((r, i) => {
        const n = nMFs[i], lo = r[0], hi = r[1], h = n > 1 ? (hi - lo) / (n - 1) : (hi - lo);
        return Array.from({ length: n }, (_, j) => ({ c: lo + j * (n > 1 ? h : h / 2), s: Math.max(h / 1.4, 1e-6) }));
      });

      // rule antecedents: array of length-nIn index tuples
      if (o.rules) this.rules = o.rules.map(r => r.slice());
      else {
        this.rules = [[]];
        for (let i = 0; i < this.nIn; i++) {
          const next = [];
          for (const base of this.rules) for (let j = 0; j < nMFs[i]; j++) next.push(base.concat([j]));
          this.rules = next;
        }
      }
      const R = this.rules.length;

      // consequent parameters: p[r][k] = Float64Array(nIn+1)  (linear coeffs + bias)
      this.p = Array.from({ length: R }, () => Array.from({ length: this.nOutputs }, () => new Float64Array(this.nIn + 1)));
    }

    get nRules() { return this.rules.length; }

    /** Full forward pass; returns everything needed for training (mu, w, wbar, z, out). */
    _forward(x) {
      const nIn = this.nIn, R = this.nRules;
      const mu = this.mf.map((terms, i) => terms.map(t => gauss(x[i], t.c, t.s)));
      const w = new Float64Array(R);
      for (let r = 0; r < R; r++) {
        let prod = 1; const ant = this.rules[r];
        for (let i = 0; i < nIn; i++) prod *= mu[i][ant[i]];
        w[r] = prod;
      }
      let S = 0; for (let r = 0; r < R; r++) S += w[r];
      const Ssafe = S > EPS ? S : EPS;
      const wbar = new Float64Array(R);
      for (let r = 0; r < R; r++) wbar[r] = w[r] / Ssafe;
      const z = Array.from({ length: R }, () => new Float64Array(this.nOutputs));
      for (let r = 0; r < R; r++) {
        const pr = this.p[r];
        for (let k = 0; k < this.nOutputs; k++) {
          const pk = pr[k]; let v = pk[nIn];
          for (let i = 0; i < nIn; i++) v += pk[i] * x[i];
          z[r][k] = v;
        }
      }
      const out = new Float64Array(this.nOutputs);
      for (let r = 0; r < R; r++) for (let k = 0; k < this.nOutputs; k++) out[k] += wbar[r] * z[r][k];
      return { mu, w, S: Ssafe, wbar, z, out };
    }

    /** Evaluate the network. Returns a plain array, or {name: value} if outputNames was given. */
    evaluate(x) {
      const { out } = this._forward(x);
      if (this.outputNames) { const o = {}; this.outputNames.forEach((n, k) => o[n] = out[k]); return o; }
      return Array.from(out);
    }

    /* ---------------- hybrid learning (Jang 1993) ---------------- */

    /** One full epoch: LSE for consequents (closed form) then one gradient step on the premise params. */
    _epoch(X, Y, lr) {
      const nIn = this.nIn, R = this.nRules, nOut = this.nOutputs, N = X.length;

      // ---- pass 1: forward with current premise params, cache wbar for the LSE design matrix ----
      const wbarAll = new Array(N);
      for (let n = 0; n < N; n++) wbarAll[n] = this._forward(X[n]).wbar;

      // ---- consequent LSE: shared design matrix A (N x R*(nIn+1)) across all outputs ----
      const cols = R * (nIn + 1);
      const A = new Array(N);
      for (let n = 0; n < N; n++) {
        const row = new Float64Array(cols), wb = wbarAll[n], xn = X[n];
        for (let r = 0; r < R; r++) {
          const base = r * (nIn + 1), wr = wb[r];
          for (let i = 0; i < nIn; i++) row[base + i] = wr * xn[i];
          row[base + nIn] = wr;
        }
        A[n] = row;
      }
      for (let k = 0; k < nOut; k++) {
        const b = new Array(N); for (let n = 0; n < N; n++) b[n] = Y[n][k];
        const sol = lstsq(A, b, this.ridge);
        for (let r = 0; r < R; r++) { const base = r * (nIn + 1); for (let i = 0; i <= nIn; i++) this.p[r][k][i] = sol[base + i]; }
      }

      // ---- premise gradient descent: forward again with the just-updated consequents ----
      const gradC = this.mf.map(terms => new Float64Array(terms.length));
      const gradS = this.mf.map(terms => new Float64Array(terms.length));
      let sse = 0;

      for (let n = 0; n < N; n++) {
        const xn = X[n], yn = Y[n];
        const f = this._forward(xn);
        const err = new Float64Array(nOut);
        for (let k = 0; k < nOut; k++) { err[k] = f.out[k] - yn[k]; sse += err[k] * err[k]; }

        const dEdwbar = new Float64Array(R);
        for (let r = 0; r < R; r++) { let s = 0; for (let k = 0; k < nOut; k++) s += err[k] * f.z[r][k]; dEdwbar[r] = s; }
        let sumTerm = 0; for (let r = 0; r < R; r++) sumTerm += f.wbar[r] * dEdwbar[r];
        const dEdw = new Float64Array(R);
        for (let r = 0; r < R; r++) dEdw[r] = (dEdwbar[r] - sumTerm) / f.S;

        // dE/dmu_{i,j} += dE/dw_r * (w_r / mu_{i,j})  for every rule r using term j on input i
        const dEdmu = this.mf.map(terms => new Float64Array(terms.length));
        for (let r = 0; r < R; r++) {
          const ant = this.rules[r], wr = f.w[r], coef = dEdw[r];
          if (coef === 0) continue;
          for (let i = 0; i < nIn; i++) {
            const j = ant[i], muij = f.mu[i][j];
            const safeMu = muij > EPS ? muij : EPS;
            dEdmu[i][j] += coef * (wr / safeMu);
          }
        }
        for (let i = 0; i < nIn; i++) {
          const terms = this.mf[i], xi = xn[i];
          for (let j = 0; j < terms.length; j++) {
            const d = dEdmu[i][j]; if (d === 0) continue;
            const t = terms[j], m = f.mu[i][j];
            const dc = m * (xi - t.c) / (t.s * t.s);
            const ds = m * (xi - t.c) * (xi - t.c) / (t.s * t.s * t.s);
            gradC[i][j] += d * dc;
            gradS[i][j] += d * ds;
          }
        }
      }

      for (let i = 0; i < nIn; i++) {
        const terms = this.mf[i];
        for (let j = 0; j < terms.length; j++) {
          terms[j].c -= lr * gradC[i][j] / N;
          terms[j].s -= lr * gradS[i][j] / N;
          if (terms[j].s < 1e-6) terms[j].s = 1e-6;
        }
      }
      return Math.sqrt(sse / (N * nOut));
    }

    /**
     * Train on { x:[...], y:[...] } samples. Returns { history: [rmse, ...] }.
     * opts: epochs (default 100), lr (premise learning rate, default 0.01),
     *       lrDecay (multiply lr by this each epoch, default 1), onEpoch(i, rmse) -> true to stop early
     */
    train(data, opts = {}) {
      const epochs = opts.epochs || 100;
      let lr = opts.lr === undefined ? 0.01 : opts.lr;
      const decay = opts.lrDecay === undefined ? 1 : opts.lrDecay;
      const X = data.map(d => d.x), Y = data.map(d => d.y);
      const history = [];
      for (let e = 0; e < epochs; e++) {
        const rmse = this._epoch(X, Y, lr);
        history.push(rmse);
        lr *= decay;
        if (typeof opts.onEpoch === 'function' && opts.onEpoch(e, rmse) === true) break;
      }
      return { history };
    }

    /**
     * Convenience matching the servant-robot paper's Fig. 4 idea: train this ANFIS to
     * reproduce an existing rule-based function fn(x) -> y (array), by sampling a grid
     * (or the caller's own point list) and running train() until the error is small.
     * fn(x): x is an array of nIn numbers, must return an array of nOutputs numbers.
     */
    static trainToMatch(anfis, fn, opts = {}) {
      const samplesPerInput = opts.samplesPerInput || 9;
      let points = opts.points;
      if (!points) {
        points = [[]];
        for (let i = 0; i < anfis.nIn; i++) {
          const [lo, hi] = anfis.ranges[i], next = [];
          for (const base of points) for (let s = 0; s < samplesPerInput; s++) {
            const x = samplesPerInput > 1 ? lo + (hi - lo) * s / (samplesPerInput - 1) : 0.5 * (lo + hi);
            next.push(base.concat([x]));
          }
          points = next;
        }
      }
      const data = points.map(x => ({ x, y: fn(x) }));
      return anfis.train(data, opts);
    }

    /* ---------------- (de)serialisation ---------------- */
    toJSON() {
      return {
        ranges: this.ranges, nMFs: this.nMFs, nOutputs: this.nOutputs, outputNames: this.outputNames,
        rules: this.rules, ridge: this.ridge,
        mf: this.mf.map(terms => terms.map(t => ({ c: t.c, s: t.s }))),
        p: this.p.map(pr => pr.map(pk => Array.from(pk))),
      };
    }
    static fromJSON(j) {
      if (typeof j === 'string') j = JSON.parse(j);
      const net = new ANFIS({ ranges: j.ranges, nMFs: j.nMFs, nOutputs: j.nOutputs, outputNames: j.outputNames, rules: j.rules, ridge: j.ridge });
      net.mf = j.mf.map(terms => terms.map(t => ({ c: t.c, s: t.s })));
      net.p = j.p.map(pr => pr.map(pk => Float64Array.from(pk)));
      return net;
    }
  }

  return { version: '0.1.0', ANFIS, solveLinear, lstsq, gauss };
});
