 /* =========================================================
 *  CaroLab - Genetic Algorithm Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 *
 * caro.ga-1.0.js v0.1.0 — dependency-free real-coded genetic algorithm (Node / browser)
 *
 *  - Bounded real-valued chromosomes (+ optional integer genes)
 *  - Selection: tournament | roulette | rank | sus
 *  - Crossover: blx | arithmetic | sbx | onepoint | twopoint | uniform
 *  - Mutation: gaussian (shrinking) | uniform
 *  - Elitism, initial population / guess, seeded RNG (reproducible runs)
 *  - Stops on: generations, stall, time limit, target fitness, onGeneration() -> true, ga.stop()
 *  - Sync run() and async runAsync() (async fitness, concurrency, keeps the event loop alive)
 *  - Minimizes by default (maximize:true to flip). Non-finite fitness counts as worst.
 *
 * Quick start:
 *   const { GA } = require('./caro.ga-1.0.js');
 *   const ga = new GA({ nVars: 2, lb: [-5, -5], ub: [5, 5], populationSize: 60, generations: 100, seed: 1 });
 *   const r = ga.run(x => x[0]*x[0] + x[1]*x[1]);
 *   console.log(r.x, r.fitness);
 *
 * MATLAB-like:  const r = ga.optimize(fitnessFn, nVars, lb, ub, options)   // see exports
 * Constraints: return a penalty from your fitness function (e.g. cost + 1e6*violation).
 *
 * ========================================================= */
 
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GALib = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- seeded RNG (mulberry32) ---------- */
  class RNG {
    constructor(seed) {
      if (seed === undefined || seed === null) seed = (Date.now() ^ (Math.random() * 4294967296)) >>> 0;
      this.seed = seed >>> 0;
      this.s = this.seed | 0;
      this._g = null;
    }
    next() {
      this.s = (this.s + 0x6D2B79F5) | 0;
      let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(a, b) { return a + (b - a) * this.next(); }
    int(n) { return Math.floor(this.next() * n); }
    gauss() {
      if (this._g !== null) { const g = this._g; this._g = null; return g; }
      let u = 0, v = 0;
      while (u === 0) u = this.next();
      v = this.next();
      const r = Math.sqrt(-2 * Math.log(u));
      this._g = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    }
  }

  const DEFAULTS = {
    nVars: undefined,
    lb: 0, ub: 1,                 // scalars or arrays of length nVars
    populationSize: 50,
    generations: 100,
    eliteCount: undefined,        // default: max(1, round(5% of population))
    crossoverFraction: 0.8,       // probability a pair is recombined
    crossover: 'blx',             // blx | arithmetic | sbx | onepoint | twopoint | uniform
    blxAlpha: 0.3,
    sbxEta: 15,
    selection: 'tournament',      // tournament | roulette | rank | sus
    tournamentSize: 3,
    mutation: 'gaussian',         // gaussian | uniform
    mutationRate: undefined,      // per-gene probability, default 1/nVars
    mutationScale: 0.1,           // gaussian sigma as a fraction of (ub-lb)
    mutationShrink: 0.7,          // sigma is scaled by (1 - shrink*gen/generations)
    integer: false,               // true | [gene indices] | boolean[]
    initialPopulation: null,      // array of chromosomes
    initialGuess: null,           // one chromosome (or array of them) seeded into gen 0
    maximize: false,
    stallGenerations: Infinity,   // stop after this many generations without improvement
    tolerance: 1e-12,             // improvement smaller than this counts as "no improvement"
    timeLimit: Infinity,          // seconds
    fitnessLimit: undefined,      // stop when best reaches this (<= for minimize, >= for maximize)
    concurrency: 1,               // runAsync: evaluations in flight at once
    seed: undefined,
    onGeneration: null,           // (info) => true to stop
  };

  const worse = Number.POSITIVE_INFINITY;

  class GA {
    constructor(opts = {}) {
      this.opts = Object.assign({}, DEFAULTS, opts);
      this._stop = false;
    }

    /** Ask a running (async) optimisation to finish after the current generation. */
    stop() { this._stop = true; }

    /* ---------------- setup ---------------- */
    _begin() {
      const o = this.opts;
      let n = o.nVars;
      if (n === undefined) {
        if (Array.isArray(o.lb)) n = o.lb.length;
        else if (Array.isArray(o.ub)) n = o.ub.length;
      }
      if (!(n >= 1)) throw new Error('GA: nVars is required');
      const lb = Array.isArray(o.lb) ? o.lb.slice() : new Array(n).fill(o.lb);
      const ub = Array.isArray(o.ub) ? o.ub.slice() : new Array(n).fill(o.ub);
      if (lb.length !== n || ub.length !== n) throw new Error('GA: lb/ub length must equal nVars');
      for (let i = 0; i < n; i++) if (!(ub[i] >= lb[i])) throw new Error('GA: ub < lb at gene ' + i);

      let isInt = new Array(n).fill(false);
      if (o.integer === true) isInt.fill(true);
      else if (Array.isArray(o.integer)) {
        if (o.integer.length === n && o.integer.every(v => typeof v === 'boolean')) isInt = o.integer.slice();
        else o.integer.forEach(i => { isInt[i] = true; });
      }

      const popSize = Math.max(4, o.populationSize | 0);
      const st = {
        n, lb, ub, isInt, popSize,
        elite: Math.min(popSize - 1, o.eliteCount !== undefined ? o.eliteCount : Math.max(1, Math.round(0.05 * popSize))),
        pm: o.mutationRate !== undefined ? o.mutationRate : 1 / n,
        rng: new RNG(o.seed),
        gen: 0, evals: 0, t0: Date.now(),
        pop: [], best: null, bestCost: worse, stall: 0,
        history: { generation: [], best: [], mean: [] },
        reason: null, done: false,
      };
      this._stop = false;

      // initial population
      const seedX = [];
      if (o.initialPopulation) for (const x of o.initialPopulation) seedX.push(x);
      if (o.initialGuess) {
        if (Array.isArray(o.initialGuess[0])) for (const x of o.initialGuess) seedX.push(x);
        else seedX.push(o.initialGuess);
      }
      for (const x of seedX) if (st.pop.length < popSize) st.pop.push({ x: this._fix(st, x.slice()), cost: undefined });
      while (st.pop.length < popSize) {
        const x = new Array(n);
        for (let i = 0; i < n; i++) x[i] = st.rng.range(lb[i], ub[i]);
        st.pop.push({ x: this._fix(st, x), cost: undefined });
      }
      return st;
    }

    _fix(st, x) { // clamp + round integer genes
      for (let i = 0; i < st.n; i++) {
        let v = x[i];
        if (st.isInt[i]) v = Math.round(v);
        x[i] = v < st.lb[i] ? st.lb[i] : v > st.ub[i] ? st.ub[i] : v;
      }
      return x;
    }

    _setCost(st, ind, v) {
      ind.value = v;
      let c = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(c)) c = worse;
      else if (this.opts.maximize) c = -c;
      ind.cost = c;
      st.evals++;
    }

    /* ---------------- evaluation ---------------- */
    _evalAll(st, fit) {
      for (const ind of st.pop) if (ind.cost === undefined) this._setCost(st, ind, fit(ind.x));
    }
    async _evalAllAsync(st, fit) {
      const todo = st.pop.filter(i => i.cost === undefined);
      const k = Math.max(1, this.opts.concurrency | 0);
      for (let i = 0; i < todo.length; i += k) {
        const batch = todo.slice(i, i + k);
        const vals = await Promise.all(batch.map(ind => fit(ind.x)));
        batch.forEach((ind, j) => this._setCost(st, ind, vals[j]));
      }
    }

    /* ---------------- bookkeeping after evaluating a generation ---------------- */
    _after(st) {
      const o = this.opts;
      st.pop.sort((a, b) => (a.cost < b.cost ? -1 : a.cost > b.cost ? 1 : 0));
      const b = st.pop[0];
      if (st.best === null || b.cost < st.bestCost - o.tolerance) { st.stall = 0; } else st.stall++;
      if (st.best === null || b.cost < st.bestCost) { st.best = { x: b.x.slice(), value: b.value, cost: b.cost }; st.bestCost = b.cost; }

      let sum = 0, cnt = 0;
      for (const i of st.pop) if (Number.isFinite(i.cost)) { sum += i.value; cnt++; }
      const mean = cnt ? sum / cnt : NaN;
      st.history.generation.push(st.gen);
      st.history.best.push(st.best.value);
      st.history.mean.push(mean);

      let stopNow = false;
      if (typeof o.onGeneration === 'function') {
        stopNow = o.onGeneration({
          generation: st.gen, best: st.best.value, bestX: st.best.x.slice(), mean,
          evaluations: st.evals, population: st.pop.map(i => i.x.slice()), stall: st.stall,
        }) === true;
      }
      if (stopNow) st.reason = 'onGeneration';
      else if (this._stop) st.reason = 'stopped';
      else if (o.fitnessLimit !== undefined && (o.maximize ? st.best.value >= o.fitnessLimit : st.best.value <= o.fitnessLimit)) st.reason = 'fitnessLimit';
      else if (st.stall >= o.stallGenerations) st.reason = 'stall';
      else if ((Date.now() - st.t0) / 1000 >= o.timeLimit) st.reason = 'timeLimit';
      else if (st.gen >= o.generations) st.reason = 'generations';
      st.done = st.reason !== null;
      return st.done;
    }

    /* ---------------- selection ---------------- */
    _selector(st) {
      const o = this.opts, rng = st.rng, pop = st.pop, N = pop.length; // pop sorted best-first
      const kind = o.selection;
      if (kind === 'tournament') {
        const k = Math.max(2, o.tournamentSize | 0);
        return () => { let m = N; for (let j = 0; j < k; j++) { const r = rng.int(N); if (r < m) m = r; } return m; };
      }
      // weights for roulette / rank / sus (index 0 = best)
      const w = new Array(N);
      if (kind === 'rank') for (let i = 0; i < N; i++) w[i] = N - i;
      else if (kind === 'roulette' || kind === 'sus') {
        let worst = 0;
        for (const i of pop) if (Number.isFinite(i.cost) && i.cost > worst) worst = i.cost;
        let best = pop[0].cost;
        if (!Number.isFinite(best)) best = 0;
        const span = worst - best;
        for (let i = 0; i < N; i++) w[i] = Number.isFinite(pop[i].cost) ? (span > 0 ? (worst - pop[i].cost) + 0.05 * span : 1) : 0;
      } else throw new Error('GA: unknown selection "' + kind + '"');
      let total = w.reduce((a, b) => a + b, 0);
      if (!(total > 0)) { w.fill(1); total = N; }
      const cum = []; let acc = 0;
      for (let i = 0; i < N; i++) { acc += w[i]; cum.push(acc); }
      const spin = r => { r *= total; let lo = 0, hi = N - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; } return lo; };
      if (kind === 'sus') {
        const pool = []; const step = total / N; let p = rng.next() * step;
        for (let i = 0; i < N; i++) pool.push(spin((p + i * step) / total));
        for (let i = N - 1; i > 0; i--) { const j = rng.int(i + 1); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
        let idx = 0; return () => pool[idx++ % N];
      }
      return () => spin(rng.next());
    }

    /* ---------------- variation ---------------- */
    _crossover(st, a, b) {
      const o = this.opts, rng = st.rng, n = st.n, lb = st.lb, ub = st.ub;
      const c1 = new Array(n), c2 = new Array(n);
      switch (o.crossover) {
        case 'blx': {
          for (let i = 0; i < n; i++) {
            const lo = Math.min(a[i], b[i]), hi = Math.max(a[i], b[i]), d = hi - lo;
            c1[i] = rng.range(lo - o.blxAlpha * d, hi + o.blxAlpha * d);
            c2[i] = rng.range(lo - o.blxAlpha * d, hi + o.blxAlpha * d);
          }
          break;
        }
        case 'arithmetic': {
          for (let i = 0; i < n; i++) {
            const l = rng.next();
            c1[i] = l * a[i] + (1 - l) * b[i];
            c2[i] = (1 - l) * a[i] + l * b[i];
          }
          break;
        }
        case 'sbx': {
          const eta = o.sbxEta;
          for (let i = 0; i < n; i++) {
            const u = rng.next();
            const beta = u <= 0.5 ? Math.pow(2 * u, 1 / (eta + 1)) : Math.pow(1 / (2 * (1 - u)), 1 / (eta + 1));
            c1[i] = 0.5 * ((1 + beta) * a[i] + (1 - beta) * b[i]);
            c2[i] = 0.5 * ((1 - beta) * a[i] + (1 + beta) * b[i]);
          }
          break;
        }
        case 'onepoint': case 'twopoint': {
          let p = rng.int(n), q = o.crossover === 'twopoint' ? rng.int(n) : n;
          if (p > q) { const t = p; p = q; q = t; }
          for (let i = 0; i < n; i++) {
            const swap = i >= p && i < q;
            c1[i] = swap ? b[i] : a[i]; c2[i] = swap ? a[i] : b[i];
          }
          break;
        }
        case 'uniform': {
          for (let i = 0; i < n; i++) {
            const swap = rng.next() < 0.5;
            c1[i] = swap ? b[i] : a[i]; c2[i] = swap ? a[i] : b[i];
          }
          break;
        }
        default: throw new Error('GA: unknown crossover "' + o.crossover + '"');
      }
      return [c1, c2];
    }

    _mutate(st, x) {
      const o = this.opts, rng = st.rng;
      const shrink = 1 - o.mutationShrink * Math.min(1, st.gen / Math.max(1, o.generations));
      for (let i = 0; i < st.n; i++) {
        if (rng.next() >= st.pm) continue;
        if (o.mutation === 'uniform') x[i] = rng.range(st.lb[i], st.ub[i]);
        else if (o.mutation === 'gaussian') x[i] += rng.gauss() * o.mutationScale * shrink * (st.ub[i] - st.lb[i]);
        else throw new Error('GA: unknown mutation "' + o.mutation + '"');
      }
    }

    _breed(st) {
      const o = this.opts, rng = st.rng;
      const pick = this._selector(st);
      const next = [];
      for (let i = 0; i < st.elite; i++) { const e = st.pop[i]; next.push({ x: e.x.slice(), cost: e.cost, value: e.value }); }
      while (next.length < st.popSize) {
        const pa = st.pop[pick()].x, pb = st.pop[pick()].x;
        let kids;
        if (rng.next() < o.crossoverFraction) kids = this._crossover(st, pa, pb);
        else kids = [pa.slice(), pb.slice()];
        for (const k of kids) {
          if (next.length >= st.popSize) break;
          this._mutate(st, k);
          next.push({ x: this._fix(st, k), cost: undefined });
        }
      }
      st.pop = next;
      st.gen++;
    }

    _result(st) {
      const b = st.best;
      return {
        x: b.x, fitness: b.value, generations: st.gen, evaluations: st.evals,
        reason: st.reason, seed: st.rng.seed, elapsedMs: Date.now() - st.t0,
        history: st.history,
        population: st.pop.map(i => i.x.slice()),
        fitnesses: st.pop.map(i => i.value),
      };
    }

    /* ---------------- public runners ---------------- */

    /** Synchronous run. fitness(x:number[]) -> number. */
    run(fitness) {
      const st = this._begin();
      for (;;) {
        this._evalAll(st, fitness);
        if (this._after(st)) break;
        this._breed(st);
      }
      return this._result(st);
    }

    /** Async run: fitness may return a Promise; yields to the event loop every generation. */
    async runAsync(fitness) {
      const st = this._begin();
      for (;;) {
        await this._evalAllAsync(st, fitness);
        if (this._after(st)) break;
        this._breed(st);
        await new Promise(r => setTimeout(r, 0));
      }
      return this._result(st);
    }

    /** ga.minimize(fn, lb, ub, opts) — one-liner */
    static minimize(fn, lb, ub, opts = {}) {
      return new GA(Object.assign({}, opts, { lb, ub, maximize: false })).run(fn);
    }
    static maximize(fn, lb, ub, opts = {}) {
      return new GA(Object.assign({}, opts, { lb, ub, maximize: true })).run(fn);
    }
  }

  /** MATLAB-style: optimize(fitness, nVars, lb, ub, options) -> result */
  function optimize(fitness, nVars, lb, ub, options = {}) {
    return new GA(Object.assign({}, options, { nVars, lb, ub })).run(fitness);
  }

  return { version: '0.1.0', GA, RNG, optimize, DEFAULTS };
});
