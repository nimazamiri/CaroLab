/* =========================================================
 *  CaroLab - Fuzzy Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 *
 *  - Membership functions: trimf, trapmf, gaussmf, gbellmf, sigmf, singleton
 *  - FuzzyVariable / FuzzySystem : Mamdani and Sugeno inference
 *      AND: min | prod      OR: max | probsum
 *      implication: min | prod      aggregation: max | sum | probsum
 *      defuzz: centroid | bisector | mom | som | lom | wtaver | wtsum
 *    (prod + sum + centroid uses an exact closed-form fast path)
 *  - Rules as objects, "IF a IS x AND b IS y THEN c IS z" strings, or 2-D rule tables
 *  - getParams()/setParams() so an optimizer (see ga.js) can tune membership functions
 *  - FuzzyPID: fuzzy gain-scheduled PID from Madebo (IEEE Access 2025):
 *      inputs e, de  ->  Kp, Ki, Kd  (7x7 rule tables, triangular in / Gaussian out,
 *      product-sum inference, centroid), and
 *          u = Gp*kp*e + Gi*ki*∫e dt + Gd*kd*de/dt
 *      with scaling factors [kpe, kde, Gp, Gi, Gd] that a GA can tune.
 *
 * Quick start:
 *   const F = require('./fuzzy.js');
 *   const sys = new F.FuzzySystem({ and:'min', or:'max', defuzz:'centroid' });
 *   sys.addInput('temp', [0, 40]).addTerms(['cold','warm','hot'], 'trimf');
 *   sys.addOutput('fan', [0, 100]).addTerms(['low','mid','high'], 'trimf');
 *   sys.addRule('IF temp IS cold THEN fan IS low');
 *   sys.addRule('IF temp IS warm THEN fan IS mid');
 *   sys.addRule('IF temp IS hot THEN fan IS high');
 *   sys.evaluate({ temp: 30 });   // -> { fan: ... }
 *
 * ========================================================= */
 
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Fuzzy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EPS = 1e-12;
  const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

  /* ------------------------------------------------------------------ *
   * Membership functions
   * ------------------------------------------------------------------ */
  const MF = {
    trimf(x, p) { // [a b c]
      const a = p[0], b = p[1], c = p[2];
      if (x < a || x > c) return 0;
      if (x === b) return 1;
      return x < b ? (x - a) / (b - a) : (c - x) / (c - b);
    },
    trapmf(x, p) { // [a b c d]
      const a = p[0], b = p[1], c = p[2], d = p[3];
      if (x < a || x > d) return 0;
      if (x >= b && x <= c) return 1;
      return x < b ? (x - a) / (b - a) : (d - x) / (d - c);
    },
    gaussmf(x, p) { // [sigma c]
      const z = (x - p[1]) / p[0];
      return Math.exp(-0.5 * z * z);
    },
    gbellmf(x, p) { // [a b c]
      return 1 / (1 + Math.pow(Math.abs((x - p[2]) / p[0]), 2 * p[1]));
    },
    sigmf(x, p) { // [a c]
      return 1 / (1 + Math.exp(-p[0] * (x - p[1])));
    },
    singleton(x, p) { return x === p[0] ? 1 : 0; },
  };
  const MF_NPARAMS = { trimf: 3, trapmf: 4, gaussmf: 2, gbellmf: 3, sigmf: 2, singleton: 1 };
  const SUGENO_TYPES = { constant: 1, linear: 1 }; // consequent-only "terms"

  function normalizeParams(type, p) {
    p = Array.from(p, Number);
    switch (type) {
      case 'trimf': case 'trapmf': return p.sort((a, b) => a - b);
      case 'gaussmf': return [Math.max(Math.abs(p[0]), 1e-9), p[1]];
      case 'gbellmf': return [Math.max(Math.abs(p[0]), 1e-9), Math.max(Math.abs(p[1]), 1e-9), p[2]];
      default: return p;
    }
  }

  /** Evaluate a membership function by name: evalMF('trimf', 0.3, [0,0.5,1]) */
  function evalMF(type, x, params) {
    if (!MF[type]) throw new Error('Unknown MF type "' + type + '"');
    return MF[type](x, params);
  }

  /* ------------------------------------------------------------------ *
   * FuzzyVariable
   * ------------------------------------------------------------------ */
  class FuzzyVariable {
    constructor(name, range, kind, sys) {
      if (!(range && range[1] > range[0])) throw new Error('Variable "' + name + '": range must be [lo, hi] with hi > lo');
      this.name = name;
      this.range = [+range[0], +range[1]];
      this.kind = kind; // 'input' | 'output'
      this.terms = [];  // [{label, type, params}]
      this._sys = sys;
    }
    _touch() { if (this._sys) this._sys._c = null; }

    /** Add one term. type: trimf|trapmf|gaussmf|gbellmf|sigmf|singleton (or constant|linear for Sugeno outputs) */
    addTerm(label, type, params) {
      if (!MF[type] && !SUGENO_TYPES[type]) throw new Error('Unknown MF type "' + type + '"');
      if (MF_NPARAMS[type] && params.length !== MF_NPARAMS[type])
        throw new Error(type + ' needs ' + MF_NPARAMS[type] + ' params');
      if (this.terms.some(t => t.label === label)) throw new Error('Duplicate term "' + label + '" in ' + this.name);
      this.terms.push({ label, type, params: normalizeParams(type, params) });
      this._touch();
      return this;
    }

    /**
     * Add evenly spaced terms across the range (like the paper's 7-label NB..PB / VVS..VVB sets).
     * shape: 'trimf' (peaks at centres, neighbours cross at 0.5) | 'gaussmf' | 'gbellmf'
     */
    addTerms(labels, shape = 'trimf') {
      const n = labels.length;
      if (n < 2) throw new Error('addTerms needs at least 2 labels');
      const lo = this.range[0], hi = this.range[1], h = (hi - lo) / (n - 1);
      labels.forEach((label, i) => {
        const c = lo + i * h;
        let params;
        if (shape === 'trimf') params = [c - h, c, c + h];
        else if (shape === 'gaussmf') params = [h / 2.3548, c]; // neighbours cross at 0.5
        else if (shape === 'gbellmf') params = [h / 2, 2, c];
        else throw new Error('addTerms: unsupported shape "' + shape + '"');
        this.addTerm(label, shape, params);
      });
      return this;
    }

    termIndex(label) { return this.terms.findIndex(t => t.label === label); }

    /** Degree of membership of x in every term: { label: mu } */
    fuzzify(x) {
      x = clamp(x, this.range[0], this.range[1]);
      const out = {};
      for (const t of this.terms) out[t.label] = MF[t.type] ? MF[t.type](x, t.params) : NaN;
      return out;
    }
  }

  /* ------------------------------------------------------------------ *
   * Rule parsing
   * ------------------------------------------------------------------ */
  function parseRule(str) {
    let s = String(str).trim().replace(/^if\s+/i, '');
    let weight = 1;
    const wm = s.match(/\bweight\s*[=:]?\s*([0-9.eE+-]+)\s*$/i);
    if (wm) { weight = parseFloat(wm[1]); s = s.slice(0, wm.index).trim(); }
    const parts = s.split(/\bthen\b/i);
    if (parts.length !== 2) throw new Error('Rule needs exactly one THEN: ' + str);
    const hasAnd = /\band\b/i.test(parts[0]), hasOr = /\bor\b/i.test(parts[0]);
    if (hasAnd && hasOr) throw new Error('Mixed AND/OR in one rule is not supported; split it into rules: ' + str);
    const ants = parts[0].split(/\b(?:and|or)\b/i).map(t => {
      const m = t.trim().match(/^(\w+)\s+is\s+(not\s+)?(\w+)$/i);
      if (!m) throw new Error('Bad antecedent "' + t.trim() + '" in rule: ' + str);
      return { v: m[1], t: m[3], not: !!m[2] };
    });
    const cons = parts[1].split(/,|\band\b/i).map(t => {
      const m = t.trim().match(/^(\w+)\s+is\s+(\w+)$/i);
      if (!m) throw new Error('Bad consequent "' + t.trim() + '" in rule: ' + str);
      return { v: m[1], t: m[2] };
    });
    return { ants, op: hasOr ? 'or' : 'and', cons, weight };
  }

  /* ------------------------------------------------------------------ *
   * FuzzySystem
   * ------------------------------------------------------------------ */
  class FuzzySystem {
    /**
     * @param {object} o
     *  type: 'mamdani' | 'sugeno'            (default 'mamdani')
     *  and: 'min' | 'prod'                   (default 'min')
     *  or: 'max' | 'probsum'                 (default 'max')
     *  implication: 'min' | 'prod'           (default 'min')     [Mamdani]
     *  aggregation: 'max' | 'sum' | 'probsum'(default 'max')     [Mamdani]
     *  defuzz: 'centroid'|'bisector'|'mom'|'som'|'lom' (Mamdani, default 'centroid')
     *          'wtaver'|'wtsum' (Sugeno, default 'wtaver')
     *  resolution: samples of the output universe for non-closed-form defuzz (default 201)
     *  clampInputs: clip inputs to the variable range (default true)
     *  defaultOutput: value if no rule fires (default: middle of the output range)
     */
    constructor(o = {}) {
      this.type = o.type || 'mamdani';
      this.andMethod = o.and || 'min';
      this.orMethod = o.or || 'max';
      this.implication = o.implication || 'min';
      this.aggregation = o.aggregation || 'max';
      this.defuzz = o.defuzz || (this.type === 'sugeno' ? 'wtaver' : 'centroid');
      this.resolution = o.resolution || 201;
      this.clampInputs = o.clampInputs !== false;
      this.defaultOutput = o.defaultOutput;
      this.inputs = [];
      this.outputs = [];
      this.rules = [];
      this._c = null; // compiled cache; set to null (or call invalidate()) after changing options
    }

    invalidate() { this._c = null; }

    addInput(name, range) {
      const v = new FuzzyVariable(name, range, 'input', this);
      this.inputs.push(v); this._c = null; return v;
    }
    addOutput(name, range) {
      const v = new FuzzyVariable(name, range, 'output', this);
      this.outputs.push(v); this._c = null; return v;
    }
    input(name) { return this.inputs.find(v => v.name === name); }
    output(name) { return this.outputs.find(v => v.name === name); }

    /**
     * addRule('IF e IS NB AND de IS PS THEN kp IS B, kd IS VB WEIGHT 0.5')
     * addRule({ if:{e:'NB', de:'PS'}, then:{kp:'B'}, op:'and', weight:1 })   ('!X' negates a term)
     */
    addRule(rule) {
      if (typeof rule === 'string') rule = parseRule(rule);
      else {
        rule = {
          ants: Object.entries(rule.if).map(([v, t]) => {
            let not = false;
            if (typeof t === 'string' && t[0] === '!') { not = true; t = t.slice(1); }
            return { v, t, not };
          }),
          op: rule.op === 'or' ? 'or' : 'and',
          cons: Object.entries(rule.then).map(([v, t]) => ({ v, t })),
          weight: rule.weight === undefined ? 1 : rule.weight,
        };
      }
      this.rules.push(rule); this._c = null; return this;
    }

    /**
     * Fill a 2-input rule base from tables (like the paper's Tables 3 and 4).
     * addRuleTable({ rows:'de', cols:'e', tables:{ kp:[[...]], ki:[[...]], kd:[[...]] } })
     * tables[out][i][j] = output label for rows-label i and cols-label j
     * (rowLabels / colLabels default to the term order of each input variable).
     */
    addRuleTable(o) {
      const rv = this.input(o.rows), cv = this.input(o.cols);
      if (!rv || !cv) throw new Error('addRuleTable: unknown input variable');
      const rl = o.rowLabels || rv.terms.map(t => t.label);
      const cl = o.colLabels || cv.terms.map(t => t.label);
      for (let i = 0; i < rl.length; i++)
        for (let j = 0; j < cl.length; j++) {
          const then = {};
          for (const out of Object.keys(o.tables)) then[out] = o.tables[out][i][j];
          this.addRule({ if: { [o.rows]: rl[i], [o.cols]: cl[j] }, then, op: o.op || 'and', weight: o.weight });
        }
      return this;
    }

    /* ---------- compile ---------- */
    _compile() {
      const inputs = this.inputs, outputs = this.outputs;
      if (!inputs.length || !outputs.length) throw new Error('FuzzySystem needs at least one input and one output');
      const sugeno = this.type === 'sugeno';
      const inMap = new Map(inputs.map((v, i) => [v.name, i]));
      const outMap = new Map(outputs.map((v, i) => [v.name, i]));
      const c = { sugeno, nIn: inputs.length, nOut: outputs.length };

      c.ins = inputs.map(v => ({
        lo: v.range[0], hi: v.range[1],
        terms: v.terms.map(t => {
          if (!MF[t.type]) throw new Error('Input term "' + t.label + '" needs a real MF type');
          return { fn: MF[t.type], p: t.params };
        }),
      }));

      c.rules = this.rules.map((r, k) => {
        const ants = r.ants.map(a => {
          const vi = inMap.get(a.v);
          if (vi === undefined) throw new Error('Rule ' + (k + 1) + ': unknown input "' + a.v + '"');
          const ti = inputs[vi].termIndex(a.t);
          if (ti < 0) throw new Error('Rule ' + (k + 1) + ': unknown term "' + a.t + '" of ' + a.v);
          return [vi, ti, a.not ? 1 : 0];
        });
        const cons = r.cons.map(a => {
          const oi = outMap.get(a.v);
          if (oi === undefined) throw new Error('Rule ' + (k + 1) + ': unknown output "' + a.v + '"');
          const ti = outputs[oi].termIndex(a.t);
          if (ti < 0) throw new Error('Rule ' + (k + 1) + ': unknown term "' + a.t + '" of ' + a.v);
          return [oi, ti];
        });
        return { ants, cons, or: r.op === 'or', w: r.weight === undefined ? 1 : r.weight };
      });

      c.andProd = this.andMethod === 'prod';
      c.orProb = this.orMethod === 'probsum';
      c.mu = c.ins.map(i => new Float64Array(i.terms.length));
      c.str = new Float64Array(c.rules.length);
      c.x = new Float64Array(c.nIn);
      c.num = new Float64Array(c.nOut);
      c.den = new Float64Array(c.nOut);

      const res = this.resolution;
      c.implMin = this.implication === 'min';
      c.agg = this.aggregation;
      c.fast = !sugeno && this.implication === 'prod' && this.aggregation === 'sum' && this.defuzz === 'centroid';

      c.outs = outputs.map(v => {
        const mid = 0.5 * (v.range[0] + v.range[1]);
        const o = { lo: v.range[0], hi: v.range[1], mid: this.defaultOutput !== undefined ? this.defaultOutput : mid };
        if (sugeno) {
          o.terms = v.terms.map(t => {
            if (!SUGENO_TYPES[t.type]) throw new Error('Sugeno output term "' + t.label + '" must be constant or linear');
            return { lin: t.type === 'linear', p: t.params };
          });
          return o;
        }
        o.grid = new Float64Array(res);
        for (let k = 0; k < res; k++) o.grid[k] = o.lo + (o.hi - o.lo) * k / (res - 1);
        o.y = new Float64Array(res);
        o.terms = v.terms.map(t => {
          const fn = MF[t.type];
          if (!fn) throw new Error('Mamdani output term "' + t.label + '" needs a real MF type');
          const samples = new Float64Array(res);
          for (let k = 0; k < res; k++) samples[k] = fn(o.grid[k], t.params);
          // area & centroid by fine trapezoid integration (used by the closed-form fast path)
          const N = 2000, dx = (o.hi - o.lo) / N;
          let A = 0, M = 0;
          for (let k = 0; k <= N; k++) {
            const u = o.lo + k * dx, w = (k === 0 || k === N) ? 0.5 : 1, m = fn(u, t.params) * w * dx;
            A += m; M += m * u;
          }
          return { samples, area: A, cen: A > EPS ? M / A : o.mid };
        });
        return o;
      });
      return c;
    }

    /**
     * Evaluate the system. input: {name: value} or array in input order.
     * Returns { outputName: value, ... }
     */
    evaluate(input) {
      const c = this._c || (this._c = this._compile());
      const nIn = c.nIn, x = c.x;
      if (Array.isArray(input) || ArrayBuffer.isView(input)) {
        if (input.length !== nIn) throw new Error('Expected ' + nIn + ' inputs');
        for (let i = 0; i < nIn; i++) x[i] = input[i];
      } else {
        for (let i = 0; i < nIn; i++) {
          const v = input[this.inputs[i].name];
          if (typeof v !== 'number' || v !== v) throw new Error('Missing/invalid input "' + this.inputs[i].name + '"');
          x[i] = v;
        }
      }

      // 1) fuzzify
      for (let i = 0; i < nIn; i++) {
        const I = c.ins[i], mu = c.mu[i];
        let xi = x[i];
        if (this.clampInputs) xi = xi < I.lo ? I.lo : xi > I.hi ? I.hi : xi;
        x[i] = xi;
        for (let j = 0; j < I.terms.length; j++) mu[j] = I.terms[j].fn(xi, I.terms[j].p);
      }

      // 2) rule firing strengths
      const rules = c.rules, str = c.str, nR = rules.length;
      for (let r = 0; r < nR; r++) {
        const R = rules[r], A = R.ants;
        let s = 0;
        for (let k = 0; k < A.length; k++) {
          let m = c.mu[A[k][0]][A[k][1]];
          if (A[k][2]) m = 1 - m;
          if (k === 0) s = m;
          else if (R.or) s = c.orProb ? s + m - s * m : (m > s ? m : s);
          else s = c.andProd ? s * m : (m < s ? m : s);
        }
        str[r] = s * R.w;
      }

      // 3) implication / aggregation / defuzzification
      const nOut = c.nOut, num = c.num, den = c.den;
      const out = {};
      num.fill(0); den.fill(0);

      if (c.sugeno) {
        for (let r = 0; r < nR; r++) {
          const s = str[r]; if (s <= EPS) continue;
          for (const [oi, ti] of rules[r].cons) {
            const T = c.outs[oi].terms[ti];
            let z;
            if (T.lin) { z = T.p[nIn]; for (let i = 0; i < nIn; i++) z += T.p[i] * x[i]; }
            else z = T.p[0];
            num[oi] += s * z; den[oi] += s;
          }
        }
        for (let o = 0; o < nOut; o++) {
          out[this.outputs[o].name] = den[o] > EPS ? (this.defuzz === 'wtsum' ? num[o] : num[o] / den[o]) : c.outs[o].mid;
        }
        return out;
      }

      if (c.fast) { // exact: sum of (w * mu_i) has centroid sum(w A c)/sum(w A)
        for (let r = 0; r < nR; r++) {
          const s = str[r]; if (s <= EPS) continue;
          for (const [oi, ti] of rules[r].cons) {
            const T = c.outs[oi].terms[ti];
            num[oi] += s * T.area * T.cen; den[oi] += s * T.area;
          }
        }
        for (let o = 0; o < nOut; o++) out[this.outputs[o].name] = den[o] > EPS ? num[o] / den[o] : c.outs[o].mid;
        return out;
      }

      // general sampled path
      const res = this.resolution, fired = new Uint8Array(nOut);
      for (let o = 0; o < nOut; o++) c.outs[o].y.fill(0);
      for (let r = 0; r < nR; r++) {
        const s = str[r]; if (s <= EPS) continue;
        for (const [oi, ti] of rules[r].cons) {
          fired[oi] = 1;
          const y = c.outs[oi].y, sm = c.outs[oi].terms[ti].samples;
          for (let k = 0; k < res; k++) {
            const v = c.implMin ? (s < sm[k] ? s : sm[k]) : s * sm[k];
            y[k] = c.agg === 'max' ? (v > y[k] ? v : y[k]) : c.agg === 'sum' ? y[k] + v : y[k] + v - y[k] * v;
          }
        }
      }
      for (let o = 0; o < nOut; o++) {
        out[this.outputs[o].name] = fired[o] ? defuzzGrid(this.defuzz, c.outs[o].grid, c.outs[o].y, c.outs[o].mid) : c.outs[o].mid;
      }
      return out;
    }

    /** Convenience: single-output system -> number */
    evaluateScalar(input) { return this.evaluate(input)[this.outputs[0].name]; }

    /** Grid of one output over two inputs (for surface plots). others: fixed values of remaining inputs. */
    controlSurface(xName, yName, outName, n = 21, others = {}) {
      const xv = this.input(xName), yv = this.input(yName);
      const xs = [], ys = [], z = [];
      for (let i = 0; i < n; i++) xs.push(xv.range[0] + (xv.range[1] - xv.range[0]) * i / (n - 1));
      for (let j = 0; j < n; j++) ys.push(yv.range[0] + (yv.range[1] - yv.range[0]) * j / (n - 1));
      for (let j = 0; j < n; j++) {
        const row = [];
        for (let i = 0; i < n; i++) row.push(this.evaluate(Object.assign({}, others, { [xName]: xs[i], [yName]: ys[j] }))[outName]);
        z.push(row);
      }
      return { x: xs, y: ys, z };
    }

    /* ---------- tuning support ---------- */

    /** Flat vector of all MF parameters (inputs first, then outputs). */
    getParams() {
      const p = [];
      for (const v of this.inputs.concat(this.outputs)) for (const t of v.terms) p.push(...t.params);
      return p;
    }
    /** Description of each entry of getParams(): [{variable, kind, term, type, index}] — handy for building GA bounds. */
    paramLayout() {
      const L = [];
      for (const v of this.inputs.concat(this.outputs))
        for (const t of v.terms) t.params.forEach((_, i) => L.push({ variable: v.name, kind: v.kind, term: t.label, type: t.type, index: i }));
      return L;
    }
    /** Set MF parameters from a flat vector (params are re-sorted / kept valid). */
    setParams(vec) {
      let k = 0;
      for (const v of this.inputs.concat(this.outputs))
        for (const t of v.terms) { const n = t.params.length; t.params = normalizeParams(t.type, vec.slice(k, k + n)); k += n; }
      if (k !== vec.length) throw new Error('setParams: expected ' + k + ' values, got ' + vec.length);
      this._c = null;
      return this;
    }

    /* ---------- (de)serialisation ---------- */
    toJSON() {
      const vars = a => a.map(v => ({ name: v.name, range: v.range, terms: v.terms.map(t => ({ label: t.label, type: t.type, params: t.params })) }));
      return {
        type: this.type, and: this.andMethod, or: this.orMethod, implication: this.implication,
        aggregation: this.aggregation, defuzz: this.defuzz, resolution: this.resolution,
        clampInputs: this.clampInputs, defaultOutput: this.defaultOutput,
        inputs: vars(this.inputs), outputs: vars(this.outputs), rules: this.rules,
      };
    }
    static fromJSON(j) {
      if (typeof j === 'string') j = JSON.parse(j);
      const s = new FuzzySystem(j);
      for (const v of j.inputs) { const x = s.addInput(v.name, v.range); v.terms.forEach(t => x.addTerm(t.label, t.type, t.params)); }
      for (const v of j.outputs) { const x = s.addOutput(v.name, v.range); v.terms.forEach(t => x.addTerm(t.label, t.type, t.params)); }
      j.rules.forEach(r => s.rules.push(r));
      return s;
    }
  }

  function defuzzGrid(kind, grid, y, mid) {
    const n = grid.length;
    let sum = 0;
    for (let k = 0; k < n; k++) sum += y[k];
    if (sum <= EPS) return mid;
    if (kind === 'centroid') {
      let m = 0;
      for (let k = 0; k < n; k++) m += grid[k] * y[k];
      return m / sum;
    }
    if (kind === 'bisector') {
      let acc = 0; const half = 0.5 * sum;
      for (let k = 0; k < n; k++) { acc += y[k]; if (acc >= half) return grid[k]; }
      return grid[n - 1];
    }
    let mx = 0;
    for (let k = 0; k < n; k++) if (y[k] > mx) mx = y[k];
    let first = -1, last = -1, tot = 0, cnt = 0;
    for (let k = 0; k < n; k++) if (y[k] >= mx - 1e-9) { if (first < 0) first = k; last = k; tot += grid[k]; cnt++; }
    if (kind === 'som') return grid[first];
    if (kind === 'lom') return grid[last];
    if (kind === 'mom') return tot / cnt;
    throw new Error('Unknown defuzzification "' + kind + '"');
  }

  /* ------------------------------------------------------------------ *
   * Fuzzy PID (Madebo, IEEE Access 2025): tables 3 & 4, Figs 5-9, Eq. 28/30
   * ------------------------------------------------------------------ */
  const IN_LABELS = ['NB', 'NM', 'NS', 'Z', 'PS', 'PM', 'PB'];
  const OUT_LABELS = ['VVS', 'VS', 'S', 'M', 'B', 'VB', 'VVB'];

  // rows: de = NB..PB, columns: e = NB..PB
  const TABLE_KD = [
    ['M', 'B', 'VB', 'VVB', 'VB', 'B', 'M'],
    ['S', 'M', 'B', 'VB', 'B', 'M', 'S'],
    ['VS', 'S', 'M', 'B', 'M', 'S', 'VS'],
    ['VVS', 'VS', 'S', 'M', 'S', 'VS', 'VVS'],
    ['VS', 'S', 'M', 'B', 'M', 'S', 'VS'],
    ['S', 'M', 'B', 'VB', 'B', 'M', 'S'],
    ['M', 'B', 'VB', 'VVB', 'VB', 'B', 'M'],
  ];
  const TABLE_KP_KI = [
    ['M', 'S', 'VS', 'VVS', 'VS', 'S', 'M'],
    ['B', 'M', 'S', 'VS', 'S', 'M', 'B'],
    ['VB', 'B', 'M', 'S', 'M', 'B', 'VB'],
    ['VVB', 'VB', 'B', 'M', 'B', 'VB', 'VVB'],
    ['VB', 'B', 'M', 'S', 'M', 'B', 'VB'],
    ['B', 'M', 'S', 'VS', 'S', 'M', 'B'],
    ['M', 'S', 'VS', 'VVS', 'VS', 'S', 'M'],
  ];

  class FuzzyPID {
    /**
     * @param {object} o
     *  eRange [-1,1], deRange [-10,10]        universes of the FIS inputs (after scaling)
     *  kpRange [0.2,0.7], kiRange [0.001,0.01], kdRange [0.1,0.15]   FIS output universes
     *  scaling: {kpe,kde,Gp,Gi,Gd}  (defaults 1) — the 5 numbers a GA tunes
     *  dt: default sample time
     *  outLimits [lo,hi]: output saturation, with conditional-integration anti-windup
     *  integralLimit: |∫e| clamp
     *  derivativeTau: first-order filter time constant on de/dt (0 = none)
     *  fis: pass your own FuzzySystem (inputs [e,de], outputs kp,ki,kd) instead of the paper's
     */
    constructor(o = {}) {
      this.dt = o.dt;
      this.outLimits = o.outLimits || [-Infinity, Infinity];
      this.integralLimit = o.integralLimit === undefined ? Infinity : o.integralLimit;
      this.derivativeTau = o.derivativeTau || 0;
      this.scaling = { kpe: 1, kde: 1, Gp: 1, Gi: 1, Gd: 1 };
      if (o.scaling) this.setScaling(o.scaling);
      this.fis = o.fis || FuzzyPID.buildFIS(o);
      this.reset();
    }

    static get SCALING_KEYS() { return ['kpe', 'kde', 'Gp', 'Gi', 'Gd']; }
    static get tables() { return { kp: TABLE_KP_KI, ki: TABLE_KP_KI, kd: TABLE_KD }; }

    /** Build the paper's FIS: 7 triangular MFs per input, 7 Gaussian MFs per output, product-sum + centroid. */
    static buildFIS(o = {}) {
      const s = new FuzzySystem({ type: 'mamdani', and: 'prod', or: 'probsum', implication: 'prod', aggregation: 'sum', defuzz: 'centroid' });
      s.addInput('e', o.eRange || [-1, 1]).addTerms(IN_LABELS, 'trimf');
      s.addInput('de', o.deRange || [-10, 10]).addTerms(IN_LABELS, 'trimf');
      s.addOutput('kp', o.kpRange || [0.2, 0.7]).addTerms(OUT_LABELS, 'gaussmf');
      s.addOutput('ki', o.kiRange || [0.001, 0.01]).addTerms(OUT_LABELS, 'gaussmf');
      s.addOutput('kd', o.kdRange || [0.1, 0.15]).addTerms(OUT_LABELS, 'gaussmf');
      s.addRuleTable({ rows: 'de', cols: 'e', tables: { kp: TABLE_KP_KI, ki: TABLE_KP_KI, kd: TABLE_KD } });
      return s;
    }

    /** scaling as array [kpe,kde,Gp,Gi,Gd] (GA chromosome slice) or object */
    setScaling(s) {
      if (Array.isArray(s) || ArrayBuffer.isView(s)) FuzzyPID.SCALING_KEYS.forEach((k, i) => { this.scaling[k] = s[i]; });
      else Object.assign(this.scaling, s);
      return this;
    }
    getScaling() { return FuzzyPID.SCALING_KEYS.map(k => this.scaling[k]); }

    reset() { this._int = 0; this._prevE = 0; this._de = 0; this._first = true; this.last = null; return this; }

    /** Scheduled gains for a given error / error-rate. */
    gains(e, de) {
      const S = this.scaling;
      const g = this.fis.evaluate([e * S.kpe, de * S.kde]);
      return { kp: g.kp, ki: g.ki, kd: g.kd, Kp: S.Gp * g.kp, Ki: S.Gi * g.ki, Kd: S.Gd * g.kd };
    }

    /** One controller update. e = ref - measurement. Returns the (saturated) control signal. */
    step(e, dt) {
      dt = dt || this.dt;
      if (!(dt > 0)) throw new Error('FuzzyPID.step needs dt > 0 (pass it or set options.dt)');
      let de = this._first ? 0 : (e - this._prevE) / dt;
      if (this.derivativeTau > 0) de = this._de + (dt / (this.derivativeTau + dt)) * (de - this._de);
      this._de = de; this._prevE = e; this._first = false;

      const g = this.gains(e, de);
      const lim = this.integralLimit;
      const inc = e * dt;
      this._int = clamp(this._int + inc, -lim, lim);
      const u = g.Kp * e + g.Ki * this._int + g.Kd * de;
      const us = clamp(u, this.outLimits[0], this.outLimits[1]);
      if (us !== u && e * u > 0) this._int -= inc; // conditional integration (anti-windup)
      this.last = { u: us, e, de, integral: this._int, gains: g };
      return us;
    }
  }

  return {
    version: '0.1.0',
    MF, evalMF, FuzzyVariable, FuzzySystem, FuzzyPID, parseRule,
    presets: { IN_LABELS, OUT_LABELS, TABLE_KD, TABLE_KP_KI },
  };
});
