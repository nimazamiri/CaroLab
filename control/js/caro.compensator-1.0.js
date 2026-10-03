/* =========================================================
 *  CaroLab - Control Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.Compensator = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ======================================================================
   * 1. Small numeric toolkit
   * ==================================================================== */

  const cadd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
  const csub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
  const cmul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
  const cdiv = (a, b) => {
    const d = b.re * b.re + b.im * b.im;
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
  };
  const cabs = (a) => Math.hypot(a.re, a.im);

  const fmt = (x) => {
    if (!isFinite(x)) return String(x);
    const v = parseFloat(x.toPrecision(6));
    return Object.is(v, -0) ? '0' : String(v);
  };

  // ---- polynomials (highest power first) ----
  function ptrim(p, tol) {
    tol = tol || 0;
    let i = 0;
    while (i < p.length - 1 && Math.abs(p[i]) <= tol) i++;
    return p.slice(i);
  }
  function padd(a, b) {
    const n = Math.max(a.length, b.length), r = new Array(n).fill(0);
    for (let i = 0; i < a.length; i++) r[n - a.length + i] += a[i];
    for (let i = 0; i < b.length; i++) r[n - b.length + i] += b[i];
    return r;
  }
  const pscale = (a, k) => a.map((v) => v * k);
  function pmul(a, b) {
    const r = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j];
    return r;
  }
  function pval(p, x) { let r = 0; for (const c of p) r = r * x + c; return r; }
  function pvalC(p, z) {
    let re = 0, im = 0;
    for (const c of p) {
      const nr = re * z.re - im * z.im + c;
      const ni = re * z.im + im * z.re;
      re = nr; im = ni;
    }
    return { re, im };
  }
  function pder(p) {
    const n = p.length - 1;
    if (n < 1) return [0];
    return p.slice(0, n).map((c, i) => c * (n - i));
  }
  function pdivmod(a, b) {
    a = a.slice();
    const nb = b.length;
    if (a.length < nb) return { q: [0], r: a };
    const q = [];
    while (a.length >= nb) {
      const c = a[0] / b[0];
      q.push(c);
      for (let j = 0; j < nb; j++) a[j] -= c * b[j];
      a.shift();
    }
    return { q, r: a.length ? a : [0] };
  }
  function pfromRoots(roots) {
    let p = [{ re: 1, im: 0 }];
    for (const r of roots) {
      const np = new Array(p.length + 1).fill(null).map(() => ({ re: 0, im: 0 }));
      for (let i = 0; i < p.length; i++) {
        np[i] = cadd(np[i], p[i]);
        np[i + 1] = csub(np[i + 1], cmul(p[i], r));
      }
      p = np;
    }
    return p.map((c) => c.re);
  }
  function pstr(p, v) {
    v = v || 's';
    const n = p.length - 1, terms = [];
    p.forEach((c, i) => {
      if (Math.abs(c) < 1e-14) return;
      const e = n - i;
      let t = fmt(Math.abs(c));
      if (e > 0 && Math.abs(Math.abs(c) - 1) < 1e-12) t = '';
      if (e >= 1) t += v + (e > 1 ? '^' + e : '');
      terms.push({ neg: c < 0, t });
    });
    if (!terms.length) return '0';
    return terms.map((x, i) => (i === 0 ? (x.neg ? '-' : '') : (x.neg ? ' - ' : ' + ')) + x.t).join('');
  }

  /** Roots of a real/complex-coefficient-free polynomial (Aberth–Ehrlich). */
  function proots(p, init, sort) {
    if (sort === undefined) sort = true;
    let scale = 0;
    for (const v of p) scale = Math.max(scale, Math.abs(v));
    if (!(scale > 0)) return [];
    let c = ptrim(p, scale * 1e-14);
    const roots = [];
    while (c.length > 1 && Math.abs(c[c.length - 1]) <= scale * 1e-15) { c.pop(); roots.push({ re: 0, im: 0 }); }
    const n = c.length - 1;
    if (n >= 1) {
      const a = c.map((v) => v / c[0]);
      const da = pder(a);
      let z;
      if (init && init.length === n) z = init.map((r) => ({ re: r.re, im: r.im }));
      else {
        const r0 = Math.max(Math.pow(Math.abs(a[n]), 1 / n), 1e-6);
        z = [];
        for (let k = 0; k < n; k++) {
          const ang = (2 * Math.PI * k) / n + 0.5;
          z.push({ re: r0 * Math.cos(ang), im: r0 * Math.sin(ang) });
        }
      }
      for (let it = 0; it < 300; it++) {
        let maxd = 0;
        for (let k = 0; k < n; k++) {
          const zk = z[k];
          const pv = pvalC(a, zk);
          if (pv.re === 0 && pv.im === 0) continue;
          let dv = pvalC(da, zk);
          if (dv.re === 0 && dv.im === 0) dv = { re: 1e-12, im: 0 };
          const w = cdiv(pv, dv);
          let s = { re: 0, im: 0 };
          for (let j = 0; j < n; j++) {
            if (j === k) continue;
            let d = csub(zk, z[j]);
            if (d.re === 0 && d.im === 0) d = { re: 1e-12, im: 0 };
            s = cadd(s, cdiv({ re: 1, im: 0 }, d));
          }
          const ws = cmul(w, s);
          const delta = cdiv(w, { re: 1 - ws.re, im: -ws.im });
          z[k] = csub(zk, delta);
          maxd = Math.max(maxd, cabs(delta) / (1 + cabs(z[k])));
        }
        if (maxd < 1e-14) break;
      }
      for (const r of z) {
        if (Math.abs(r.im) < 1e-8 * (1 + Math.abs(r.re))) r.im = 0;
        roots.push(r);
      }
    }
    if (sort) roots.sort((x, y) => (x.re - y.re) || (x.im - y.im));
    return roots;
  }

  // ---- matrices (arrays of rows) ----
  const mzeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));
  const meye = (n) => { const I = mzeros(n, n); for (let i = 0; i < n; i++) I[i][i] = 1; return I; };
  const mT = (A) => (A.length ? A[0].map((_, j) => A.map((r) => r[j])) : []);
  const madd = (A, B) => A.map((r, i) => r.map((v, j) => v + B[i][j]));
  const mscale = (A, k) => A.map((r) => r.map((v) => v * k));
  function mmul(A, B) {
    const n = A.length, m = B.length, p = B[0].length;
    const R = mzeros(n, p);
    for (let i = 0; i < n; i++) for (let k = 0; k < m; k++) {
      const a = A[i][k];
      if (a === 0) continue;
      for (let j = 0; j < p; j++) R[i][j] += a * B[k][j];
    }
    return R;
  }
  const mvec = (A, x) => A.map((r) => r.reduce((s, v, j) => s + v * x[j], 0));
  const mclone = (A) => A.map((r) => r.slice());
  const isMatrix = (A) => Array.isArray(A) && Array.isArray(A[0]);

  function blockDiag(A, B) {
    const na = A.length, ma = na ? A[0].length : 0, nb = B.length, mb = nb ? B[0].length : 0;
    const R = mzeros(na + nb, ma + mb);
    for (let i = 0; i < na; i++) for (let j = 0; j < ma; j++) R[i][j] = A[i][j];
    for (let i = 0; i < nb; i++) for (let j = 0; j < mb; j++) R[na + i][ma + j] = B[i][j];
    return R;
  }
  const hstack = (A, B) => A.map((r, i) => r.concat(B[i]));

  /** Characteristic polynomial coefficients [1, c_{n-1}, ..., c_0] (Faddeev–LeVerrier). */
  function charpoly(A) {
    const n = A.length;
    if (n === 0) return [1];
    const I = meye(n);
    let M = mzeros(n, n);
    const c = [1];
    for (let k = 1; k <= n; k++) {
      M = madd(mmul(A, M), mscale(I, c[k - 1]));
      const AM = mmul(A, M);
      let tr = 0;
      for (let i = 0; i < n; i++) tr += AM[i][i];
      c.push(-tr / k);
    }
    return c;
  }

  /** Matrix exponential (scaling & squaring + Taylor). */
  function expm(A) {
    const n = A.length;
    let norm = 0;
    for (const r of A) norm = Math.max(norm, r.reduce((s, v) => s + Math.abs(v), 0));
    const s = norm > 0 ? Math.max(0, Math.ceil(Math.log2(norm)) + 1) : 0;
    const As = mscale(A, Math.pow(2, -s));
    let term = meye(n), res = meye(n);
    for (let k = 1; k <= 20; k++) {
      term = mscale(mmul(term, As), 1 / k);
      res = madd(res, term);
    }
    for (let i = 0; i < s; i++) res = mmul(res, res);
    return res;
  }

  /** Numerical rank by Gaussian elimination with full pivoting. */
  function mrank(M) {
    const A = mclone(M), n = A.length, m = n ? A[0].length : 0;
    let maxabs = 0;
    for (const r of A) for (const v of r) maxabs = Math.max(maxabs, Math.abs(v));
    if (maxabs === 0) return 0;
    const tol = 1e-9 * maxabs * Math.max(n, m);
    let rank = 0;
    const usedRows = new Array(n).fill(false);
    for (let col = 0; col < m; col++) {
      let best = -1, bv = tol;
      for (let i = 0; i < n; i++) if (!usedRows[i] && Math.abs(A[i][col]) > bv) { bv = Math.abs(A[i][col]); best = i; }
      if (best < 0) continue;
      usedRows[best] = true; rank++;
      for (let i = 0; i < n; i++) {
        if (i === best) continue;
        const f = A[i][col] / A[best][col];
        if (f !== 0) for (let j = col; j < m; j++) A[i][j] -= f * A[best][j];
      }
    }
    return rank;
  }

  /** Partial fractions N/D = direct + sum r_i/(s-p_i); poles must be distinct. */
  function partialFractions(num, den) {
    const { q, r } = pdivmod(num, den);
    const poles = proots(den);
    for (let i = 0; i < poles.length; i++) for (let j = i + 1; j < poles.length; j++) {
      if (cabs(csub(poles[i], poles[j])) < 1e-6 * (1 + cabs(poles[i]))) {
        throw new Error('Repeated poles detected: this operation requires distinct poles.');
      }
    }
    const dd = pder(den);
    const residues = poles.map((p) => cdiv(pvalC(r, p), pvalC(dd, p)));
    return { direct: q, poles, residues };
  }

  const logspace = (a, b, n) => Array.from({ length: n }, (_, i) => Math.pow(10, a + ((b - a) * i) / (n - 1)));

  /* ======================================================================
   * 2. Model classes
   * ==================================================================== */

  class TransferFunction {
    constructor(num, den) {
      num = Array.isArray(num) ? num.map(Number) : [Number(num)];
      den = Array.isArray(den) ? den.map(Number) : [Number(den)];
      if (![...num, ...den].every(isFinite)) throw new Error('tf: coefficients must be finite numbers');
      num = ptrim(num); den = ptrim(den);
      if (den.every((v) => v === 0)) throw new Error('tf: denominator cannot be zero');
      const lead = den[0];
      this.num = num.map((v) => v / lead);
      this.den = den.map((v) => v / lead);
    }
    get order() { return this.den.length - 1; }
    relativeDegree() { return (this.den.length - 1) - (this.num.length - 1); }
    isProper() { return this.relativeDegree() >= 0; }
    poles() { return proots(this.den); }
    zeros() { return this.num.every((v) => v === 0) ? [] : proots(this.num); }
    /** Low-frequency asymptote: G(s) ~ gain / s^type */
    lowAsymptote() {
      const lz = (a) => {
        let s = 0; for (const v of a) s = Math.max(s, Math.abs(v));
        let k = 0;
        for (let i = a.length - 1; i > 0 && Math.abs(a[i]) <= 1e-13 * s; i--) k++;
        return k;
      };
      const kn = lz(this.num), kd = lz(this.den);
      return { type: kd - kn, gain: this.num[this.num.length - 1 - kn] / this.den[this.den.length - 1 - kd] };
    }
    dcGain() {
      const { type, gain } = this.lowAsymptote();
      if (type > 0) return gain >= 0 ? Infinity : -Infinity;
      return type === 0 ? gain : 0;
    }
    evaluate(s) {
      s = typeof s === 'number' ? { re: s, im: 0 } : s;
      return cdiv(pvalC(this.num, s), pvalC(this.den, s));
    }
    toString() { return '(' + pstr(this.num) + ') / (' + pstr(this.den) + ')'; }
  }

  class StateSpace {
    constructor(A, B, C, D) {
      const col = (v) => (isMatrix(v) ? v : v.map((x) => [x]));
      const row = (v) => (isMatrix(v) ? v : [v]);
      if (!isMatrix(A)) A = [[Number(A)]];
      this.A = mclone(A).map((r) => r.map(Number));
      this.B = mclone(col(Array.isArray(B) ? B : [B])).map((r) => r.map(Number));
      this.C = mclone(row(Array.isArray(C) ? C : [C])).map((r) => r.map(Number));
      const n = this.A.length;
      if (this.A.some((r) => r.length !== n)) throw new Error('ss: A must be square');
      if (this.B.length !== n) throw new Error('ss: B must have as many rows as A');
      if (this.C[0].length !== n) throw new Error('ss: C must have as many columns as A');
      const p = this.C.length, m = this.B[0].length;
      if (D === undefined || D === null) D = mzeros(p, m);
      if (!isMatrix(D)) D = [[Number(D)]];
      this.D = mclone(D).map((r) => r.map(Number));
      if (this.D.length !== p || this.D[0].length !== m) throw new Error('ss: D must be ' + p + 'x' + m);
    }
    get order() { return this.A.length; }
    toArray() { return [this.A, this.B, this.C, this.D]; }
    eigenvalues() { return proots(charpoly(this.A)); }
    poles() { return this.eigenvalues(); }
    /** Returns { expression: "(s + 1)(s + 2)", polynomial: [...], roots: [...] } (also usable as a string). */
    characteristicEquation(variable) {
      const v = variable || 's';
      const polynomial = charpoly(this.A);
      const roots = proots(polynomial);
      const expression = roots.map((r) => {
        if (r.im === 0) {
          const a = r.re;
          return '(' + v + (Math.abs(a) < 1e-12 ? '' : (a > 0 ? ' - ' : ' + ') + fmt(Math.abs(a))) + ')';
        }
        return '(' + v + ' - (' + fmt(r.re) + (r.im < 0 ? ' - ' : ' + ') + fmt(Math.abs(r.im)) + 'j))';
      }).join('');
      return {
        expression, polynomial, roots,
        polynomialString: pstr(polynomial, v) + ' = 0',
        toString() { return expression; }
      };
    }
  }

  /* ======================================================================
   * 3. Simulation / frequency-domain engines
   * ==================================================================== */

  function tf2ssCanonical(tf, form) {
    if (!tf.isProper()) throw new Error('tf2ss: transfer function must be proper (deg num <= deg den)');
    const n = tf.den.length - 1;
    if (n === 0) throw new Error('tf2ss: a static gain has no states');
    const a = tf.den;
    const b = new Array(n + 1).fill(0);
    for (let i = 0; i < tf.num.length; i++) b[n + 1 - tf.num.length + i] = tf.num[i];
    const D = b[0];
    const c = []; // c_i = b_i - a_i b_0, i = 1..n
    for (let i = 1; i <= n; i++) c.push(b[i] - a[i] * D);
    form = String(form || 'controllable').toLowerCase();
    if (form.indexOf('diag') >= 0) return tf2ssDiagonal(tf);
    const A = mzeros(n, n);
    for (let i = 0; i < n - 1; i++) A[i][i + 1] = 1;
    for (let j = 0; j < n; j++) A[n - 1][j] = -a[n - j];
    const B = mzeros(n, 1); B[n - 1][0] = 1;
    const C = [c.slice().reverse()];
    if (form.indexOf('obs') >= 0) return new StateSpace(mT(A), mT(C), mT(B), [[D]]);
    return new StateSpace(A, B, C, [[D]]);
  }

  function tf2ssDiagonal(tf) {
    const { direct, poles, residues } = partialFractions(tf.num, tf.den);
    const D = direct[direct.length - 1] || 0;
    let A = [], Bv = [], Cv = [];
    const used = new Array(poles.length).fill(false);
    for (let i = 0; i < poles.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      const p = poles[i], r = residues[i];
      if (p.im === 0) {
        A = blockDiag(A, [[p.re]]); Bv.push([1]); Cv.push(r.re);
      } else {
        let jj = -1;
        for (let j = i + 1; j < poles.length; j++) {
          if (!used[j] && Math.abs(poles[j].re - p.re) < 1e-7 * (1 + Math.abs(p.re)) && Math.abs(poles[j].im + p.im) < 1e-7 * (1 + Math.abs(p.im))) { jj = j; break; }
        }
        if (jj >= 0) used[jj] = true;
        const q = p.im > 0 ? p : poles[jj], rr = p.im > 0 ? r : residues[jj];
        // real modal block for pair sigma ± j*omega with residue a + jb
        A = blockDiag(A, [[q.re, q.im], [-q.im, q.re]]);
        Bv.push([0]); Bv.push([1]);
        Cv.push(-2 * rr.im); Cv.push(2 * rr.re);
      }
    }
    return new StateSpace(A, Bv, [Cv], [[D]]);
  }

  function ss2tfCoeffs(sys, inIdx, outIdx) {
    const i = (inIdx || 1) - 1, j = (outIdx || 1) - 1;
    const n = sys.A.length;
    if (i < 0 || i >= sys.B[0].length) throw new Error('ss2tf: input index out of range');
    if (j < 0 || j >= sys.C.length) throw new Error('ss2tf: output index out of range');
    const Bc = sys.B.map((r) => [r[i]]);
    const Cr = [sys.C[j]];
    const d = sys.D[j][i];
    const den = charpoly(sys.A);
    if (n === 0) return [[d], [1]];
    const ABC = madd(sys.A, mscale(mmul(Bc, Cr), -1));
    const pc = charpoly(ABC);
    const num = padd(pc, pscale(den, d - 1));
    return [ptrim(num, 1e-12 * Math.max(1, ...num.map(Math.abs))), den];
  }

  /** Characteristic time-scale estimate from a pole list. */
  function autoTimeGrid(poles, opts) {
    opts = opts || {};
    let tEnd = 0, fastest = 0;
    for (const p of poles) {
      const m = cabs(p);
      if (m < 1e-9) continue;
      fastest = Math.max(fastest, m);
      const sigma = -p.re;
      if (Math.abs(sigma) > 1e-6 * m) tEnd = Math.max(tEnd, 6 / Math.abs(sigma));
      else tEnd = Math.max(tEnd, (10 * 2 * Math.PI) / m);
    }
    if (!(tEnd > 0)) tEnd = 10;
    if (opts.tEnd) tEnd = opts.tEnd;
    let n = opts.n || 1000;
    if (!opts.n && fastest > 0) n = Math.min(5000, Math.max(1000, Math.ceil((tEnd * fastest) / 0.4)));
    return { tEnd, n };
  }

  function zohMatrices(ss, dt, inIdx) {
    const nx = ss.A.length;
    const M = mzeros(nx + 1, nx + 1);
    for (let i = 0; i < nx; i++) { for (let j = 0; j < nx; j++) M[i][j] = ss.A[i][j] * dt; M[i][nx] = ss.B[i][inIdx] * dt; }
    const E = expm(M);
    const Ad = E.slice(0, nx).map((r) => r.slice(0, nx));
    const Bd = E.slice(0, nx).map((r) => r[nx]);
    return { Ad, Bd };
  }

  function simulateStep(ss, tEnd, n, inIdx, outIdx) {
    inIdx = inIdx || 0; outIdx = outIdx || 0;
    const dt = tEnd / n, nx = ss.A.length;
    const t = new Array(n + 1), y = new Array(n + 1);
    if (nx === 0) { for (let k = 0; k <= n; k++) { t[k] = k * dt; y[k] = ss.D[outIdx][inIdx]; } return { t, y, dt }; }
    const { Ad, Bd } = zohMatrices(ss, dt, inIdx);
    let x = new Array(nx).fill(0);
    const Crow = ss.C[outIdx], d = ss.D[outIdx][inIdx];
    for (let k = 0; k <= n; k++) {
      t[k] = k * dt;
      y[k] = Crow.reduce((s, v, j) => s + v * x[j], 0) + d;
      const ax = mvec(Ad, x);
      x = ax.map((v, j) => v + Bd[j]);
    }
    return { t, y, dt };
  }

  function simulateImpulse(ss, tEnd, n, inIdx, outIdx) {
    inIdx = inIdx || 0; outIdx = outIdx || 0;
    const dt = tEnd / n, nx = ss.A.length;
    const t = new Array(n + 1), y = new Array(n + 1);
    if (nx === 0) { for (let k = 0; k <= n; k++) { t[k] = k * dt; y[k] = 0; } return { t, y, dt }; }
    const Ad = expm(mscale(ss.A, dt));
    let x = ss.B.map((r) => r[inIdx]);
    const Crow = ss.C[outIdx];
    for (let k = 0; k <= n; k++) {
      t[k] = k * dt;
      y[k] = Crow.reduce((s, v, j) => s + v * x[j], 0);
      x = mvec(Ad, x);
    }
    return { t, y, dt };
  }

  /** Frequency-response engine for a transfer function. */
  function makeFR(tf) {
    const zs = tf.zeros(), ps = tf.poles();
    const k = tf.num[0] / tf.den[0];
    const fa = (x, y) => { let a = Math.atan2(y, x); if (x < 0 && a < 0) a += 2 * Math.PI; return a; };
    return {
      eval(w) { return cdiv(pvalC(tf.num, { re: 0, im: w }), pvalC(tf.den, { re: 0, im: w })); },
      mag(w) { return cabs(pvalC(tf.num, { re: 0, im: w })) / cabs(pvalC(tf.den, { re: 0, im: w })); },
      magDb(w) { return 20 * Math.log10(this.mag(w)); },
      phase(w) { // degrees, continuous in w
        let ph = k < 0 ? -Math.PI : 0;
        for (const z of zs) ph += fa(-z.re, w - z.im);
        for (const p of ps) ph -= fa(-p.re, w - p.im);
        return (ph * 180) / Math.PI;
      }
    };
  }

  function freqRange(tf, opts) {
    opts = opts || {};
    const extra = opts.extraDecades || 0;
    const mags = [...tf.poles(), ...tf.zeros()].map(cabs).filter((m) => m > 1e-9);
    let lo = 1e-2, hi = 1e2;
    if (mags.length) {
      lo = Math.pow(10, Math.floor(Math.log10(Math.min(...mags))) - 1 - extra);
      hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...mags))) + 1 + extra);
    }
    if (opts.wmin) lo = opts.wmin;
    if (opts.wmax) hi = opts.wmax;
    if (!(hi > lo)) hi = lo * 1e4;
    return [lo, hi];
  }

  function findCrossings(fn, ws, target) {
    const out = [];
    let prevV = fn(ws[0]) - target;
    for (let i = 1; i < ws.length; i++) {
      const v = fn(ws[i]) - target;
      if (isFinite(prevV) && isFinite(v) && (prevV === 0 || prevV * v < 0)) {
        let lo = ws[i - 1], hi = ws[i], flo = prevV;
        for (let k = 0; k < 60; k++) {
          const mid = Math.sqrt(lo * hi), fm = fn(mid) - target;
          if (fm * flo <= 0) hi = mid; else { lo = mid; flo = fm; }
        }
        out.push(Math.sqrt(lo * hi));
      }
      prevV = v;
    }
    return out;
  }

  function phaseCrossings(fr, ws, targetDeg) {
    const ph = ws.map((w) => fr.phase(w));
    const mn = Math.min(...ph), mx = Math.max(...ph);
    const k0 = Math.floor((mn - targetDeg) / 360), k1 = Math.ceil((mx - targetDeg) / 360);
    let out = [];
    for (let k = k0; k <= k1; k++) out = out.concat(findCrossings((w) => fr.phase(w), ws, targetDeg + 360 * k));
    return out.sort((a, b) => a - b);
  }

  function computeMargins(tf) {
    const fr = makeFR(tf);
    const [lo, hi] = freqRange(tf, { extraDecades: 3 });
    const ws = logspace(Math.log10(lo), Math.log10(hi), 3000);
    const wgc = findCrossings((w) => fr.magDb(w), ws, 0);
    const wpc = phaseCrossings(fr, ws, -180);
    const wrap = (x) => ((((x + 360) % 360) + 360) % 360) - 180;
    const pms = wgc.map((w) => wrap(fr.phase(w) + 180 + 180));
    const gmsDb = wpc.map((w) => -fr.magDb(w));
    return {
      gainCrossovers: wgc,
      phaseMargins: pms,
      phaseMargin: pms.length ? Math.min(...pms) : Infinity,
      gainCrossover: wgc.length ? wgc[0] : NaN,
      phaseCrossovers: wpc,
      gainMarginsDb: gmsDb,
      gainMarginDb: gmsDb.length ? Math.min(...gmsDb) : Infinity,
      gainMargin: gmsDb.length ? Math.pow(10, Math.min(...gmsDb) / 20) : Infinity,
      phaseCrossover: wpc.length ? wpc[0] : NaN
    };
  }

  function routhTable(den) {
    const n = den.length - 1;
    if (n < 1) return { table: [den.slice()], firstColumn: [den[0]], signChanges: 0, notes: [] };
    const cols = Math.floor(n / 2) + 2;
    const T = [new Array(cols).fill(0), new Array(cols).fill(0)];
    for (let j = 0; 2 * j <= n; j++) T[0][j] = den[2 * j];
    for (let j = 0; 2 * j + 1 <= n; j++) T[1][j] = den[2 * j + 1];
    const notes = [];
    const scale = Math.max(...den.map(Math.abs));
    for (let i = 2; i <= n; i++) {
      let prev = T[i - 1];
      const prev2 = T[i - 2];
      if (prev.every((v) => Math.abs(v) < 1e-10 * scale)) {
        const order = n - (i - 2);
        prev = prev2.map((c, j) => c * (order - 2 * j));
        T[i - 1] = prev;
        notes.push('Row ' + (i - 1) + ' was all zeros: replaced by derivative of auxiliary polynomial (roots symmetric about origin).');
      } else if (Math.abs(prev[0]) < 1e-12 * scale) {
        prev[0] = 1e-9 * scale;
        notes.push('Row ' + (i - 1) + ' had a zero pivot: replaced by a small epsilon.');
      }
      const row = new Array(cols).fill(0);
      for (let j = 0; j < cols - 1; j++) row[j] = (prev[0] * prev2[j + 1] - prev2[0] * prev[j + 1]) / prev[0];
      T.push(row);
    }
    const firstColumn = T.map((r) => r[0]);
    let changes = 0, last = 0;
    for (const v of firstColumn) {
      const s = Math.abs(v) < 1e-12 * scale ? 0 : Math.sign(v);
      if (s !== 0) { if (last !== 0 && s !== last) changes++; last = s; }
    }
    return { table: T, firstColumn, signChanges: changes, notes };
  }

  const tfMul = (a, b) => new TransferFunction(pmul(a.num, b.num), pmul(a.den, b.den));
  const tfAdd = (a, b) => new TransferFunction(padd(pmul(a.num, b.den), pmul(b.num, a.den)), pmul(a.den, b.den));
  const tfScale = (a, k) => new TransferFunction(pscale(a.num, k), a.den);
  const isStablePoles = (poles, tol) => poles.every((p) => p.re < -(tol || 1e-9));

  /* ======================================================================
   * 4. Compensator
   * ==================================================================== */

  class Compensator {
    constructor(options) {
      this.options = Object.assign({ points: 1000, freqPoints: 500, tolerance: 0.02 }, options || {});
    }

    /* ---------- constructors / conversion ---------- */

    tf(num, den) { return new TransferFunction(num, den); }
    ss(A, B, C, D) { return new StateSpace(A, B, C, D); }

    _tf(sys) {
      if (sys instanceof TransferFunction) return sys;
      if (sys instanceof StateSpace) { const [n, d] = ss2tfCoeffs(sys, 1, 1); return new TransferFunction(n, d); }
      if (typeof sys === 'number') return new TransferFunction([sys], [1]);
      if (Array.isArray(sys) && sys.length === 2 && Array.isArray(sys[0]) && Array.isArray(sys[1]) && !isMatrix(sys[0][0])) return new TransferFunction(sys[0], sys[1]);
      throw new Error('Expected a TransferFunction, StateSpace or number');
    }
    _ss(sys) {
      if (sys instanceof StateSpace) return sys;
      const tf = this._tf(sys);
      if (tf.den.length === 1) { // static gain: zero-state system
        const g = Object.create(StateSpace.prototype);
        g.A = []; g.B = []; g.C = [[]]; g.D = [[tf.num[tf.num.length - 1] / tf.den[0]]];
        return g;
      }
      return tf2ssCanonical(tf, 'controllable');
    }
    _poles(sys) { return sys instanceof StateSpace ? sys.eigenvalues() : this._tf(sys).poles(); }

    tf2ss(num, den, form) {
      const tf = num instanceof TransferFunction ? num : new TransferFunction(num, den);
      if (num instanceof TransferFunction) form = den;
      return tf2ssCanonical(tf, form);
    }
    ss2tf(sys, input, output) {
      if (!(sys instanceof StateSpace)) throw new Error('ss2tf expects a StateSpace system');
      return ss2tfCoeffs(sys, input || 1, output || 1);
    }

    /* ---------- interconnections ---------- */

    /** Negative feedback: T = C G / (1 + C G H).  closeLoop(G, C) and closeLoop(C, G) are equivalent. */
    closeLoop(G, C, H, opts) {
      G = this._tf(G);
      C = C === undefined || C === null ? new TransferFunction([1], [1]) : this._tf(C);
      H = H === undefined || H === null ? new TransferFunction([1], [1]) : this._tf(H);
      const sign = opts && opts.positiveFeedback ? -1 : 1;
      const nCG = pmul(C.num, G.num), dCG = pmul(C.den, G.den);
      const num = pmul(nCG, H.den);
      const den = padd(pmul(dCG, H.den), pscale(pmul(nCG, H.num), sign));
      return new TransferFunction(num, den);
    }

    /** Series connection: sys2(sys1(u)) */
    cascade(sys1, sys2) {
      if (sys1 instanceof StateSpace && sys2 instanceof StateSpace) {
        const n1 = sys1.A.length, n2 = sys2.A.length;
        const A = blockDiag(sys1.A, sys2.A);
        const B2C1 = mmul(sys2.B, sys1.C);
        for (let i = 0; i < n2; i++) for (let j = 0; j < n1; j++) A[n1 + i][j] = B2C1[i][j];
        const B = sys1.B.concat(mmul(sys2.B, sys1.D));
        const C = hstack(mmul(sys2.D, sys1.C), sys2.C);
        return new StateSpace(A, B, C, mmul(sys2.D, sys1.D));
      }
      return tfMul(this._tf(sys1), this._tf(sys2));
    }

    /** Parallel connection: sys1 + sys2 */
    parallel(sys1, sys2) {
      if (sys1 instanceof StateSpace && sys2 instanceof StateSpace) {
        return new StateSpace(blockDiag(sys1.A, sys2.A), sys1.B.concat(sys2.B), hstack(sys1.C, sys2.C), madd(sys1.D, sys2.D));
      }
      return tfAdd(this._tf(sys1), this._tf(sys2));
    }

    /* ---------- time responses ---------- */

    _resp(kind, sys, opts) {
      opts = opts || {};
      const ss = this._ss(sys);
      const grid = autoTimeGrid(this._poles(sys), Object.assign({ n: this.options.points === 1000 ? undefined : this.options.points }, opts));
      const f = kind === 'step' ? simulateStep : simulateImpulse;
      const r = f(ss, grid.tEnd, grid.n, (opts.input || 1) - 1, (opts.output || 1) - 1);
      return { type: kind, t: r.t, y: r.y, dt: r.dt, tEnd: grid.tEnd };
    }
    step(sys, opts) { return this._resp('step', sys, opts); }
    impulse(sys, opts) { return this._resp('impulse', sys, opts); }

    /**
     * Time-domain performance metrics.  ut = 'step' | 'impulse' | 'ramp'
     * step -> delayTime, riseTime (10-90 %), peakTime, peakValue, settlingTime (2 %),
     *         overshootPercentage, steadyStateValue, steadyStateError
     */
    responseAnalysis(sys, ut, opts) {
      opts = opts || {};
      ut = String(ut || 'step').toLowerCase();
      const tol = opts.tolerance || this.options.tolerance;
      const tf = this._tf(sys);
      const stable = isStablePoles(this._poles(sys));
      const cross = (t, yn, level) => {
        for (let i = 1; i < yn.length; i++) {
          if (yn[i] >= level && yn[i - 1] < level) return t[i - 1] + ((level - yn[i - 1]) / (yn[i] - yn[i - 1])) * (t[i] - t[i - 1]);
        }
        return yn[0] >= level ? t[0] : NaN;
      };
      const settle = (t, e, band) => {
        let idx = -1;
        for (let i = e.length - 1; i >= 0; i--) if (Math.abs(e[i]) > band) { idx = i; break; }
        if (idx < 0) return 0;
        if (idx >= e.length - 1) return Infinity;
        const a = Math.abs(e[idx]), b = Math.abs(e[idx + 1]);
        return t[idx] + ((a - band) / (a - b)) * (t[idx + 1] - t[idx]);
      };
      if (!stable) return { stable: false, message: 'System is not asymptotically stable; steady-state metrics are undefined.' };

      if (ut === 'step') {
        const { t, y } = this.step(sys, opts);
        const yss = tf.dcGain();
        let peak = y[0], pi = 0;
        for (let i = 0; i < y.length; i++) if (yss >= 0 ? y[i] > peak : y[i] < peak) { peak = y[i]; pi = i; }
        const out = { stable: true, steadyStateValue: yss, steadyStateError: 1 - yss, peakValue: peak, peakTime: t[pi] };
        if (Math.abs(yss) < 1e-12) {
          Object.assign(out, { delayTime: NaN, riseTime: NaN, settlingTime: NaN, overshootPercentage: NaN });
        } else {
          const yn = y.map((v) => v / yss);
          out.delayTime = cross(t, yn, 0.5);
          out.riseTime = cross(t, yn, 0.9) - cross(t, yn, 0.1);
          out.overshootPercentage = Math.max(0, (peak / yss - 1) * 100);
          out.settlingTime = settle(t, yn.map((v) => v - 1), tol);
        }
        out.array = [out.delayTime, out.riseTime, out.settlingTime, out.overshootPercentage, out.peakTime, out.peakValue];
        out.arrayLabels = ['delayTime', 'riseTime', 'settlingTime', 'overshootPercentage', 'peakTime', 'peakValue'];
        return out;
      }
      if (ut === 'impulse') {
        const { t, y } = this.impulse(sys, opts);
        let pk = 0, pi = 0;
        for (let i = 0; i < y.length; i++) if (Math.abs(y[i]) > Math.abs(pk)) { pk = y[i]; pi = i; }
        const out = { stable: true, peakValue: pk, peakTime: t[pi], settlingTime: settle(t, y, tol * Math.abs(pk)), area: tf.dcGain() };
        out.array = [out.peakTime, out.peakValue, out.settlingTime];
        out.arrayLabels = ['peakTime', 'peakValue', 'settlingTime'];
        return out;
      }
      if (ut === 'ramp') {
        const { t, y } = this.step(sys, opts);
        const yr = [0];
        for (let i = 1; i < y.length; i++) yr.push(yr[i - 1] + 0.5 * (y[i] + y[i - 1]) * (t[i] - t[i - 1]));
        const e = t.map((tt, i) => tt - yr[i]);
        const n = e.length - 1, e90 = e[Math.floor(0.9 * n)];
        const converged = Math.abs(e[n] - e90) <= 0.02 * Math.abs(e[n]) + 1e-6;
        const out = { stable: true, steadyStateError: converged ? e[n] : Infinity };
        out.array = [out.steadyStateError];
        out.arrayLabels = ['steadyStateError'];
        return out;
      }
      throw new Error("responseAnalysis: ut must be 'step', 'impulse' or 'ramp'");
    }

    /* ---------- frequency-domain plots (data) ---------- */

    _freq(sys, opts) {
      const tf = this._tf(sys);
      const [lo, hi] = freqRange(tf, opts);
      const n = (opts && opts.n) || this.options.freqPoints;
      return { tf, fr: makeFR(tf), w: logspace(Math.log10(lo), Math.log10(hi), n) };
    }
    bodePlot(sys, opts) {
      const { tf, fr, w } = this._freq(sys, opts);
      const magnitudeDb = w.map((x) => fr.magDb(x));
      const out = { type: 'bode', w, magnitude: magnitudeDb.map((d) => Math.pow(10, d / 20)), magnitudeDb, phase: w.map((x) => fr.phase(x)) };
      if (!opts || opts.margins !== false) out.margins = computeMargins(tf);
      return out;
    }
    nyquistPlot(sys, opts) {
      const { fr, w } = this._freq(sys, opts);
      const pts = w.map((x) => fr.eval(x));
      return { type: 'nyquist', w, real: pts.map((p) => p.re), imag: pts.map((p) => p.im), realNeg: pts.map((p) => p.re), imagNeg: pts.map((p) => -p.im), criticalPoint: { re: -1, im: 0 } };
    }
    nicholsPlot(sys, opts) {
      const { fr, w } = this._freq(sys, opts);
      return { type: 'nichols', w, magnitudeDb: w.map((x) => fr.magDb(x)), phase: w.map((x) => fr.phase(x)) };
    }
    /** Root locus of 1 + k L(s) = 0 for open-loop L = sys. */
    rootLocusPlot(sys, opts) {
      opts = opts || {};
      const L = this._tf(sys);
      const poles = L.poles(), zeros = L.zeros();
      const nn = L.den.length - 1, mm = L.num.length - 1, nm = nn - mm;
      const R = Math.max(1e-3, ...[...poles, ...zeros].map(cabs));
      const b0 = Math.abs(L.num[0]) || 1;
      let kmax = opts.kmax || Math.pow(100 * R, Math.max(nm, 1)) / b0;
      if (!isFinite(kmax) || kmax <= 0) kmax = 1e6;
      const N = opts.n || 400;
      const ks = [0].concat(logspace(Math.log10(kmax) - 8, Math.log10(kmax), N));
      const roots = [];
      let prev = null;
      for (const k of ks) {
        const p = padd(L.den, pscale(L.num, k));
        const r = proots(p, prev, false);
        roots.push(r);
        prev = r;
      }
      const cnt = roots[0].length;
      const branches = [];
      for (let b = 0; b < cnt; b++) branches.push({ re: [], im: [] });
      roots.forEach((r) => { if (r.length === cnt) r.forEach((z, b) => { branches[b].re.push(z.re); branches[b].im.push(z.im); }); });
      let asymptotes = null;
      if (nm > 0) {
        const sp = poles.reduce((s, p) => s + p.re, 0), sz = zeros.reduce((s, z) => s + z.re, 0);
        asymptotes = { centroid: (sp - sz) / nm, anglesDeg: Array.from({ length: nm }, (_, q) => ((2 * q + 1) * 180) / nm) };
      }
      return { type: 'rootlocus', k: ks, roots, branches, poles, zeros, asymptotes };
    }

    /* ---------- stability ---------- */

    stabilityAnalysis(sys) {
      const tf = this._tf(sys);
      const poles = this._poles(sys);
      const zeros = tf.zeros();
      const rhp = poles.filter((p) => p.re > 1e-9);
      const axis = poles.filter((p) => Math.abs(p.re) <= 1e-9);
      let repeatedAxis = false;
      for (let i = 0; i < axis.length; i++) for (let j = i + 1; j < axis.length; j++) if (cabs(csub(axis[i], axis[j])) < 1e-5) repeatedAxis = true;
      let classification;
      if (rhp.length || repeatedAxis) classification = 'unstable';
      else if (axis.length) classification = 'marginally stable';
      else classification = 'asymptotically stable';
      const routh = routhTable(tf.den);
      const margins = computeMargins(tf);
      let closedLoopStable = null;
      try { closedLoopStable = isStablePoles(this.closeLoop(tf).poles()); } catch (e) { /* ignore */ }
      const report = {
        stable: classification === 'asymptotically stable',
        classification,
        poles, zeros,
        rhpPoleCount: rhp.length,
        imaginaryAxisPoles: axis,
        dominantPole: poles.length ? poles.reduce((a, b) => (Math.abs(b.re) < Math.abs(a.re) ? b : a)) : null,
        routh: { table: routh.table, firstColumn: routh.firstColumn, signChanges: routh.signChanges, notes: routh.notes },
        openLoopMargins: Object.assign({ closedLoopStableWithUnityFeedback: closedLoopStable }, margins,
          { note: 'Margins treat the supplied system as the open-loop transfer function L(s).' })
      };
      report.summary = 'System is ' + classification + ' (' + rhp.length + ' RHP pole' + (rhp.length === 1 ? '' : 's') + ', ' +
        axis.length + ' on the imaginary axis). Routh first-column sign changes: ' + routh.signChanges + '.';
      return report;
    }

    /* ---------- state-space analysis ---------- */

    controllability(sys) {
      sys = this._ss(sys);
      const n = sys.A.length;
      let cols = sys.B, AkB = sys.B;
      for (let k = 1; k < n; k++) { AkB = mmul(sys.A, AkB); cols = hstack(cols, AkB); }
      const rank = n ? mrank(cols) : 0;
      return { matrix: cols, rank, states: n, controllable: rank === n, uncontrollableStates: n - rank };
    }
    observability(sys) {
      sys = this._ss(sys);
      const n = sys.A.length;
      let rows = sys.C, CAk = sys.C;
      for (let k = 1; k < n; k++) { CAk = mmul(CAk, sys.A); rows = rows.concat(CAk); }
      const rank = n ? mrank(rows) : 0;
      return { matrix: rows, rank, states: n, observable: rank === n, unobservableStates: n - rank };
    }

    /* ---------- PID ---------- */

    /**
     * PID tuning.  method = 'general' | 'ziegler_nichols' (alias 'zigler_nichols')
     *   general          : loop-shaping PID (opts.phaseMargin = 60, opts.crossover = auto, opts.ratio = Ti/Td = 4)
     *   ziegler_nichols  : ultimate-gain (closed-loop) rules if the plant has a -180° crossover,
     *                      otherwise the reaction-curve (open-loop) rules
     * Returns [kp, ki, kd] with parallel form  C(s) = kp + ki/s + kd s.
     * The array also carries a non-enumerable `.info` object with details.
     */
    pid(Gs, method, opts) {
      opts = opts || {};
      const G = this._tf(Gs);
      const m = String(method || 'general').toLowerCase().replace(/[^a-z]/g, '');
      let res;
      if (m === 'general') res = this._pidGeneral(G, opts);
      else if (m === 'zieglernichols' || m === 'ziglernichols' || m === 'zn') res = this._pidZN(G, opts);
      else throw new Error("pid: unknown method '" + method + "' (use 'general' or 'ziegler_nichols')");
      const arr = [res.kp, res.ki, res.kd].map((v) => parseFloat(v.toPrecision(8)));
      Object.defineProperty(arr, 'info', { value: res, enumerable: false });
      return arr;
    }

    _pidZN(G, opts) {
      const fr = makeFR(G);
      const [lo, hi] = freqRange(G, { extraDecades: 3 });
      const ws = logspace(Math.log10(lo), Math.log10(hi), 3000);
      const wpc = phaseCrossings(fr, ws, -180).filter((w) => fr.mag(w) > 0);
      if (wpc.length) {
        const w180 = wpc[0], Ku = 1 / fr.mag(w180), Pu = (2 * Math.PI) / w180;
        const kp = 0.6 * Ku, Ti = 0.5 * Pu, Td = 0.125 * Pu;
        return { method: 'ziegler-nichols ultimate-gain', Ku, Pu, wu: w180, kp, ki: kp / Ti, kd: kp * Td };
      }
      // reaction curve
      const poles = G.poles();
      const grid = autoTimeGrid(poles, { n: 4000 });
      if (poles.some((p) => p.re > 1e-9)) throw new Error('ziegler_nichols: plant is open-loop unstable and has no -180° crossover; rules do not apply.');
      const r = simulateStep(this._ss(G), grid.tEnd, 4000);
      let best = 0, bi = 0;
      for (let i = 1; i < r.y.length; i++) { const s = (r.y[i] - r.y[i - 1]) / r.dt; if (s > best) { best = s; bi = i; } }
      if (!(best > 0)) throw new Error('ziegler_nichols: could not find a positive step-response slope (negative-gain plant? pass -Gs).');
      const tp = r.t[bi], yp = r.y[bi];
      const L = tp - yp / best;
      if (!(L > 1e-6 * grid.tEnd)) throw new Error('ziegler_nichols: no apparent delay (L≈0), e.g. first-order plant without dead time; the rules do not apply. Use method "general".');
      const R = best, kp = 1.2 / (R * L), Ti = 2 * L, Td = 0.5 * L;
      return { method: 'ziegler-nichols reaction-curve', R, L, kp, ki: kp / Ti, kd: kp * Td };
    }

    /**
     * Loop-shaping PID: places the gain crossover at `crossover` with the requested phase margin,
     * using Ti = ratio * Td (default 4).  If no crossover is given it is chosen where the plant phase
     * is -135° (or from the plant time-scale when that never happens).
     */
    _pidGeneral(G, opts) {
      const PM = opts.phaseMargin !== undefined ? opts.phaseMargin : 60;
      const ratio = opts.ratio || 4;
      const useD = G.relativeDegree() >= 1;
      const fr = makeFR(G);
      const [lo, hi] = freqRange(G, { extraDecades: 3 });
      const ws = logspace(Math.log10(lo), Math.log10(hi), 3000);
      let w0 = opts.crossover;
      if (!w0) {
        const cr = phaseCrossings(fr, ws, -135);
        if (cr.length) w0 = cr[0];
        else w0 = 6 / autoTimeGrid(G.poles(), {}).tEnd;
      }
      const cands = opts.crossover ? [w0] : logspace(Math.log10(w0) - 1.5, Math.log10(w0) + 1.5, 61).sort((p, q) => Math.abs(Math.log(p / w0)) - Math.abs(Math.log(q / w0)));
      for (const w of cands) {
        const g = fr.eval(w), M = 1 / cabs(g);
        let phi = ((-180 + PM) * Math.PI) / 180 - Math.atan2(g.im, g.re);
        phi = Math.atan2(Math.sin(phi), Math.cos(phi));
        const kp = M * Math.cos(phi), X = M * Math.sin(phi);
        if (!(kp > 0)) continue;
        let ki, kd;
        if (useD) {
          const Td = (X + Math.sqrt(X * X + (4 * kp * kp) / ratio)) / (2 * kp * w);
          kd = kp * Td; ki = kp / (ratio * Td);
        } else { kd = 0; ki = Math.max(-X * w, (kp * w) / ratio); }
        const T = this.closeLoop(G, new TransferFunction([kd, kp, ki], [1, 0]));
        if (!T.isProper() || !isStablePoles(T.poles())) continue;
        return { method: 'general (loop shaping: crossover + phase margin)', crossover: w, phaseMargin: PM, TiOverTd: ratio, kp, ki, kd };
      }
      throw new Error('pid(general): no stabilising PID found; try opts.crossover / opts.phaseMargin.');
    }

    /** [kp ki kd] -> transfer function.  opts.N adds a first-order derivative filter kd*N*s/(s+N). */
    pid2tf(pid, opts) {
      const kp = pid[0] || 0, ki = pid[1] || 0, kd = pid[2] || 0;
      const N = opts && opts.N;
      if (N && isFinite(N) && kd !== 0) {
        const pi = new TransferFunction([kp, ki], [1, 0]);
        const d = new TransferFunction([kd * N, 0], [1, N]);
        return tfAdd(pi, d);
      }
      if (ki === 0) return new TransferFunction([kd, kp], [1]);
      return new TransferFunction([kd, kp, ki], [1, 0]);
    }

    /* ---------- lead / lag / lead-lag / parallel ---------- */

    /**
     * Frequency-response compensator design.
     *   method: 'Lead' | 'Lag' | 'Lead-Lag' | 'Parallel'
     *   opts:   phaseMargin (deg, default 45), safety (deg, default 5),
     *           K (gain, default 1)  or  Kss (desired static error constant Kp/Kv/Ka -> sets K),
     *           beta (Lead-Lag/Parallel low-frequency gain lift when Kss is not given, default 10)
     *   Lead      C = K (1 + T s) / (1 + alpha T s)
     *   Lag       C = K (1 + T s) / (1 + beta T s)
     *   Lead-Lag  C = K * Lead(s) * lambda (1 + T2 s) / (1 + lambda T2 s)      (lag lifts low-frequency gain)
     *   Parallel  the Lead-Lag compensator realised as a parallel (partial-fraction) sum
     *             C = Kinf + sum r_i / (s - p_i)
     * Returns a coefficient object (with .num/.den) for comp2tf().
     */
    controller(Gs, method, opts) {
      const G = this._tf(Gs);
      const o = Object.assign({ phaseMargin: 45, safety: 5 }, opts || {});
      const m = String(method || 'lead').toLowerCase().replace(/[^a-z]/g, '');
      let K = o.K !== undefined ? o.K : 1;
      let lam = null;
      if (o.Kss !== undefined) {
        const { type, gain } = G.lowAsymptote();
        if (type < 0) throw new Error('controller: plant has a differentiating low-frequency behaviour; Kss undefined.');
        if (m === 'leadlag' || m === 'parallel') lam = o.Kss / (Math.abs(K) * Math.abs(gain));
        else K = o.Kss / gain;
      }
      if (m === 'lead') return this._designLead(G, K, o);
      if (m === 'lag') return this._designLag(G, K, o);
      if (m === 'leadlag' || m === 'parallel') {
        const ll = this._designLeadLag(G, K, lam, o);
        if (m === 'leadlag') return ll;
        const C = new TransferFunction(ll.num, ll.den);
        const pf = partialFractions(C.num, C.den);
        if (pf.poles.some((p) => p.im !== 0)) throw new Error('controller(Parallel): compensator has complex poles.');
        return {
          type: 'parallel', K, Kinf: pf.direct[pf.direct.length - 1] || 0,
          branches: pf.poles.map((p, i) => ({ gain: pf.residues[i].re, pole: p.re })),
          num: C.num, den: C.den, leadLag: ll, achieved: ll.achieved, warnings: ll.warnings
        };
      }
      throw new Error("controller: unknown method '" + method + "' (Lead, Lag, Lead-Lag, Parallel)");
    }

    _achieved(L) {
      const mg = computeMargins(L);
      return { phaseMargin: mg.phaseMargin, gainCrossover: mg.gainCrossover, gainMarginDb: mg.gainMarginDb };
    }

    _leadOnce(KG, target, extra) {
      const mg = computeMargins(KG);
      if (!isFinite(mg.phaseMargin)) throw new Error('controller(Lead): plant has no gain crossover at this gain; adjust K/Kss.');
      let phi = target - mg.phaseMargin + extra;
      if (phi <= 0.5) return { none: true, alpha: 1, T: 0, wm: mg.gainCrossover, phi: 0 };
      let capped = false;
      if (phi > 70) { phi = 70; capped = true; }
      const s = Math.sin((phi * Math.PI) / 180);
      const alpha = (1 - s) / (1 + s);
      const fr = makeFR(KG);
      const [lo, hi] = freqRange(KG, { extraDecades: 3 });
      const ws = logspace(Math.log10(lo), Math.log10(hi), 3000);
      const cr = findCrossings((w) => fr.magDb(w), ws, 10 * Math.log10(alpha));
      if (!cr.length) throw new Error('controller(Lead): could not locate the new crossover frequency.');
      const wm = cr[0];
      return { none: false, alpha, T: 1 / (wm * Math.sqrt(alpha)), wm, phi, capped };
    }

    _designLead(G, K, o) {
      const KG = tfScale(G, K), warnings = [];
      let extra = o.safety, d, C, ach;
      for (let it = 0; it < 15; it++) {
        d = this._leadOnce(KG, o.phaseMargin, extra);
        C = d.none ? new TransferFunction([1], [1]) : new TransferFunction([d.T, 1], [d.alpha * d.T, 1]);
        ach = this._achieved(tfMul(KG, C));
        if (ach.phaseMargin >= o.phaseMargin - 0.5 || d.none) break;
        extra += o.phaseMargin - ach.phaseMargin;
      }
      if (ach.phaseMargin < o.phaseMargin - 1) warnings.push('Target phase margin not reached with a single lead stage (achieved ' + fmt(ach.phaseMargin) + '°). Try Lead-Lag.');
      const T = d.T, alpha = d.alpha;
      return {
        type: 'lead', K, alpha, T,
        zero: d.none ? null : -1 / T, pole: d.none ? null : -1 / (alpha * T),
        maxPhaseLead: d.none ? 0 : d.phi, wm: d.wm,
        num: d.none ? [K] : pscale([T, 1], K), den: d.none ? [1] : [alpha * T, 1],
        achieved: ach, warnings
      };
    }

    _designLag(G, K, o) {
      const KG = tfScale(G, K), warnings = [];
      const fr = makeFR(KG);
      const [lo, hi] = freqRange(KG, { extraDecades: 3 });
      const ws = logspace(Math.log10(lo), Math.log10(hi), 3000);
      let safety = o.safety, C, beta, T, ach;
      for (let it = 0; it < 15; it++) {
        const cands = phaseCrossings(fr, ws, -180 + o.phaseMargin + safety).filter((w) => fr.mag(w) > 1);
        if (!cands.length) {
          const pm0 = computeMargins(KG).phaseMargin;
          if (pm0 >= o.phaseMargin) { C = new TransferFunction([1], [1]); beta = 1; T = 0; ach = this._achieved(KG); break; }
          throw new Error('controller(Lag): no frequency with |KG|>1 and enough phase; a lag network cannot reach the target margin.');
        }
        const wc = cands[0];
        beta = fr.mag(wc);
        T = 10 / wc;
        C = new TransferFunction([T, 1], [beta * T, 1]);
        ach = this._achieved(tfMul(KG, C));
        if (ach.phaseMargin >= o.phaseMargin - 0.5) break;
        safety += o.phaseMargin - ach.phaseMargin;
      }
      if (ach.phaseMargin < o.phaseMargin - 1) warnings.push('Target phase margin not reached (achieved ' + fmt(ach.phaseMargin) + '°).');
      return {
        type: 'lag', K, beta, T, zero: T ? -1 / T : null, pole: T ? -1 / (beta * T) : null,
        num: pscale(T ? [T, 1] : [1], K), den: T ? [beta * T, 1] : [1], achieved: ach, warnings
      };
    }

    _designLeadLag(G, K, lam, o) {
      const KG = tfScale(G, K), warnings = [];
      if (lam === null || lam === undefined) lam = o.beta || 10;
      let extra = o.safety, best = null;
      for (let it = 0; it < 15; it++) {
        const d = this._leadOnce(KG, o.phaseMargin, extra);
        const Clead = d.none ? new TransferFunction([1], [1]) : new TransferFunction([d.T, 1], [d.alpha * d.T, 1]);
        let Clag = new TransferFunction([1], [1]), T2 = 0;
        if (lam > 1.0001) { T2 = 10 / d.wm; Clag = new TransferFunction(pscale([T2, 1], lam), [lam * T2, 1]); }
        const C = tfMul(Clead, Clag);
        const ach = this._achieved(tfMul(KG, C));
        best = { d, C, Clag, T2, ach };
        if (ach.phaseMargin >= o.phaseMargin - 0.5) break;
        extra += o.phaseMargin - ach.phaseMargin;
      }
      if (best.ach.phaseMargin < o.phaseMargin - 1) warnings.push('Target phase margin not reached (achieved ' + fmt(best.ach.phaseMargin) + '°).');
      const full = tfScale(best.C, K);
      return {
        type: 'lead-lag', K,
        lead: { alpha: best.d.alpha, T: best.d.T, wm: best.d.wm, maxPhaseLead: best.d.phi },
        lag: { lambda: lam > 1.0001 ? lam : 1, T2: best.T2 },
        num: full.num, den: full.den, achieved: best.ach, warnings
      };
    }

    /** Converts PID / compensator coefficients into a transfer function. */
    comp2tf(coeffs) {
      if (Array.isArray(coeffs)) return this.pid2tf(coeffs);
      if (coeffs && coeffs.type === 'parallel') {
        let sum = new TransferFunction([coeffs.Kinf], [1]);
        for (const b of coeffs.branches) sum = tfAdd(sum, new TransferFunction([b.gain], [1, -b.pole]));
        return sum;
      }
      if (coeffs && coeffs.num && coeffs.den) return new TransferFunction(coeffs.num, coeffs.den);
      throw new Error('comp2tf: unrecognised coefficient object');
    }
  }

  Compensator.version = '0.1';
  Compensator.TransferFunction = TransferFunction;
  Compensator.StateSpace = StateSpace;
  Compensator.utils = { proots, pmul, padd, pval, pvalC, pdivmod, pstr, charpoly, expm, mmul, mrank, partialFractions, routhTable, computeMargins, makeFR };
  return Compensator;
}));
