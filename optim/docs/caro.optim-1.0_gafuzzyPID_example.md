# CaroLab Genetic Algorithm Library — Examples Manual

- **Name:** caro.ga-1.0.js
- **Release Date:** 29 September 2026
- **Document Name:** Genetic Algorithm Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — GA-Tuned Fuzzy PID on a Quadrotor Altitude Channel (`gafpid_demo.js`)](#example-1--ga-tuned-fuzzy-pid-on-a-quadrotor-altitude-channel-gafpid_demojs)
4. [What the Example Proves](#what-the-example-proves)
5. [Extending the Example](#extending-the-example)
6. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the first for the **CaroLab genetic algorithm library** — `caro.ga-1.0.js`, a dependency-free real-coded GA. It is the optimizer companion to the CaroLab control libraries: when you have a controller with a handful of numeric parameters that are tedious to tune by hand (PID gains, fuzzy scaling factors, membership function parameters), the GA finds them for you.

The library covers:

| Feature | Detail |
|---|---|
| Chromosome | Bounded real-valued array, optional integer genes |
| Selection | `tournament`, `roulette`, `rank`, `sus` |
| Crossover | `blx`, `arithmetic`, `sbx`, `onepoint`, `twopoint`, `uniform` |
| Mutation | `gaussian` (with shrinking), `uniform` |
| Elitism | Automatic (5% of population by default) |
| Constraints | Handled via penalty in the fitness function |
| Seeding | Initial population, initial guess, seeded RNG |
| Stop criteria | `generations`, `stallGenerations`, `timeLimit`, `fitnessLimit`, `onGeneration`, `ga.stop()` |
| Runners | Synchronous `run()`, asynchronous `runAsync()` with configurable concurrency |
| Objective | Minimizes by default; `maximize: true` flips the sign |

The single example in this manual uses the GA to tune the five scaling factors of a `FuzzyPID` controller on a quadrotor altitude channel, and compares the result against a hand-picked nominal scaling and a plain PID.

### Conventions

| Item | Convention |
|---|---|
| Chromosome | Array of numbers, length `nVars` |
| Bounds | `lb`, `ub` — arrays of length `nVars`, or scalars for all genes |
| Fitness function | `x → number`; the GA minimizes by default |
| Fitness value | Reported in the result as `fitness`; internally the GA stores `cost = −fitness` when maximizing |
| Constraints | Return a penalty from the fitness function (e.g. `cost + 1e6 * violation`) |
| Random seed | Integer for reproducibility; `undefined` uses a time-based seed |
| Result object | `{ x, fitness, generations, evaluations, reason, seed, elapsedMs, history, population, fitnesses }` |

All scripts use **CommonJS** (`require`).

### Required Files and Layout

```
project/
├── caro.ga-1.0.js
├── caro.fuzzy-1.0.js          (needed by the demo's FuzzyPID)
└── demo/
    └── gafpid_demo.js
```

The demo uses `require('./caro.ga-1.0.js')` and `require('./caro.fuzzy-1.0.js')`.

### How to Run the Demo

```
node demo/gafpid_demo.js            # quick run (pop 30, 25 generations)
node demo/gafpid_demo.js --full     # bigger GA (pop 60, 60 generations)
```

The demo runs the GA, prints progress every 5 generations, and then compares three controllers on the same plant.

### Why a Genetic Algorithm

Classical optimization — gradient descent, least squares, even convex solvers — works beautifully when you can differentiate the objective. But many control-tuning problems have:

- **No usable gradient.** The controller gain affects the plant through a nonlinear, hybrid, or simulated model. The gradient exists in theory but is expensive or noisy in practice.
- **Non-convex landscapes.** The cost surface of a fuzzy-PID tuning problem often has multiple local minima and broad plateaus.
- **Integer or categorical parameters.** Some control parameters are discrete (e.g. the number of terms in a fuzzy system, the sample rate). Gradients are undefined.
- **Multi-modal objectives.** You want a controller that does well on *several* scenarios, not just one — an objective that is naturally non-smooth.

For these problems, a **derivative-free** optimizer is the right tool. The two common families are:

1. **Local search methods** — Nelder-Mead, Powell, pattern search. Fast, but stuck in local minima.
2. **Population-based methods** — genetic algorithms, differential evolution, particle swarms. Slower, but global search.

The CaroLab GA is a **real-coded population-based method**. Real-coded (as opposed to binary-coded) means each gene is a floating-point number, not a bit string. This matters when the parameters have natural scales — e.g. `Kp = 10`, `Ki = 0.5`, `Kd = 30` — because the GA operates directly on the values, without the encoding round-trip.

The library is small enough to read in one sitting and flexible enough to handle most control-tuning problems you'll throw at it.

### The GA in One Paragraph

A GA maintains a population of candidate solutions. Each generation:

1. **Evaluate** the fitness of every candidate.
2. **Sort** the population, best first.
3. **Select** parents, biased toward the best candidates.
4. **Recombine** pairs of parents into children via crossover.
5. **Mutate** each child gene with some probability.
6. **Replace** the population with the new generation (plus elites).

Over generations, the population converges toward regions of low fitness cost. The GA stops when it hits a generation limit, exhausts a time budget, finds a target fitness, or stalls.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `gafpid_demo.js` | `GA` (constructor, `run`, `opts`), `FuzzyPID` (from `caro.fuzzy-1.0.js`) | Tune the 5 scaling factors of a fuzzy PID on a quadrotor altitude task, with a mass perturbation and gust disturbance |

---

## Example 1 — GA-Tuned Fuzzy PID on a Quadrotor Altitude Channel (`gafpid_demo.js`)

- **Purpose:** Show the full GA workflow applied to a real control problem. The GA tunes the five scaling factors `[kpe, kde, Gp, Gi, Gd]` of a `FuzzyPID` controller so that the quadrotor tracks a rising altitude reference in two scenarios: the nominal plant, and a perturbed plant (+25% mass, +0.15 N gust disturbance). The tuned controller is then compared against a hand-picked nominal scaling and a plain PID.
- **Source:** The full script is `gafpid_demo.js`. The key sections are:

```javascript
const { FuzzyPID } = require('./caro.fuzzy-1.0.js');
const { GA } = require('./caro.ga-1.0.js');

const P = { m: 1.0, g: 9.81, dt: 0.02, T: 25, uMin: -9.0, uMax: 15.0 };

// Hand-picked "nominal" scaling for the un-optimised FPID
const NOMINAL = { kpe: 1, kde: 1, Gp: 10, Gi: 10, Gd: 30 };

// GA problem: chromosome = [kpe, kde, Gp, Gi, Gd]
const LB = [0.1, 0.01, 0.0, 0.0, 0.0];
const UB = [5.0, 2.0, 100, 1000, 80];

const probe = mkFPID(NOMINAL);
function fitness(x) {
  probe.setScaling(x);
  const a = simulate(probe);                                   // nominal
  const b = simulate(probe, { massScale: 0.25, dist: 0.15 });  // +25% mass & gust
  return a.itae + b.itae;                                      // sum of two ITAE costs
}

const ga = new GA({
  nVars: 5, lb: LB, ub: UB,
  populationSize: 30, generations: 25,
  crossover: 'blx', selection: 'tournament', mutationScale: 0.15,
  initialGuess: [NOMINAL.kpe, NOMINAL.kde, NOMINAL.Gp, NOMINAL.Gi, NOMINAL.Gd],
  stallGenerations: 20, seed: 42,
  onGeneration: g => { if (g.generation % 5 === 0) console.log(`  gen ${g.generation}  best ITAE sum = ${g.best.toFixed(3)}`); },
});

const r = ga.run(fitness);
```

- **Classes and methods invoked:**
  - `new GA(opts)` — constructor.
  - `ga.run(fitness)` — synchronous run.
  - `ga.opts` — the resolved options object (with defaults merged in).
  - `FuzzyPID.setScaling(x)` and `FuzzyPID.reset()` from `caro.fuzzy-1.0.js` (called inside the simulation).

- **The plant and controller:**

  The plant is a 1-D quadrotor altitude model:

  ```
  z'' = U₁/m_true − g + d/m_true
  ```

  where `U₁ = m_nom·(g + u)` is the total thrust (gravity feed-forward plus the controller's acceleration command `u`). The nominal mass is 1 kg, gravity is 9.81 m/s². The reference is `z_r = 3 + t/4`, a rising ramp — the paper's helix altitude.

  Two scenarios are simulated for each candidate:
  - **Nominal:** `m_true = m_nom`, no disturbance.
  - **Perturbed:** `m_true = 1.25·m_nom` (25% heavier), with a 0.15 N disturbance applied between `t = 15 s` and `t = 20 s`.

  The cost for each scenario is **ITAE** — Integral of Time-weighted Absolute Error:

  ```
  ITAE = ∫ t·|e(t)| dt
  ```

  ITAE penalizes errors that persist over time, which makes it a good metric for tracking tasks. The total fitness is the sum of the two ITAE values.

- **The chromosome:**

  The chromosome is a 5-vector `[kpe, kde, Gp, Gi, Gd]`:

  | Gene | Meaning | Range |
  |---|---|---|
  | `kpe` | Scaling of error before fuzzification | `[0.1, 5.0]` |
  | `kde` | Scaling of error-rate before fuzzification | `[0.01, 2.0]` |
  | `Gp` | Output scaling of the fuzzy `Kp` | `[0, 100]` |
  | `Gi` | Output scaling of the fuzzy `Ki` | `[0, 1000]` |
  | `Gd` | Output scaling of the fuzzy `Kd` | `[0, 80]` |

  The wide ranges reflect the difference in magnitude between the five parameters. In a real tuning problem, you'd choose bounds from the controller's physical behaviour: `Gp`, `Gi`, `Gd` are proportional gains, so their natural scales depend on the plant.

- **GA options used:**

  | Option | Value | Why |
  |---|---|---|
  | `populationSize` | 30 (or 60 with `--full`) | Small enough to be fast, large enough to maintain diversity |
  | `generations` | 25 (or 60) | Enough to see convergence with `stallGenerations = 20` |
  | `crossover` | `'blx'` | Blend crossover — good for real-valued parameters with unequal scales |
  | `selection` | `'tournament'` | Standard choice; robust to fitness scaling |
  | `mutationScale` | 0.15 | Mutations perturb by up to 15% of the gene's range |
  | `initialGuess` | `[1, 1, 10, 10, 30]` | The nominal scaling is seeded as one of the initial individuals |
  | `stallGenerations` | 20 | Stop if no improvement for 20 generations |
  | `seed` | 42 | Reproducible run |

- **Expected output (abridged):**

```
Running GA (this simulates 1560 flights)...
  gen   0  best ITAE sum = <large number>
  gen   5  best ITAE sum = <smaller>
  gen  10  best ITAE sum = <smaller>
  gen  15  best ITAE sum = <smaller>
  gen  20  best ITAE sum = <smaller>
  gen  25  best ITAE sum = <smaller>
done in <X> s, reason: generations, evaluations: <N>
best scaling [kpe kde Gp Gi Gd] = <five numbers>

ITAE            nominal    +25% mass & 0.15 N gust
PID (fixed)        <A>                    <B>
FPID (nominal)     <C>                    <D>
GAFPID             <E>                    <F>
```

- **Reading the output:**
  - **`gen 0 best ITAE sum`** — the fitness of the best individual in the initial population. This is the starting point.
  - **`gen 5, 10, 15, 20, 25`** — the best fitness at each checkpoint. The values should decrease monotonically (the GA never forgets the best individual, thanks to elitism). The *rate* of decrease tells you how well the GA is exploring.
  - **`reason: generations`** — the GA hit the `generations` limit. Other possible reasons: `'stall'` (no improvement for 20 generations), `'fitnessLimit'` (target reached), `'timeLimit'` (budget exhausted), `'onGeneration'` (callback returned true), `'stopped'` (`ga.stop()` called).
  - **`evaluations: <N>`** — total number of times the fitness function was called. For a full run this is roughly `populationSize × (generations + 1)`. The `+1` accounts for the initial population.
  - **`best scaling`** — the best chromosome found. The five values are the tuned scaling factors. They can be compared directly against `NOMINAL = [1, 1, 10, 10, 30]` to see what the GA changed.
  - **ITAE comparison table** — the last block of output. Three rows (`PID (fixed)`, `FPID (nominal)`, `GAFPID`) × two columns (`nominal` and `+25% mass & 0.15 N gust`). The tuned GAFPID should have the lowest ITAE in both columns.
- **Interpreting the ITAE table:**
  - **`PID (fixed)`** — a hand-tuned plain PID with gains `(Kp=6, Ki=0.5, Kd=4)`. This is the baseline. It should do reasonably well on the nominal plant but degrade on the perturbed plant.
  - **`FPID (nominal)`** — a fuzzy PID with the hand-picked scaling `NOMINAL`. This may do better or worse than the plain PID, depending on how good the hand-picked scaling is.
  - **`GAFPID`** — the tuned fuzzy PID. The GA was specifically trained to minimize `ITAE_nominal + ITAE_perturbed`, so this should be the best overall. It may not win on *every* row, but it should win on the *sum*.
- **The two-scenario objective, in words:**

  The most interesting design choice in this demo is that the fitness combines **two** simulations. A single-scenario objective would tune the controller for the nominal plant and let it degrade on the perturbed one. A two-scenario objective encourages the GA to find scaling factors that work *across* a range of plant models — which is the whole point of gain scheduling.

  A variant would be to weight the two scenarios differently:
  ```javascript
  return 0.5 * a.itae + 1.5 * b.itae;   // prioritize robustness over nominal performance
  ```

- **Coding example:** as shown. The full demo file is self-contained and needs only `caro.fuzzy-1.0.js` and `caro.ga-1.0.js`.

- **Common pitfalls:**
  - **The GA is stochastic.** Different seeds give different results. The demo uses `seed: 42` for reproducibility. In practice, run the GA 5–10 times with different seeds and take the best.
  - **The GA is slow in JavaScript.** Each fitness evaluation runs two 25-second simulations at `dt = 0.02 s`, i.e. 2 × 1250 = 2500 Euler steps. With a population of 30 and 25 generations, that's 30 × 26 = 780 individuals, each running 2500 steps twice = ~3.9 million simulation steps. On a modern laptop this takes a few seconds. On a slow device, it may take longer. Use `--full` sparingly.
  - **The bounds matter.** If `LB` and `UB` are too wide, the GA spends generations exploring useless regions. If they're too narrow, the optimum may lie outside. Choose them from physical or empirical considerations.
  - **The initial guess is seeded into the population but not fixed.** If the GA finds something better, the initial guess is discarded. If it doesn't, the initial guess is preserved via elitism.
  - **The fitness function must be deterministic (or at least stable).** If your fitness function has randomness (e.g. simulating sensor noise), the GA's ranking of individuals becomes noisy. Either fix the seed of your simulation's RNG or average over multiple runs.
  - **The `probe` controller is mutated in place.** The fitness function uses a single `FuzzyPID` instance and calls `probe.setScaling(x)` on each evaluation. This is safe because `setScaling` fully overwrites the scaling and `simulate` calls `reset()` before each run. But if you modify the fitness function, be careful not to introduce state that persists between evaluations.
  - **The `stallGenerations: 20` is generous.** With only 25 generations, this means the GA will usually stop on `'generations'`, not `'stall'`. For a longer run, increase `generations` first, then rely on `stall` to stop early.
  - **The ITAE comparison is not the whole story.** ITAE penalizes long-lasting errors but not large instantaneous ones. A controller with a small overshoot and a long settling tail can have a lower ITAE than a controller with a large overshoot that settles immediately. If your application cares about peak error, use a different metric (e.g. ISE or max |e|).

## What the Example Proves

The single example in this manual exercises the entire `GA` workflow on a real control problem:

| Step | What it proves |
|---|---|
| 1. GA setup | The constructor accepts a 5-variable problem with bounds, initial guess, and options. |
| 2. Fitness function | The GA handles a fitness function that runs a full 25-second simulation with two scenarios. |
| 3. Convergence | The `best ITAE sum` decreases monotonically across generations. |
| 4. Stop criteria | The GA terminates with `reason: 'generations'` (or `'stall'` for longer runs). |
| 5. Result inspection | The result object exposes the best chromosome, its fitness, and the run statistics. |
| 6. Controller deployment | The tuned scaling factors, plugged into a `FuzzyPID`, produce a working controller. |
| 7. Comparison | The tuned controller outperforms the hand-picked nominal and a plain PID on the combined metric. |

If the demo runs and produces a table where `GAFPID` has the lowest combined ITAE, the GA library is verified end-to-end.

---

## Extending the Example

### 1. Different fitness metrics

Replace ITAE with ISE (Integral of Squared Error), IAE (Integral of Absolute Error), or peak error:

```javascript
// ISE
itae += e * e * dt;

// IAE
itae += Math.abs(e) * dt;

// peak error
peakErr = Math.max(peakErr, Math.abs(e));
```

Each metric emphasizes a different aspect of the response. ISE penalizes large errors, IAE penalizes sustained errors, and peak error penalizes overshoot.

### 2. Additional scenarios

The two-scenario objective can be extended to a family:

```javascript
function fitness(x) {
  probe.setScaling(x);
  const scenarios = [
    { massScale: 0,    dist: 0    },
    { massScale: 0.25, dist: 0.15 },
    { massScale: -0.15, dist: 0   },
    { massScale: 0.10, dist: 0.30 },
  ];
  return scenarios.reduce((sum, s) => sum + simulate(probe, s).itae, 0);
}
```

More scenarios means a more robust controller, but a slower GA.

### 3. Seed the GA with a previous best

The GA's `initialGuess` accepts a single chromosome or an array of them. To seed with the last run's best:

```javascript
const prevBest = [1.2, 0.8, 15, 12, 28];   // from a previous run
const ga = new GA({ ..., initialGuess: prevBest, ... });
```

You can also start with a full population of promising candidates:

```javascript
initialPopulation: [best1, best2, best3, ...]
```

### 4. Constraint handling

The GA has no built-in constraint support — you handle constraints via the fitness function. A common pattern is a penalty:

```javascript
function fitness(x) {
  const result = simulate(probe, x);
  const violation = Math.max(0, result.peakU - P.uMax) + Math.max(0, P.uMin - result.minU);
  return result.itae + 1e6 * violation;
}
```

This steers the GA away from solutions that violate the constraints while still giving useful gradient information elsewhere.

### 5. Integer genes

Some parameters are naturally discrete. To force an integer gene:

```javascript
const ga = new GA({
  nVars: 3, lb: [0, 0, 0], ub: [10, 5, 20],
  integer: [true, false, true],   // gene 0 and 2 integer, gene 1 real
  ...
});
```

Or pass `integer: true` to force all genes integer.

### 6. Alternative selection and crossover

The demo uses `tournament` selection and `blx` crossover — a common combination. Other options:

| Selection | Best for |
|---|---|
| `tournament` | General-purpose; robust to fitness scaling |
| `rank` | Noisy fitness functions; linear ranking |
| `roulette` | Classic; sensitive to outliers |
| `sus` | Stochastic universal sampling; low variance |

| Crossover | Best for |
|---|---|
| `blx` | Real-valued genes with unequal scales |
| `arithmetic` | Simple, linear combination |
| `sbx` | Simulated binary crossover; tight child-parent relationship |
| `onepoint`, `twopoint` | Ordered gene sequences |
| `uniform` | Fully random recombination |

### 7. Asynchronous evaluation

If your fitness function is I/O-bound (e.g. calls a remote simulator), use `runAsync`:

```javascript
const r = await ga.runAsync(async (x) => {
  const result = await remoteSimulate(x);
  return result.itae;
});
```

The `concurrency` option controls how many evaluations are in flight at once.

### 8. Progress callbacks and stopping

The `onGeneration` callback fires after each generation. It can print progress, log to a file, or stop the GA early:

```javascript
onGeneration: (info) => {
  console.log(`gen ${info.generation}: best = ${info.best}`);
  if (info.best < 1e-3) return true;   // stop when good enough
}
```

The callback receives `{ generation, best, bestX, mean, evaluations, population, stall }`.

### 9. Reproducibility

Seeded runs are reproducible. To compare two GA configurations, run both with the same seed:

```javascript
const rA = new GA({ ..., seed: 42 }).run(fitness);
const rB = new GA({ ..., seed: 42, crossover: 'sbx' }).run(fitness);
```

Note that reproducibility requires a deterministic fitness function. If your simulation uses its own RNG, seed that too.

### 10. Use the MATLAB-style one-liner

For simple problems, use the static method or the module-level `optimize`:

```javascript
const { GA, optimize } = require('./caro.ga-1.0.js');
const r = GA.minimize(x => x[0]*x[0] + x[1]*x[1], [-5, -5], [5, 5], { seed: 1 });
// or:
const r2 = optimize(x => x[0]*x[0] + x[1]*x[1], 2, [-5, -5], [5, 5], { seed: 1 });
```

Both return the same result object.

### 11. Multi-objective GA

The library does not support multi-objective optimization directly. For two objectives, use a weighted sum (as the demo does) or implement a separate Pareto-based GA. The library's `population` and `fitnesses` fields in the result give you access to the final Pareto front if you use a Pareto-style fitness function.

### 12. Substitute a different controller

The GA is agnostic to the controller — it only calls `setScaling(x)` and `reset()`. To optimize a different controller, replace `FuzzyPID` with anything that exposes those methods:

```javascript
const probe = new MyController();
const fitness = x => {
  probe.setParams(x);
  return simulate(probe).cost;
};
```

This works with `AdaptiveFuzzyPID` from `caro.fuzzyPID-1.0.js`, `NeuroFuzzyPID` from `caro.neuroFuzzyPID-1.0.js`, or any custom controller.

---

## Troubleshooting

The following issues are the most common when running the demo.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module './caro.ga-1.0.js'` | Demo not in the same folder | Move the demo next to the two library files |
| `Cannot find module './caro.fuzzy-1.0.js'` | Fuzzy library not in the same folder | Ensure both library files are in the same directory |
| `GA: nVars is required` | Missing `nVars` and neither `lb` nor `ub` is an array | Provide `nVars` explicitly or pass array bounds |
| `GA: ub < lb at gene i` | Bounds are swapped | Check that `lb[i] ≤ ub[i]` for every gene |
| GA converges to a bad solution | Bounds too wide, or population too small | Narrow the bounds, or increase `populationSize` |
| GA stalls at generation 0 | Fitness is constant, or all individuals are identical | Check the fitness function; ensure the initial guess is not the only seed |
| GA diverges | Bounds too wide, or mutation too large | Reduce `mutationScale` or narrow the bounds |
| `onGeneration` callback not called | Not passed in options, or the run stops before the first generation | Verify the option is set; check the stop criteria |
| Result's `reason` is `'stall'` but you expected `'generations'` | `stallGenerations` reached before `generations` | Increase `stallGenerations`, or check that the GA is still improving |
| `best scaling` values hit the bounds | Optimal solution lies outside the bounds | Widen the bounds |
| `best scaling` values cluster | Population converged too early | Increase `mutationScale`, or reduce `eliteCount` |
| Result's `evaluations` is smaller than expected | `stall` or `fitnessLimit` stopped the run early | Check `reason` |
| `Cannot read property 'setScaling' of undefined` | The controller does not have that method | Verify the controller instance has `setScaling` and `reset` |
| GA takes too long | Population or generations too large | Reduce both, or use `runAsync` with a time limit |
| Reproducibility fails | Fitness function is not deterministic | Seed the simulation's RNG, or average over multiple runs |

If a failure is not listed here, the fastest diagnostic is usually to run the demo and check which block fails first.

---

## Closing Notes

The `caro.ga-1.0.js` library is a dependency-free real-coded genetic algorithm that fits the same design philosophy as the rest of the CaroLab toolkit: small, readable, no build step, works in Node and the browser.

It supports:

- Real-valued and integer chromosomes
- Four selection methods, six crossover methods, two mutation methods
- Elitism, seeding, reproducibility
- Six stop criteria and a progress callback
- Synchronous and asynchronous runners

The single example in this manual applies the GA to a real control-tuning problem — fuzzy PID gains on a quadrotor altitude channel with a mass perturbation and gust disturbance — and demonstrates that the tuned controller outperforms both a hand-picked nominal scaling and a plain PID on the combined objective.

The GA is not just a controller tuner. It is the optimizer that turns any of the other CaroLab libraries from "here is a controller with N parameters" into "here is the controller with the best N parameters for my task."

---

*End of document.*

