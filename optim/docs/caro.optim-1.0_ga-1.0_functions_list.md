# CaroLab Genetic Algorithm Library

- **Name:** ga-1.0.js
- **Release Date:** 28 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Real-Coded Genetic Algorithm Optimization](#a-primary-library-for-real-coded-genetic-algorithm-optimization)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
   - [Debugging Programs](#debugging-programs)
3. [CaroLab GA Library — Functions List](#carolab-ga-library--functions-list)
4. [Detail Description](#detail-description)
   - [Options (DEFAULTS)](#options-defaults)
   - [RNG — Seeded Random Number Generator](#rng--seeded-random-number-generator)
   - [GA — Construction & Control](#ga--construction--control)
   - [GA — Running an Optimization](#ga--running-an-optimization)
   - [GA — One-Liner Helpers](#ga--one-liner-helpers)
   - [Result & Callback Objects](#result--callback-objects)
   - [Module-Level Functions & Exports](#module-level-functions--exports)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Real-Coded Genetic Algorithm Optimization

`ga.js` is a dependency-free, UMD-wrapped **real-coded genetic algorithm** built around a single **`GA`** class, plus a small seeded random number generator, **`RNG`**. A chromosome is an array of bounded real numbers (optionally with some genes forced to integers); the user supplies a fitness function `fitness(x) → number`, and the algorithm evolves a population toward the minimum (default) or maximum of that function.

The `GA` object is configured once through an options object (population size, bounds, selection/crossover/mutation operators, stopping rules, seed, …); `run()` (synchronous) or `runAsync()` (asynchronous fitness, with controllable concurrency) then executes the optimization and returns a single result object.

The library covers five broad areas:

| Area | Examples |
|---|---|
| Selection operators | `tournament`, `roulette`, `rank`, `sus` (stochastic universal sampling) |
| Crossover operators | `blx`, `arithmetic`, `sbx`, `onepoint`, `twopoint`, `uniform` |
| Mutation operators | `gaussian` (with shrinking step size), `uniform` |
| Population control | elitism, integer genes, initial population / initial guess, seeded RNG (reproducible runs) |
| Stopping rules | generation limit, stall, time limit, target fitness, `onGeneration()` callback, `ga.stop()` |

Additional characteristics:

- **Minimizes by default** (`maximize: true` flips it). A non-finite fitness value (`NaN`, `±Infinity`, non-numeric) is treated as the **worst** possible value, so a failing evaluation never wins.
- **Constraints** are handled by returning a penalty from the fitness function (e.g. `cost + 1e6 * violation`).
- **Reproducibility:** a fixed `seed` makes a run repeatable; the seed actually used is always reported in the result.
- **Async support:** `runAsync()` accepts a fitness function returning a `Promise`, evaluates up to `concurrency` individuals at once, and yields to the event loop after every generation.

The library has no external dependencies, is UMD-wrapped (CommonJS `module.exports`, or a `GALib` global), and runs unmodified in a browser `<script>` tag or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/ga.js"></script>
<script>
  const { GA } = GALib;
  const ga = new GA({ nVars: 2, lb: [-5, -5], ub: [5, 5],
                      populationSize: 60, generations: 100, seed: 1 });
  const r = ga.run(x => x[0] * x[0] + x[1] * x[1]);
  console.log('Best x:', r.x, 'fitness:', r.fitness);
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const { GA } = require('./ga.js');

const ga = new GA({ nVars: 2, lb: [-5, -5], ub: [5, 5],
                    populationSize: 60, generations: 100, seed: 1 });
const r = ga.run(x => x[0] * x[0] + x[1] * x[1]);

console.log('Best x:', r.x, 'fitness:', r.fitness);
```

Then run it by node.js:

```
node program1.js
```

MATLAB-style one-call form:

```javascript
const { optimize } = require('./ga.js');

const r = optimize(x => x[0] * x[0] + x[1] * x[1], 2, -5, 5, { generations: 100, seed: 1 });
```

Asynchronous fitness (e.g. a fitness that runs a simulation or calls a service):

```javascript
const { GA } = require('./ga.js');

const ga = new GA({ nVars: 3, lb: 0, ub: 10, concurrency: 4, generations: 50 });
ga.runAsync(async x => await simulate(x)).then(r => console.log(r.x, r.fitness));
```

> **Note on usage:** the search space and all algorithm settings are supplied once, to the `GA` **constructor** (`new GA(options)`); the fitness function is supplied to `run(fitness)` / `runAsync(fitness)`, which take **only the fitness function** and no other data. Fitness functions receive a plain `number[]` chromosome `x` and return a number (or a `Promise<number>` for `runAsync`). The `GA` object holds no population between runs — each call to `run`/`runAsync` starts a fresh optimization from the configured options.

### Debugging Programs

- The constructor performs **no validation** — it only merges `options` over `DEFAULTS`. All validation happens at the start of `run()`/`runAsync()` (inside the internal `_begin`), so configuration errors surface when the run starts, not when the `GA` is constructed.
- `_begin` throws `GA: nVars is required` if the number of genes cannot be determined (`nVars` missing and neither `lb` nor `ub` is an array); `GA: lb/ub length must equal nVars` if an array bound has the wrong length; and `GA: ub < lb at gene <i>` if any upper bound is below its lower bound.
- Unknown operator names are detected **lazily**, on first use, and throw `GA: unknown selection "<kind>"`, `GA: unknown crossover "<name>"`, or `GA: unknown mutation "<name>"`. Because operators are first used when the second generation is bred, the initial population is evaluated (and `onGeneration` fires for generation 0) **before** such an error is raised — check spelling of operator names in advance.
- A fitness value that is not a finite number is **not** an error: it is stored as the worst possible cost (`+Infinity`), so the individual simply loses every comparison. If the whole population returns non-finite values the run continues but yields no useful result — check the fitness function if `r.fitness` is `NaN`/`Infinity`.
- With `maximize: true`, the algorithm internally minimizes `−fitness`; everything reported to the user (`fitness`, `history.best`, `fitnesses`, `onGeneration`'s `best`) stays in the **original, un-negated** units.
- `onGeneration` is called once per generation, **including generation 0** (the freshly evaluated initial population). Returning exactly `true` stops the run with `reason: 'onGeneration'`; any other return value (including a truthy non-`true` value) is ignored.
- `stop()` is honored only at the end of the current generation (after evaluation of that generation completes); it is most useful with `runAsync`, since a synchronous `run()` cannot be interrupted from outside. Note that `_begin` resets the stop flag, so calling `stop()` **before** `run`/`runAsync` starts has no effect.
- The stopping conditions are checked in a fixed priority order: `onGeneration` → `stopped` → `fitnessLimit` → `stall` → `timeLimit` → `generations`. The first one that applies becomes `result.reason`.
- The generation counter starts at `0`, so a run configured with `generations: N` evaluates **N + 1** populations (generations `0…N`) before stopping with `reason: 'generations'`.
- Elite individuals are copied unchanged into the next generation together with their already-computed fitness, so they are **not re-evaluated**; this is why `result.evaluations` is smaller than `populationSize × (generations + 1)`.
- If `integer` is given as an array, it is interpreted as a **boolean mask** only when its length equals `nVars` and every entry is a boolean; otherwise it is treated as a list of **gene indices** to round.
- For reproducible runs set `seed`; two runs with the same seed, options and (deterministic) fitness function produce identical results. When `seed` is omitted, a random seed is generated and reported as `result.seed`, so any run can be reproduced afterwards by passing that value back in.

---

## CaroLab GA Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `DEFAULTS` | Default option values merged under every user-supplied options object |
| 2 | `new RNG` | Seeded pseudo-random number generator (mulberry32) |
| 3 | `RNG.next` | Uniform random number in `[0, 1)` |
| 4 | `RNG.range` | Uniform random number in `[a, b)` |
| 5 | `RNG.int` | Uniform random integer in `[0, n)` |
| 6 | `RNG.gauss` | Standard-normal random number (Box–Muller, with caching) |
| 7 | `new GA` | Constructs a real-coded genetic algorithm from an options object |
| 8 | `GA.stop` | Requests a running (async) optimization to finish after the current generation |
| 9 | `GA.run` | Synchronous optimization; fitness returns a number |
| 10 | `GA.runAsync` | Asynchronous optimization; fitness may return a Promise |
| 11 | `GA.minimize` | Static one-liner: minimize a function over given bounds |
| 12 | `GA.maximize` | Static one-liner: maximize a function over given bounds |
| 13 | `optimize` | MATLAB-style one-call function: `optimize(fitness, nVars, lb, ub, options)` |

*(Internal-only methods — `_begin`, `_fix`, `_setCost`, `_evalAll`, `_evalAllAsync`, `_after`, `_selector`, `_crossover`, `_mutate`, `_breed`, `_result` — are listed separately under [Internal Helpers](#internal-helpers), as they are not part of the public API. The module also exports a `version` string, `'0.1.0'`.)*

---

## Detail Description

### Options (DEFAULTS)

- **Function:** `DEFAULTS`
  **Description:** The default value of every option. Any key supplied to `new GA(options)` overrides the matching default. Exported as `GALib.DEFAULTS` for inspection.
  **Syntax:** `const { DEFAULTS } = require('./ga.js');`
  **Output Arguments:** `DEFAULTS`: plain object, described below

**Problem definition**

| Option | Default | Description |
|---|---|---|
| `nVars` | `undefined` | Number of genes (decision variables). May be omitted if `lb` or `ub` is an array (its length is used); otherwise required |
| `lb`, `ub` | `0`, `1` | Lower / upper bounds — a scalar applied to every gene, or an array of length `nVars` |
| `integer` | `false` | `true` (all genes integer), an array of gene indices, or a boolean mask of length `nVars`; integer genes are rounded and then clamped to bounds |
| `maximize` | `false` | If `true`, the fitness is maximized instead of minimized |

**Population & initialization**

| Option | Default | Description |
|---|---|---|
| `populationSize` | `50` | Number of individuals (forced to at least `4`) |
| `initialPopulation` | `null` | Array of chromosomes to seed generation 0 with (the rest is filled randomly) |
| `initialGuess` | `null` | One chromosome, or an array of chromosomes, added to generation 0 after `initialPopulation`; if the population is already full the surplus is ignored |
| `eliteCount` | `undefined` | Number of best individuals copied unchanged into the next generation; default `max(1, round(5 % of population))`, capped at `populationSize − 1` |

**Selection**

| Option | Default | Description |
|---|---|---|
| `selection` | `'tournament'` | `'tournament'` \| `'roulette'` \| `'rank'` \| `'sus'` |
| `tournamentSize` | `3` | Number of contestants per tournament (forced to at least `2`) |

**Crossover**

| Option | Default | Description |
|---|---|---|
| `crossover` | `'blx'` | `'blx'` \| `'arithmetic'` \| `'sbx'` \| `'onepoint'` \| `'twopoint'` \| `'uniform'` |
| `crossoverFraction` | `0.8` | Probability that a selected pair is recombined; otherwise the two parents are copied |
| `blxAlpha` | `0.3` | Interval-extension factor for BLX-α crossover |
| `sbxEta` | `15` | Distribution index for simulated binary crossover (larger → children closer to parents) |

**Mutation**

| Option | Default | Description |
|---|---|---|
| `mutation` | `'gaussian'` | `'gaussian'` \| `'uniform'` |
| `mutationRate` | `undefined` | Per-gene mutation probability; default `1 / nVars` |
| `mutationScale` | `0.1` | Gaussian σ as a fraction of the gene's range `(ub − lb)` |
| `mutationShrink` | `0.7` | Gaussian σ is multiplied by `1 − mutationShrink · gen / generations`, so mutations shrink as the run progresses |

**Stopping & control**

| Option | Default | Description |
|---|---|---|
| `generations` | `100` | Maximum generation index |
| `stallGenerations` | `Infinity` | Stop after this many consecutive generations without improvement |
| `tolerance` | `1e-12` | Improvement smaller than this counts as "no improvement" for the stall counter |
| `timeLimit` | `Infinity` | Wall-clock limit, in seconds |
| `fitnessLimit` | `undefined` | Stop as soon as the best fitness reaches this value (`≤` when minimizing, `≥` when maximizing) |
| `onGeneration` | `null` | Callback `(info) => boolean`; return `true` to stop |
| `concurrency` | `1` | `runAsync` only: number of fitness evaluations in flight at once |
| `seed` | `undefined` | Seed for the random number generator; omit for a random seed |

---

### RNG — Seeded Random Number Generator

A small, fast, seedable generator (mulberry32) used by the GA for every random decision, which is what makes a run reproducible. Exported as `GALib.RNG` and usable standalone.

- **Function:** `new RNG(seed)`
  **Description:** Creates a generator. If `seed` is `undefined`/`null`, a seed is derived from the current time and `Math.random()`. The seed actually used is stored on the instance.
  **Syntax:** `const rng = new RNG(seed);`
  **Input Arguments:** `seed`: integer (coerced to an unsigned 32-bit value), or omitted
  **Output Arguments:** `rng`: `RNG` instance, with `rng.seed`

- **Function:** `next`
  **Description:** Returns the next uniform pseudo-random number in `[0, 1)`.
  **Syntax:** `u = rng.next();`
  **Output Arguments:** `u`: float value in `[0, 1)`

- **Function:** `range`
  **Description:** Uniform random number between two bounds.
  **Syntax:** `v = rng.range(a, b);`
  **Input Arguments:** `a`, `b`: lower and upper limits
  **Output Arguments:** `v`: float value in `[a, b)`
  **Formula:** `v = a + (b − a) · next()`

- **Function:** `int`
  **Description:** Uniform random integer.
  **Syntax:** `k = rng.int(n);`
  **Input Arguments:** `n`: positive integer
  **Output Arguments:** `k`: integer in `[0, n − 1]`

- **Function:** `gauss`
  **Description:** Standard-normal (mean 0, standard deviation 1) random number via the Box–Muller transform. Each transform produces two values; the second is cached and returned by the following call.
  **Syntax:** `g = rng.gauss();`
  **Output Arguments:** `g`: float value

---

### GA — Construction & Control

- **Function:** `new GA(options)`
  **Description:** Creates a genetic algorithm. The `options` object is merged over `DEFAULTS` (see [Options (DEFAULTS)](#options-defaults)); no validation is done until a run starts.
  **Syntax:** `const ga = new GA(options);`
  **Input Arguments:** `options`: object of settings, all optional individually but `nVars` (or array-valued `lb`/`ub`) must be determinable at run time
  **Output Arguments:** `ga`: `GA` instance, with `ga.opts` (the merged options)
  **Coding Example:**
  ```javascript
  const ga = new GA({
    nVars: 5, lb: -10, ub: 10,
    populationSize: 80, generations: 200,
    selection: 'tournament', crossover: 'sbx', mutation: 'gaussian',
    stallGenerations: 30, seed: 42
  });
  ```

- **Function:** `stop`
  **Description:** Asks a running optimization to finish. The run ends after the current generation has been evaluated, with `reason: 'stopped'`. Intended for use from other code while `runAsync` is in progress (e.g. a UI "Stop" button).
  **Syntax:** `ga.stop();`

---

### GA — Running an Optimization

Both runners execute the same evolutionary loop — **evaluate → record statistics / test stopping rules → breed next generation** — and return the same result object (see [Result & Callback Objects](#result--callback-objects)).

- **Function:** `run`
  **Description:** Synchronous optimization. Builds and evaluates the initial population, then repeatedly breeds and evaluates new generations until a stopping rule fires. Breeding keeps the `eliteCount` best individuals, selects parents with the chosen selection method, recombines them with probability `crossoverFraction`, mutates the children, and clamps/rounds every gene to its bounds and integer flags.
  **Syntax:** `result = ga.run(fitness);`
  **Input Arguments:** `fitness`: function `(x: number[]) → number`; a non-finite return counts as the worst fitness
  **Output Arguments:** `result`: result object (`x`, `fitness`, `generations`, `evaluations`, `reason`, `seed`, `elapsedMs`, `history`, `population`, `fitnesses`)
  **Errors:** `GA: nVars is required`; `GA: lb/ub length must equal nVars`; `GA: ub < lb at gene <i>`; `GA: unknown selection "<kind>"`; `GA: unknown crossover "<name>"`; `GA: unknown mutation "<name>"`
  **Coding Example:**
  ```javascript
  const sphere = x => x.reduce((s, v) => s + v * v, 0);
  const r = new GA({ nVars: 4, lb: -5, ub: 5, seed: 1 }).run(sphere);
  console.log(r.x, r.fitness, r.reason);
  ```

- **Function:** `runAsync`
  **Description:** Asynchronous optimization for fitness functions that return a `Promise` (simulations, network calls, workers). Uncomputed individuals are evaluated in batches of `concurrency` using `Promise.all`, and control is yielded to the event loop (`setTimeout(…, 0)`) after every generation, so a UI stays responsive and `ga.stop()` can take effect.
  **Syntax:** `result = await ga.runAsync(fitness);`
  **Input Arguments:** `fitness`: function `(x: number[]) → number | Promise<number>`
  **Output Arguments:** `Promise<result>`: resolves to the same result object as `run`
  **Errors:** same as `run` (a rejected Promise inside `fitness` rejects the whole `runAsync`)
  **Coding Example:**
  ```javascript
  const ga = new GA({ nVars: 3, lb: 0, ub: 1, concurrency: 8, generations: 40 });
  const r = await ga.runAsync(async x => await runSimulation(x));
  ```

**Operators available to `run`/`runAsync`**

| Group | Name | Description |
|---|---|---|
| Selection | `tournament` | Picks `tournamentSize` random individuals and returns the best of them |
| Selection | `roulette` | Fitness-proportionate: weight = distance from the worst cost plus a small offset (5 % of the cost span); non-finite individuals get weight 0 |
| Selection | `rank` | Weight depends only on rank (best gets `N`, worst gets `1`) |
| Selection | `sus` | Stochastic universal sampling — one spin, evenly spaced pointers over the same weights as `roulette`, then shuffled |
| Crossover | `blx` | BLX-α: each child gene drawn uniformly from the parents' interval extended by `blxAlpha` on both sides |
| Crossover | `arithmetic` | Child genes are a random convex combination of the parents' genes |
| Crossover | `sbx` | Simulated binary crossover controlled by `sbxEta` |
| Crossover | `onepoint` | Swaps gene tails after a random cut point |
| Crossover | `twopoint` | Swaps the gene segment between two random cut points |
| Crossover | `uniform` | Each gene is swapped between parents with probability 0.5 |
| Mutation | `gaussian` | Adds `N(0, σ²)` noise, with `σ = mutationScale · shrink · (ub − lb)` and `shrink` decreasing over the run |
| Mutation | `uniform` | Replaces the gene with a fresh uniform random value in its bounds |

---

### GA — One-Liner Helpers

- **Function:** `GA.minimize`
  **Description:** Static convenience — builds a `GA` with `maximize: false`, the given bounds and options, runs it synchronously, and returns the result.
  **Syntax:** `result = GA.minimize(fn, lb, ub, opts);`
  **Input Arguments:** `fn`: fitness function; `lb`, `ub`: bounds (arrays, or scalars if `opts.nVars` is given); `opts`: further options (default `{}`)
  **Output Arguments:** `result`: result object

- **Function:** `GA.maximize`
  **Description:** Same as `GA.minimize`, but with `maximize: true`.
  **Syntax:** `result = GA.maximize(fn, lb, ub, opts);`
  **Input Arguments:** `fn`: fitness function; `lb`, `ub`: bounds; `opts`: further options (default `{}`)
  **Output Arguments:** `result`: result object
  **Coding Example:**
  ```javascript
  const r = GA.maximize(x => -(x[0] - 1) ** 2 - (x[1] + 2) ** 2, [-5, -5], [5, 5], { seed: 3 });
  ```

---

### Result & Callback Objects

**Result object** returned by `run` / `runAsync`:

| Field | Description |
|---|---|
| `x` | Best chromosome found (array of length `nVars`) |
| `fitness` | Fitness value of `x`, in the caller's original units (un-negated when maximizing) |
| `generations` | Index of the last generation processed |
| `evaluations` | Total number of fitness evaluations performed |
| `reason` | Why the run stopped: `'generations'` \| `'stall'` \| `'timeLimit'` \| `'fitnessLimit'` \| `'onGeneration'` \| `'stopped'` |
| `seed` | Seed used by the random number generator (pass it back in to reproduce the run) |
| `elapsedMs` | Elapsed wall-clock time in milliseconds |
| `history` | `{ generation: [...], best: [...], mean: [...] }` — best and mean fitness of every generation (for convergence plots) |
| `population` | Final population, as an array of chromosomes (best first) |
| `fitnesses` | Fitness values of the final population, aligned with `population` |

**`onGeneration(info)` callback argument**, invoked once per generation (including generation 0):

| Field | Description |
|---|---|
| `generation` | Current generation index |
| `best` | Best fitness so far |
| `bestX` | Copy of the best chromosome so far |
| `mean` | Mean fitness of the current population (over finite values) |
| `evaluations` | Evaluations performed so far |
| `population` | Copy of the current population's chromosomes (best first) |
| `stall` | Number of consecutive generations without improvement |

---

### Module-Level Functions & Exports

- **Function:** `optimize`
  **Description:** MATLAB-style one-call interface: builds a `GA` from `nVars`, `lb`, `ub` and an options object, and runs it synchronously.
  **Syntax:** `result = optimize(fitness, nVars, lb, ub, options);`
  **Input Arguments:** `fitness`: function `(x: number[]) → number`; `nVars`: number of genes; `lb`, `ub`: scalar or array bounds; `options`: further options (default `{}`; `nVars`, `lb`, `ub` given as arguments take precedence)
  **Output Arguments:** `result`: result object
  **Coding Example:**
  ```javascript
  const r = optimize(x => Math.abs(x[0]) + Math.abs(x[1]), 2, -3, 3, { seed: 7, generations: 60 });
  ```

- **Function:** `version`, `GA`, `RNG`, `optimize`, `DEFAULTS`
  **Description:** The module's exports: `{ version: '0.1.0', GA, RNG, optimize, DEFAULTS }`.
  **Syntax:** `const { GA, RNG, optimize, DEFAULTS, version } = require('./ga.js');` — or, in a browser, `GALib.GA`, `GALib.RNG`, …

---

### Internal Helpers

These are implementation details, not part of the public API, but documented here for maintainers extending the library.

| Function | Description |
|---|---|
| `GA#_begin()` | Validates options, resolves `nVars`/bounds/integer flags, computes population size, elite count and mutation rate, creates the `RNG`, seeds the initial population from `initialPopulation`/`initialGuess`, fills the remainder uniformly at random, and returns the run-state object `st` (`pop`, `best`, `history`, counters…). Resets the stop flag |
| `GA#_fix(st, x)` | Repairs a chromosome in place: rounds integer genes, then clamps every gene to `[lb, ub]` |
| `GA#_setCost(st, ind, v)` | Records a fitness value on an individual: stores the raw `value`, converts it to an internal minimization `cost` (negated when maximizing, `+Infinity` when non-finite), and increments the evaluation counter |
| `GA#_evalAll(st, fit)` | Synchronously evaluates every individual that has no cost yet (elites keep theirs) |
| `GA#_evalAllAsync(st, fit)` | Same as `_evalAll`, but evaluates in `Promise.all` batches of size `concurrency` |
| `GA#_after(st)` | End-of-generation bookkeeping: sorts the population best-first, updates the best-so-far and stall counter, appends to `history`, calls `onGeneration`, and tests all stopping rules in priority order; returns `true` when the run should end |
| `GA#_selector(st)` | Builds and returns a zero-argument function that yields parent indices according to `selection` (tournament, roulette, rank, or SUS pool); throws `GA: unknown selection "<kind>"` for an unknown name |
| `GA#_crossover(st, a, b)` | Recombines two parent chromosomes into two children using the chosen `crossover` operator; throws `GA: unknown crossover "<name>"` for an unknown name |
| `GA#_mutate(st, x)` | Mutates a chromosome in place, gene by gene with probability `mutationRate`, using the chosen `mutation` operator and the shrinking Gaussian σ; throws `GA: unknown mutation "<name>"` for an unknown name |
| `GA#_breed(st)` | Produces the next generation: copies elites (with their fitness), then repeatedly selects two parents, recombines (or copies) them, mutates and repairs the children until the population is full; increments the generation counter |
| `GA#_result(st)` | Assembles the public result object from the run state |

---
