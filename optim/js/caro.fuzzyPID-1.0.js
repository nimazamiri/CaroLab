/* =========================================================
 *  CaroLab - Fuzzy PID Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 *
 * caro.fuzzyPID-1.0.js v0.1.0 — fuzzy PID controllers that start from a designer-chosen
 * baseline (Kp0, Ki0, Kd0, i.e. the gains "at x(0)")
 *
 *   [LZH16] J.G. Lai, H. Zhou, W.S. Hu, "A New Adaptive Fuzzy PID Control
 *           Method and Its Application in FCBTM," IJCCC 11(3), 2016.
 *           -> AdaptiveFuzzyPID: Kp = Kp0 + ΔKp, Ki = Ki0 + ΔKi, Kd = Kd0 + ΔKd
 *              (their Eq. 6), ΔKp/ΔKi/ΔKd from a 2-D fuzzy system on (e, ec).
 *           -> SwitchedFuzzyPID: the 3-branch structure of their Figure 2
 *              (Fuzzy1 when |e| >= e0, else Fuzzy2/Fuzzy3 by the sign of the
 *              error's 2nd derivative), reusing three AdaptiveFuzzyPID engines.
 *
 * IMPORTANT HONESTY NOTE on the rule tables:
 *   The OCR'd Table 1 of [LZH16] (the specific NB..PB numbers for ΔKp/ΔKi/ΔKd)
 *   was too garbled to transcribe reliably. AdaptiveFuzzyPID therefore ships
 *   with the classic Zhao/Tomizuka/Isaka-style self-tuning fuzzy-PID rule base
 *   that is widely reproduced in this literature (see DEFAULT_RULES below) —
 *   NOT a verified copy of [LZH16]'s own table. Pass `rules` (see buildFIS) to
 *   substitute the exact table from your source once you have it.
 *
 *
 * Quick start (baseline + fuzzy correction, [LZH16]-style):
 *   const { AdaptiveFuzzyPID } = require('./caro.fuzzyPID-1.0.js');
 *   const pid = new AdaptiveFuzzyPID({ Kp0: 1, Ki0: 0.5, Kd0: 0.03, dt: 0.01 });
 *   const u = pid.step(error);   // Kp = Kp0 + ΔKp(e,ec), etc.
 *
 * Quick start (closed-form analytical fuzzy PID):
 *   const { SimplestFuzzyPID } = require('./caro.fuzzyPID-1.0.js');
 *   const pid = new SimplestFuzzyPID({ l: 1, M: 1900, Nd: 1, Nv: 2.2, Na: 0.41e-4, NDu: 0.71, dt: 0.001 });
 *   const u = pid.step(error);
 *
 * ========================================================= */
 
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./caro.fuzzy-1.0.js'));
  else root.FuzzyPIDLib = factory(root.Fuzzy);
})(typeof self !== 'undefined' ? self : this, function (Fuzzy) {
  'use strict';

  const { FuzzySystem } = Fuzzy;
  const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

  /* ================================================================== *
   * SimplestFuzzyPID  —  Mohan & Sinha 2004, Case (a), Eqs. (10)-(14), (23)-(25)
   * ================================================================== */
  class SimplestFuzzyPID {
    /**
     * @param {object} o
     *  l:   half-width of the input "core" interval [-l, l] (Fig. 2)         [required]
     *  M:   output triangular-MF span (Fig. 3)                               [required]
     *  Nd, Nv, Na: normalization factors for error, error-rate, error-accel  [required]
     *  NDu: normalization factor for the incremental output Δu (its reciprocal
     *       denormalizes; already baked into Eqs. 10/23-25 as written)       [required]
     *  dt: default sample time T
     *  outLimits [lo,hi]: saturate the (absolute, velocity-form) control signal
     */
    constructor(o = {}) {
      for (const k of ['l', 'M', 'Nd', 'Nv', 'Na', 'NDu']) {
        if (!(o[k] > 0)) throw new Error('SimplestFuzzyPID: option "' + k + '" must be a positive number');
      }
      this.l = o.l; this.M = o.M; this.Nd = o.Nd; this.Nv = o.Nv; this.Na = o.Na; this.NDu = o.NDu;
      this.dt = o.dt;
      this.outLimits = o.outLimits || [-Infinity, Infinity];
      this.reset();
    }

    reset() { this._d1 = 0; this._v1 = 0; this._u = 0; this._first = true; this.last = null; return this; }

    /** β of Eq. (25): the constant relating static gains to the normalization factors. */
    static beta(o) { return (14 * o.M) / (45 * o.NDu * o.l); }

    /** Static ("x(0)") gains Kps, Kis, Kds — Eqs. (24)-(25): what the fuzzy PID reduces to at zero error/rate/accel. */
    staticGains() {
      const b = SimplestFuzzyPID.beta(this);
      return { Kps: b * this.Nv, Kis: b * this.Nd, Kds: b * this.Na, beta: b };
    }

    /** Dynamic gains Kpd, Kid, Kdd at a given (already-normalized, clamped) operating point — Eq. (23). */
    dynamicGains(dN, vN, aN) {
      const l = this.l, l2 = l * l, l3 = l2 * l, l4 = l2 * l2, l5 = l4 * l, l6 = l3 * l3;
      const dN2 = dN * dN, vN2 = vN * vN, aN2 = aN * aN;
      const N1 = 7 * l5 - (aN2 + dN2) * l3 - aN2 * dN2 * l;
      const N2 = 7 * l5 - (vN2 + aN2) * l3 - vN2 * aN2 * l;
      const N3 = 7 * l5 - (dN2 + vN2) * l3 - dN2 * vN2 * l;
      let D = 15 * l6 - (dN2 + vN2 + aN2) * l4 - (dN2 * vN2 + vN2 * aN2 + aN2 * dN2) * l2 - dN2 * vN2 * aN2;
      if (Math.abs(D) < 1e-9) D = D >= 0 ? 1e-9 : -1e-9;
      const k = (2 * this.M) / (3 * this.NDu);
      return { Kpd: (k * N1 * this.Nv) / D, Kid: (k * N2 * this.Nd) / D, Kdd: (k * N3 * this.Na) / D, N1, N2, N3, D };
    }

    /**
     * One controller update (velocity/incremental form, matching the paper's block diagram).
     * e = ref - measurement (this is "d(kT)", the displacement/error).
     * Returns the (saturated) absolute control signal u(kT) = u((k-1)T) + Δu(kT).
     */
    step(e, dt) {
      dt = dt || this.dt;
      if (!(dt > 0)) throw new Error('SimplestFuzzyPID.step needs dt > 0 (pass it or set options.dt)');
      const d = e;
      const v = this._first ? 0 : (d - this._d1) / dt;
      const a = this._first ? 0 : (v - this._v1) / dt;
      this._d1 = d; this._v1 = v; this._first = false;

      const l = this.l;
      const dN = clamp(this.Nd * d, -l, l);
      const vN = clamp(this.Nv * v, -l, l);
      const aN = clamp(this.Na * a, -l, l);

      const l2 = l * l, l3 = l2 * l, l4 = l2 * l2, l5 = l4 * l, l6 = l3 * l3;
      const dN2 = dN * dN, vN2 = vN * vN, aN2 = aN * aN;
      const N1 = 7 * l5 - (aN2 + dN2) * l3 - aN2 * dN2 * l;
      const N2 = 7 * l5 - (vN2 + aN2) * l3 - vN2 * aN2 * l;
      const N3 = 7 * l5 - (dN2 + vN2) * l3 - dN2 * vN2 * l;
      let D = 15 * l6 - (dN2 + vN2 + aN2) * l4 - (dN2 * vN2 + vN2 * aN2 + aN2 * dN2) * l2 - dN2 * vN2 * aN2;
      if (Math.abs(D) < 1e-9) D = D >= 0 ? 1e-9 : -1e-9;

      const du = ((2 * this.M) / (3 * this.NDu)) * (N1 * vN + N2 * dN + N3 * aN) / D;
      const u = this._u + du;
      const us = clamp(u, this.outLimits[0], this.outLimits[1]);
      this._u = us; // clamping the accumulated state is the anti-windup for this velocity form
      this.last = { u: us, du, d, v, a, dN, vN, aN, N1, N2, N3, D };
      return us;
    }
  }

  /* ================================================================== *
   * AdaptiveFuzzyPID  —  Lai/Zhou/Hu 2016 style, Eq. (6): Kp = Kp0 + ΔKp, ...
   * ================================================================== */
  const LABELS = ['NB', 'NM', 'NS', 'ZO', 'PS', 'PM', 'PB'];

  // Classic self-tuning fuzzy-PID rule base (Zhao/Tomizuka/Isaka-style), rows = e, cols = ec.
  // Widely reproduced in the fuzzy-PID literature — see the module-level honesty note above
  // for why this stands in for [LZH16]'s own (OCR-illegible) Table 1.
  const DEFAULT_RULES = {
    dKp: [
      ['PB', 'PB', 'PM', 'PM', 'PS', 'ZO', 'ZO'],
      ['PB', 'PB', 'PM', 'PS', 'PS', 'ZO', 'NS'],
      ['PM', 'PM', 'PM', 'PS', 'ZO', 'NS', 'NS'],
      ['PM', 'PM', 'PS', 'ZO', 'NS', 'NM', 'NM'],
      ['PS', 'PS', 'ZO', 'NS', 'NS', 'NM', 'NM'],
      ['PS', 'ZO', 'NS', 'NM', 'NM', 'NM', 'NB'],
      ['ZO', 'ZO', 'NM', 'NM', 'NM', 'NB', 'NB'],
    ],
    dKi: [
      ['NB', 'NB', 'NM', 'NM', 'NS', 'ZO', 'ZO'],
      ['NB', 'NB', 'NM', 'NS', 'NS', 'ZO', 'ZO'],
      ['NB', 'NM', 'NS', 'NS', 'ZO', 'PS', 'PS'],
      ['NM', 'NM', 'NS', 'ZO', 'PS', 'PM', 'PM'],
      ['NM', 'NS', 'ZO', 'PS', 'PS', 'PM', 'PB'],
      ['ZO', 'ZO', 'PS', 'PS', 'PM', 'PB', 'PB'],
      ['ZO', 'ZO', 'PS', 'PM', 'PM', 'PB', 'PB'],
    ],
    dKd: [
      ['PS', 'NS', 'NB', 'NB', 'NB', 'NM', 'PS'],
      ['PS', 'NS', 'NB', 'NM', 'NM', 'NS', 'ZO'],
      ['ZO', 'NS', 'NM', 'NM', 'NS', 'NS', 'ZO'],
      ['ZO', 'NS', 'NS', 'NS', 'NS', 'NS', 'ZO'],
      ['ZO', 'ZO', 'ZO', 'ZO', 'ZO', 'ZO', 'ZO'],
      ['PB', 'NS', 'PS', 'PS', 'PS', 'PS', 'PB'],
      ['PB', 'PM', 'PM', 'PM', 'PS', 'PS', 'PB'],
    ],
  };

  /** Add 7 terms across a variable's range with Gaussian ends and triangular middle (paper's Fig. 3 style). */
  function addMixedTerms(fv, labels) {
    const n = labels.length, lo = fv.range[0], hi = fv.range[1], h = (hi - lo) / (n - 1);
    labels.forEach((label, i) => {
      const c = lo + i * h;
      if (i === 0 || i === n - 1) fv.addTerm(label, 'gaussmf', [h / 1.4, c]);
      else fv.addTerm(label, 'trimf', [c - h, c, c + h]);
    });
  }

  class AdaptiveFuzzyPID {
    /**
     * @param {object} o
     *  Kp0, Ki0, Kd0: REQUIRED designer baseline gains — the "x(0)" point, chosen
     *                 by hand/Ziegler-Nichols/experience, exactly as in [LZH16] Eq. (6).
     *  eRange, ecRange: physical universes for error / error-rate fed to the FIS (default [-3,3])
     *  dKpRange, dKiRange, dKdRange: physical universes for the three correction outputs
     *  scale: {Ke, Kec, Gp, Gi, Gd} — optional extra scaling of inputs/outputs (all default 1)
     *  rules: {dKp, dKi, dKd} 7x7 label tables (rows=e, cols=ec) to override DEFAULT_RULES
     *  fis: pass your own FuzzySystem (inputs [e,ec], outputs dKp,dKi,dKd) instead of buildFIS's
     *  dt, outLimits, integralLimit, derivativeTau: as in a normal PID
     */
    constructor(o = {}) {
      for (const k of ['Kp0', 'Ki0', 'Kd0']) {
        if (typeof o[k] !== 'number' || !Number.isFinite(o[k]))
          throw new Error('AdaptiveFuzzyPID: designer baseline "' + k + '" (the x(0) gain) is required');
      }
      this.base = { Kp0: o.Kp0, Ki0: o.Ki0, Kd0: o.Kd0 };
      this.scale = Object.assign({ Ke: 1, Kec: 1, Gp: 1, Gi: 1, Gd: 1 }, o.scale);
      this.dt = o.dt;
      this.outLimits = o.outLimits || [-Infinity, Infinity];
      this.integralLimit = o.integralLimit === undefined ? Infinity : o.integralLimit;
      this.derivativeTau = o.derivativeTau || 0;
      this.fis = o.fis || AdaptiveFuzzyPID.buildFIS(o);
      this.reset();
    }

    static get LABELS() { return LABELS.slice(); }
    static get DEFAULT_RULES() { return DEFAULT_RULES; }

    /** Build the default 2-input (e, ec) -> 3-output (dKp, dKi, dKd) fuzzy system. */
    static buildFIS(o = {}) {
      const s = new FuzzySystem({ type: 'mamdani', and: 'prod', or: 'probsum', implication: 'prod', aggregation: 'sum', defuzz: 'centroid' });
      const E = s.addInput('e', o.eRange || [-3, 3]); addMixedTerms(E, LABELS);
      const EC = s.addInput('ec', o.ecRange || [-3, 3]); addMixedTerms(EC, LABELS);
      s.addOutput('dKp', o.dKpRange || [-3, 3]).addTerms(LABELS, 'trimf');
      s.addOutput('dKi', o.dKiRange || [-0.06, 0.06]).addTerms(LABELS, 'trimf');
      s.addOutput('dKd', o.dKdRange || [-3, 3]).addTerms(LABELS, 'trimf');
      const r = o.rules || DEFAULT_RULES;
      s.addRuleTable({ rows: 'e', cols: 'ec', tables: { dKp: r.dKp, dKi: r.dKi, dKd: r.dKd } });
      return s;
    }

    reset() { this._int = 0; this._prevE = 0; this._de = 0; this._first = true; this.last = null; return this; }

    setBaseline(o) { Object.assign(this.base, o); return this; }
    getBaseline() { return Object.assign({}, this.base); }

    /** Corrected gains at a given (e, ec) without touching controller state. */
    gains(e, ec) {
      const S = this.scale;
      const g = this.fis.evaluate([e * S.Ke, ec * S.Kec]);
      return {
        dKp: g.dKp, dKi: g.dKi, dKd: g.dKd,
        Kp: this.base.Kp0 + S.Gp * g.dKp,
        Ki: this.base.Ki0 + S.Gi * g.dKi,
        Kd: this.base.Kd0 + S.Gd * g.dKd,
      };
    }

    _core(e, ec, dt) {
      const g = this.gains(e, ec);
      const lim = this.integralLimit;
      const inc = e * dt;
      this._int = clamp(this._int + inc, -lim, lim);
      const u = g.Kp * e + g.Ki * this._int + g.Kd * ec;
      const us = clamp(u, this.outLimits[0], this.outLimits[1]);
      if (us !== u && e * u > 0) this._int -= inc; // conditional integration (anti-windup)
      this.last = { u: us, e, ec, integral: this._int, gains: g };
      return us;
    }

    /** One controller update. e = ref - measurement. */
    step(e, dt) {
      dt = dt || this.dt;
      if (!(dt > 0)) throw new Error('AdaptiveFuzzyPID.step needs dt > 0 (pass it or set options.dt)');
      let ec = this._first ? 0 : (e - this._prevE) / dt;
      if (this.derivativeTau > 0) ec = this._de + (dt / (this.derivativeTau + dt)) * (ec - this._de);
      this._de = ec; this._prevE = e; this._first = false;
      return this._core(e, ec, dt);
    }

    /** Like step(), but with a pre-computed error-rate (used by SwitchedFuzzyPID to share one e/ec history). */
    stepWithEC(e, ec, dt) {
      dt = dt || this.dt;
      if (!(dt > 0)) throw new Error('AdaptiveFuzzyPID.stepWithEC needs dt > 0 (pass it or set options.dt)');
      this._prevE = e; this._first = false;
      return this._core(e, ec, dt);
    }
  }

  /* ================================================================== *
   * SwitchedFuzzyPID  —  Lai/Zhou/Hu 2016, Figure 2's 3-branch structure.
   * ================================================================== */
  class SwitchedFuzzyPID {
    /**
     * @param {object} o
     *  e0: REQUIRED switching threshold. |e| >= e0 -> fz1 (2-D, "large error"
     *      branch); |e| < e0 -> fz2 if the error's 2nd derivative (er) is
     *      positive, else fz3 (the paper's "small error, refine by curvature"
     *      branches).
     *  fz1, fz2, fz3: each either an AdaptiveFuzzyPID instance, or an options
     *      object to build one. fz2/fz3 default to fz1 if omitted (i.e. this
     *      degrades to a plain 2-D AdaptiveFuzzyPID unless you supply distinct
     *      tuning/rules for the small-error branches).
     *  dt: default sample time, used if step() is called without one.
     */
    constructor(o = {}) {
      if (!(o.e0 > 0)) throw new Error('SwitchedFuzzyPID: option "e0" (switching threshold) must be > 0');
      this.e0 = o.e0;
      this.dt = o.dt;
      const mk = x => (x instanceof AdaptiveFuzzyPID ? x : new AdaptiveFuzzyPID(x));
      this.fz1 = mk(o.fz1 || o);
      this.fz2 = o.fz2 ? mk(o.fz2) : this.fz1;
      this.fz3 = o.fz3 ? mk(o.fz3) : this.fz1;
      this.reset();
    }

    reset() {
      const seen = new Set();
      for (const f of [this.fz1, this.fz2, this.fz3]) if (!seen.has(f)) { f.reset(); seen.add(f); }
      this._prevE = 0; this._prevEC = 0; this._first = true; this.lastBranch = null;
      return this;
    }

    step(e, dt) {
      dt = dt || this.dt;
      if (!(dt > 0)) throw new Error('SwitchedFuzzyPID.step needs dt > 0 (pass it or set options.dt)');
      const ec = this._first ? 0 : (e - this._prevE) / dt;
      let branch, u;
      if (Math.abs(e) >= this.e0) {
        branch = 'fz1'; u = this.fz1.stepWithEC(e, ec, dt);
      } else {
        const er = this._first ? 0 : (ec - this._prevEC) / dt;
        if (er > 0) { branch = 'fz2'; u = this.fz2.stepWithEC(e, ec, dt); }
        else { branch = 'fz3'; u = this.fz3.stepWithEC(e, ec, dt); }
      }
      this._prevE = e; this._prevEC = ec; this._first = false; this.lastBranch = branch;
      return u;
    }
  }

  return { version: '0.1.0', SimplestFuzzyPID, AdaptiveFuzzyPID, SwitchedFuzzyPID, LABELS, DEFAULT_RULES };
});
