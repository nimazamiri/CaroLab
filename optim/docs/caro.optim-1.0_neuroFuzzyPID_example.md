# CaroLab Neuro-Fuzzy Libraries — Examples Manual

- **Name:** caro.anfis-1.0.js + caro.neuroFuzzyPID-1.0.js
- **Release Date:** 29 September 2026
- **Document Name:** Neuro-Fuzzy Libraries Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — NeuroFuzzyPID as a PID Controller (`neuroFuzzyPID_demo.js`)](#example-1--neurofuzzypid-as-a-pid-controller-neurofuzzypid_demojs)
4. [What the Example Proves](#what-the-example-proves)
5. [Extending the Example](#extending-the-example)
6. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the first for the **CaroLab neuro-fuzzy libraries** — `caro.anfis-1.0.js` (a from-scratch ANFIS implementation) and `caro.neuroFuzzyPID-1.0.js` (a PID controller whose gain schedule is a trained ANFIS). Together they provide a complete neuro-fuzzy pipeline: train a fuzzy inference system to represent a control surface, then use it in a closed loop.

The two libraries cover:

**`caro.anfis-1.0.js`** — a first-order Sugeno ANFIS with hybrid learning:

| Feature | Detail |
|---|---|
| Architecture | 5-layer ANFIS per Jang (1993) |
| Premise parameters | Gaussian membership functions, `{c, s}` per term |
| Consequent parameters | Linear (Sugeno first-order), one set per rule per output |
| Learning | **Hybrid**: least-squares (LSE) for consequents + gradient descent for premises |
| Multiple outputs | Share one rule base / one set of firing strengths |
| Rule specification | Full grid or explicit antecedent tuples |
| Regularization | Optional L2 ridge on the consequent LSE (default `1e-6`) |
| Utilities | `train`, `evaluate`, `trainToMatch`, `toJSON`, `fromJSON` |
| Dependencies | **None** — pure JavaScript, no fuzzy.js or ga.js required |

**`caro.neuroFuzzyPID-1.0.js`** — a PID controller with an ANFIS gain scheduler:

| Feature | Detail |
|---|---|
| Control law | `u = Kp·e + Ki·∫e dt + Kd·ė` |
| Gain source | `Kp, Ki, Kd = ANFIS(e, ė)` — trained, not tuned by hand |
| Baseline mode | Optional `Kp0, Ki0, Kd0` — every rule's bias term initialized to these, so an *untrained* controller behaves like a fixed PID |
| Training API | `train(samples)` for direct supervised training |
| Teacher API | `trainFromGainSchedule(teacher, opts)` — learns by sampling another controller's `.gains(e, ec)` method |
| Integrator | Conditional-integration anti-windup |
| Derivative filter | Optional first-order filter via `derivativeTau` |
| Dependencies | **`caro.anfis-1.0.js`** — nothing else |

The one example in this manual exercises `NeuroFuzzyPID` end-to-end: build a baseline, define a target gain schedule, train, and compare closed-loop performance on a plant whose gain changes mid-run.

### Conventions

| Item | Convention |
|---|---|
| Input vector | Array of numbers, one per input |
| Training sample | `{x: [...], y: [...]}` for the ANFIS; `{e, ec (or edot), Kp, Ki, Kd}` or `{e, ec, target:[...]}` for the PID |
| Membership function | Gaussian: `gauss(x, c, s) = exp(−0.5·((x−c)/s)²)` |
| Sugeno consequent | Linear: `z_r = p_r · x + b_r` (one `p_r` per input, one `b_r` bias) |
| Rule base | `rules[i]` = tuple of term indices, one per input |
| Error convention | `e = ref − measurement` (positive when measurement is below reference) |
| Controller output | Absolute control signal `u(t)` — includes the integral term |
| State | All controller state is internal; call `reset()` to clear it |
| Serialization | `toJSON()` / `fromJSON()` on the ANFIS (round-trippable) |

All scripts use **CommonJS** (`require`).

### Required Files and Layout

```
project/
├── caro.anfis-1.0.js
├── caro.neuroFuzzyPID-1.0.js
└── demo/
    └── neuroFuzzyPID_demo.js
```

The demo uses `require('./caro.neuroFuzzyPID-1.0.js')`, which in turn requires `./caro.anfis-1.0.js` from the same folder.

### How to Run the Demo

```
node demo/neuroFuzzyPID_demo.js
```

The demo runs a full train-and-compare cycle and prints performance metrics.

### Why These Libraries Matter

A **PID controller** is the workhorse of industrial control. It is easy to implement and easy to understand — but its three gains (`Kp`, `Ki`, `Kd`) are *fixed*. When the plant changes — because of wear, load variation, or a physical regime shift — a fixed-gain PID becomes suboptimal.

A **gain-scheduled PID** fixes this by making the gains functions of the operating point. The classic approach is a hand-written rule table: "if error is large and error-rate is small, use Kp = 5; if error is small and error-rate is large, use Kp = 2; …". Rule tables are intuitive but tedious, and they scale poorly to more than two inputs.

The **neuro-fuzzy** approach replaces the rule table with a trained network. The rules still exist — they are the ANFIS's rule base — but the parameters of the rules (both the membership functions and the consequent linear coefficients) are learned from data. Two practical benefits:

1. **You don't have to hand-tune the table.** You provide example input-output pairs, and the ANFIS learns the underlying function.
2. **You can train from an existing controller.** If you already have a well-tuned fuzzy PID (e.g. an `AdaptiveFuzzyPID` from `caro.fuzzyPID-1.0.js`), you can sample its gain surface and train an ANFIS to reproduce it. The student may not be bit-for-bit identical, but it generalizes smoothly and can then be fine-tuned on new data.

The two libraries in this manual are deliberately small: ~200 lines for the ANFIS, ~120 lines for the PID. They have no dependencies, no build step, and no external solver. They are intended to be read, extended, and adapted.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `neuroFuzzyPID_demo.js` | `NeuroFuzzyPID` (constructor, `train`, `gains`, `step`, `reset`) | Build a baseline PID, define a target gain schedule, train, and compare closed-loop performance |

---

## Example 1 — NeuroFuzzyPID as a PID Controller (`neuroFuzzyPID_demo.js`)

- **Purpose:** Show the full lifecycle of a `NeuroFuzzyPID` — build a baseline, define a hand-written rule of thumb to serve as the training target, train, then run both the untrained (fixed-gain) and trained (gain-scheduled) versions on a plant whose gain doubles mid-run. This demonstrates the practical value of gain scheduling without needing an external "teacher" controller.
- **Source:** The full script is provided in `neuroFuzzyPID_demo.js`. The key sections are:

```javascript
// 1) baseline controller ("x(0)", the designer's fixed PID)
const BASE = { Kp0: 2.0, Ki0: 1.0, Kd0: 0.4 };

const untrained = new NeuroFuzzyPID(Object.assign({
  eRange: [-2, 2], ecRange: [-4, 4], eTerms: 5, ecTerms: 5, dt: 0.01,
  outLimits: [-20, 20], integralLimit: 10,
}, BASE));

// 2) a hand-written gain-scheduling rule of thumb, as training data
function ruleOfThumb(e, ec) {
  const ae = Math.abs(e), aec = Math.abs(ec);
  return {
    Kp: BASE.Kp0 + 1.5 * Math.tanh(ae),
    Ki: BASE.Ki0 * Math.max(0, 1 - 0.4 * ae),
    Kd: BASE.Kd0 + 0.5 * Math.tanh(aec),
  };
}
const eR = [-2, 2], ecR = [-4, 4], nE = 13, nEC = 13;
const samples = [];
for (let i = 0; i < nE; i++) for (let j = 0; j < nEC; j++) {
  const e = eR[0] + (eR[1] - eR[0]) * i / (nE - 1);
  const ec = ecR[0] + (ecR[1] - ecR[0]) * j / (nEC - 1);
  const g = ruleOfThumb(e, ec);
  samples.push({ e, ec, Kp: g.Kp, Ki: g.Ki, Kd: g.Kd });
}

// 3) train a fresh controller on those samples
const trained = new NeuroFuzzyPID(Object.assign({
  eRange: eR, ecRange: ecR, eTerms: 5, ecTerms: 5, dt: 0.01,
  outLimits: [-20, 20], integralLimit: 10,
}, BASE));

const { history } = trained.train(samples, { epochs: 80, lr: 0.03 });

// 4) closed-loop comparison on a plant whose gain doubles mid-run
function mkPlant() {
  let y = 0, v = 0;
  return {
    step(u, t, dt) {
      const K = t >= 6 ? 2 : 1;
      const a = K * u - 0.6 * v - y;
      v += a * dt; y += v * dt;
      return y;
    },
  };
}
```

- **Classes and methods invoked:**
  - `new NeuroFuzzyPID(opts)` — constructor. Builds the internal ANFIS with `eTerms × ecTerms` rules (5×5 = 25 rules).
  - `setBiasGains({Kp0, Ki0, Kd0})` — implicit via the constructor's `Kp0/Ki0/Kd0` options; sets every rule's bias term so an untrained controller behaves like a fixed PID.
  - `train(samples, opts)` — one call to the internal ANFIS's training routine. Returns `{ history: [rmse, ...] }`.
  - `gains(e, ec)` — evaluates the ANFIS at a given operating point without touching controller state.
  - `step(e, dt)` — one closed-loop tick, with internal integrator and derivative state.
  - `reset()` — clears the internal state between runs.

- **Inputs:**
  - **Baseline gains** — `Kp0 = 2.0`, `Ki0 = 1.0`, `Kd0 = 0.4`. These set the "at origin" behavior of the untrained controller.
  - **Fuzzy universes** — `eRange: [−2, 2]`, `ecRange: [−4, 4]`. These define the domain over which the ANFIS approximates the gain schedule.
  - **Number of terms** — `eTerms: 5`, `ecTerms: 5`. So the ANFIS has 25 rules and 25 × 3 = 75 consequent parameters (each rule has 3 outputs × 3 parameters per output = `3 × (2 inputs + 1 bias)` = 9 consequent coefficients per rule, i.e. 225 total).
  - **Training grid** — 13 × 13 = 169 samples spanning the `(e, ec)` universe.
  - **Training options** — `epochs: 80`, `lr: 0.03`.
  - **Rule of thumb** — `Kp = Kp0 + 1.5·tanh(|e|)`, `Ki = Ki0·max(0, 1 − 0.4·|e|)`, `Kd = Kd0 + 0.5·tanh(|ec|)`. A heuristic curve that increases proportional gain with error magnitude, decreases integral gain near the target (to reduce windup), and increases derivative gain with error rate.
  - **Closed-loop plant** — `y'' + 0.6·y' + y = K·u` with `K = 1` before `t = 6 s` and `K = 2` after.
  - **Closed-loop length** — `T = 12 s`, `dt = 0.01 s`, so `N = 1200` ticks.

- **Output:** four blocks.
  1. The gains of the untrained controller at three sample points — they should all equal the baseline.
  2. The training RMSE at epoch 0 and epoch 79, plus the trained gains at the same three points.
  3. A closed-loop comparison of the untrained and trained controllers, with overshoot and final error.
  4. A closing note suggesting alternatives to the hand-written rule of thumb.

- **Expected output (abridged):**

```
=== NeuroFuzzyPID as a PID controller ===
untrained gains at a few points (should all equal the baseline, since no training has happened yet):
  e=0, ec=0 -> { Kp: 2, Ki: 1, Kd: 0.4 }
  e=1.5, ec=-0.5 -> { Kp: 2, Ki: 1, Kd: 0.4 }
  e=-1, ec=2 -> { Kp: 2, Ki: 1, Kd: 0.4 }

training RMSE: epoch 0 = X.XXe-1  epoch 79 = X.XXe-3
trained gains at the same points (should now track the rule of thumb):
  e=0, ec=0 -> learned { ... }  target { Kp: 2, Ki: 1, Kd: 0.4 }
  e=1.5, ec=-0.5 -> learned { ... }  target { Kp: ..., Ki: ..., Kd: ... }
  e=-1, ec=2 -> learned { ... }  target { Kp: ..., Ki: ..., Kd: ... }

closed-loop run (plant gain doubles at t=6s):
  untrained (fixed) PID : overshoot 0-6s X.X%,  error at t=12s X.XXXX
  trained (scheduled) PID: overshoot 0-6s X.X%,  error at t=12s X.XXXX
```

- **Reading the output:**
  - **`untrained gains`** — every point returns exactly `{Kp: 2, Ki: 1, Kd: 0.4}` because no training has happened. This is the ANFIS with all consequent coefficients zero except the bias term, which is the baseline. The controller is literally a fixed-gain PID.
  - **`training RMSE`** — the root-mean-square error between the ANFIS output and the training target. At epoch 0 it is large (the ANFIS has not learned anything yet). By epoch 79 it should be orders of magnitude smaller. A 100× or 1000× drop is expected for a target function this smooth.
  - **`trained gains`** — after training, the ANFIS output at each point should be close to the rule-of-thumb target. Small discrepancies are expected (the ANFIS has only 5 terms per input, so it cannot represent every shape exactly), but the qualitative behavior should match: larger `Kp` for larger `|e|`, smaller `Ki` for larger `|e|`, larger `Kd` for larger `|ec|`.
  - **`overshoot 0-6s`** — the overshoot during the first half of the closed-loop run, before the plant gain changes. The trained controller should have *similar or slightly better* overshoot than the untrained one; gain scheduling is about robustness to plant changes, not about beating the baseline on the nominal plant.
  - **`error at t=12s`** — the residual error at the end of the run, after the plant gain has doubled. The trained controller should have *lower* residual error here, because the higher `Kp` at larger `|e|` compensates for the increased plant gain.

- **The four training stages, in words:**
  1. **Build the untrained controller.** With `Kp0/Ki0/Kd0` set, every rule's bias term is initialized to those gains. The ANFIS output is a constant function equal to `(Kp0, Ki0, Kd0)`.
  2. **Define the training target.** The hand-written `ruleOfThumb(e, ec)` function is the "ground truth" the ANFIS should learn. In a real application, you would replace this with either (a) a hand-written table, (b) a well-tuned fixed PID's gains at different operating points, or (c) an existing fuzzy PID you want to clone.
  3. **Train.** The `train(samples, {epochs, lr})` call runs 80 epochs. Each epoch does:
     - **Forward pass** with the current parameters.
     - **Least-squares update** for the consequent linear coefficients (Jang 1993's hybrid rule).
     - **Gradient descent step** for the premise Gaussian centers and widths.
     The RMSE history lets you see convergence.
  4. **Compare.** The trained and untrained controllers are run on the same closed-loop plant. The plant's gain change at `t = 6 s` is what makes the comparison interesting: a fixed-gain PID has to compromise between the two gain values, while a scheduled PID can adapt.

- **Coding example:** as shown. The script is self-contained — no need for `caro.fuzzyPID-1.0.js` or any external teacher.

- **Common pitfalls:**
  - **The rule of thumb is illustrative, not optimal.** It is not from any paper — it is a heuristic chosen to be easy to understand. For a real application, replace it with a schedule derived from domain knowledge or from a well-tuned controller.
  - **`outLimits` and `integralLimit` matter.** Without them, the PID can wind up or produce large control signals. The demo uses `outLimits: [-20, 20]` and `integralLimit: 10`, which are appropriate for a plant with unit DC gain. Adjust for your plant.
  - **Training is not guaranteed to converge.** The learning rate `lr: 0.03` is a reasonable starting point, but the ANFIS optimization is non-convex. If the RMSE plateaus early, try a larger or smaller `lr`, or a different number of terms.
  - **The number of terms controls the resolution.** With `eTerms: 5, ecTerms: 5`, the ANFIS has 25 rules — enough to represent a moderately complex gain surface, but not enough for a very wiggly one. For complex surfaces, increase the terms.
  - **The universes must cover the operating range.** If your error or error-rate can exceed `eRange` or `ecRange`, the ANFIS will extrapolate, and the extrapolation is not guaranteed to be sensible. Choose universes that bracket the expected operating range.
  - **`reset()` is important between runs.** The closed-loop comparison runs the same controller twice — once untrained, once trained. If you don't call `reset()` between runs, the integrator state carries over and the second run is contaminated.
  - **The plant's gain change is a step, not a smooth transition.** Real plants usually change gradually. The step is easier to see in the output, but a smooth transition would be more realistic.
  - **The final error is a single number.** It does not tell you about the full trajectory. For a more detailed comparison, log the response array and plot it, or compute additional metrics (settling time, rise time, IAE, ISE).


## What the Example Proves

The single example in this manual exercises the entire `NeuroFuzzyPID` workflow:

| Step | What it proves |
|---|---|
| 1. Untrained controller behaves as a fixed PID | The baseline initialization works: an untrained `NeuroFuzzyPID` is exactly a fixed-gain PID with the provided `Kp0/Ki0/Kd0`. |
| 2. Training reduces RMSE | The hybrid learning algorithm (LSE + gradient descent) converges on the training data. |
| 3. Trained gains track the target | The ANFIS output at sample points approximates the target gain schedule. |
| 4. Closed-loop comparison | The trained controller responds better to a plant change than the untrained one, demonstrating the practical value of gain scheduling. |

If this runs without error and produces sensible metrics, you have:

- a working `ANFIS` with hybrid learning (verified indirectly through the PID training),
- a working `NeuroFuzzyPID` with baseline initialization,
- a working end-to-end train-and-deploy workflow.

The two libraries are verified end-to-end.

---

## Extending the Example

### 1. Train from an existing fuzzy PID

The demo uses a hand-written rule of thumb. A more practical workflow is to sample an existing controller's gain surface and train the ANFIS to reproduce it. The library provides `trainFromGainSchedule` for exactly this:

```javascript
const { AdaptiveFuzzyPID } = require('./caro.fuzzyPID-1.0.js');
const teacher = new AdaptiveFuzzyPID({ Kp0: 2, Ki0: 1, Kd0: 0.4, dt: 0.01 });
const { student, history } = NeuroFuzzyPID.trainFromGainSchedule(teacher, {
  eRange: [-2, 2],
  ecRange: [-4, 4],
  gridE: 15, gridEC: 15,
  epochs: 150,
  lr: 0.03,
});
```

The `teacher` can be any object with a `.gains(e, ec) → {Kp, Ki, Kd}` method. This includes `AdaptiveFuzzyPID` and `SimplestFuzzyPID` from `caro.fuzzyPID-1.0.js`, as well as your own custom controllers.

### 2. Compare against the teacher

After training, evaluate both the teacher and the student on a grid and compute the maximum discrepancy:

```javascript
let maxErr = 0;
for (let e of [-2, -1, 0, 1, 2]) for (let ec of [-4, -2, 0, 2, 4]) {
  const gT = teacher.gains(e, ec);
  const gS = student.gains(e, ec);
  maxErr = Math.max(maxErr, Math.abs(gT.Kp - gS.Kp), Math.abs(gT.Ki - gS.Ki), Math.abs(gT.Kd - gS.Kd));
}
console.log('max gain error:', maxErr);
```

A well-trained student should reproduce the teacher's gains to within a few percent over the covered domain.

### 3. Sweep the number of terms

The resolution of the ANFIS is controlled by `eTerms` and `ecTerms`. Sweep over `[3, 5, 7, 9]` and plot the training RMSE vs. the number of rules:

```javascript
for (const nTerms of [3, 5, 7, 9]) {
  const pid = new NeuroFuzzyPID({ eRange: [-2, 2], ecRange: [-4, 4], eTerms: nTerms, ecTerms: nTerms });
  const { history } = pid.train(samples, { epochs: 100, lr: 0.03 });
  console.log(`nTerms=${nTerms} (${nTerms * nTerms} rules): final RMSE = ${history.at(-1).toExponential(2)}`);
}
```

### 4. Try the ANFIS on other gain surfaces

The `ANFIS` class is general-purpose — it works on any `(x → y)` mapping, not just gain schedules. Try it on:

- A classic fuzzy PID rule table (2 inputs, 3 outputs).
- A single-output plant model identification problem (`y = f(u)`).
- A coordinate transformation (`(x, y) → (r, θ)`).
- A hand-drawn nonlinear function of your choice.

The `trainToMatch` static method does the boilerplate:

```javascript
const anfis = new ANFIS({ ranges: [[-1, 1], [-1, 1]], nMFs: [5, 5] });
const history = ANFIS.trainToMatch(anfis, x => [Math.sin(x[0]) + 0.3 * x[1]], { epochs: 100 }).history;
```

### 5. Serialize a trained controller

Save a trained `ANFIS` to JSON and reload it later:

```javascript
const json = JSON.stringify(pid.anfis.toJSON());
fs.writeFileSync('trained-pid.json', json);

// later:
const restored = ANFIS.fromJSON(JSON.parse(fs.readFileSync('trained-pid.json')));
```

The `fromJSON` round-trips every parameter (premise centers and widths, consequent coefficients, rule tuples, universes).

### 6. Add an integral term to the teacher

The demo's rule of thumb decreases `Ki` with error magnitude — a heuristic to reduce integral windup. You can extend this to a full anti-windup scheme by passing the accumulated integral to the gain schedule:

```javascript
function gains(e, ec, integral) {
  // gain schedule that also depends on |integral|
  return { Kp: ..., Ki: ..., Kd: ... };
}
```

The `NeuroFuzzyPID` API assumes a two-input schedule, but the underlying `ANFIS` supports arbitrary numbers of inputs (via `ranges` and `nMFs` arrays). You can build a 3-input PID by constructing the ANFIS manually and passing it via `opts.anfis`.

### 7. Compare training curves

Log the RMSE history from several training runs and plot them on the same axes. This shows how sensitive the training is to the learning rate and the initial parameters:

```javascript
const runs = [0.01, 0.03, 0.1].map(lr => {
  const pid = new NeuroFuzzyPID({ ...BASE, eTerms: 5, ecTerms: 5 });
  return { lr, history: pid.train(samples, { epochs: 100, lr }).history };
});
```

### 8. Closed-loop training

The demo uses offline training on a fixed grid of samples. A more advanced approach is to train online, using the closed-loop error as the training signal. This is sometimes called "reinforcement-based" or "iterative" training. It requires a slightly different training loop — the ANFIS parameters are updated after each closed-loop trial, not from a precomputed dataset.

### 9. Compare hybrid vs. gradient-only training

Jang's original ANFIS paper emphasizes hybrid learning (LSE + gradient descent) over gradient-only training. To see the difference, disable the LSE step (set the ridge very high, or add a flag to skip it) and compare convergence on the same data.

### 10. Test on a real plant model

The demo plant is deliberately simple (second-order, gain change at `t = 6 s`). For a more realistic test, substitute a plant from the Manipulator or Compensator libraries:

- A **second-order system** from `caro.compensator-1.0.js`.
- A **nonlinear plant** with friction and saturation.
- A **robot joint** with the full RNE dynamics.

The `NeuroFuzzyPID` is agnostic to the plant — it only sees the error signal.

---

## Troubleshooting

The following issues are the most common when running the demo.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module './caro.neuroFuzzyPID-1.0.js'` | Demo not in the same folder | Move the demo next to the two library files |
| `Cannot find module './caro.anfis-1.0.js'` | ANFIS not in the same folder | Ensure both library files are in the same directory |
| `NeuroFuzzyPID.step needs dt > 0` | Passed `dt = 0` or negative | Pass a positive `dt` or set `options.dt` |
| Training RMSE plateaus early | Learning rate too small, or not enough epochs | Increase `lr` or `epochs` |
| Training RMSE oscillates or diverges | Learning rate too large | Decrease `lr` by 2–10× |
| Trained gains overshoot the target | Too few terms, or training not converged | Increase `eTerms/ecTerms`, or more epochs |
| Trained gains are still equal to baseline | Training samples have the same target as the baseline | Check `ruleOfThumb`: it must differ from `BASE` |
| `untrained gains` are not the baseline | Baseline initialization failed | Check that `Kp0/Ki0/Kd0` are provided and finite |
| Closed-loop response oscillates | `outLimits` too loose, or `integralLimit` too high | Tighten both, or reduce the baseline gains |
| `reset()` does not clear state | Custom state added outside the standard fields | Call `pid._int = 0; pid._prevE = 0;` manually |
| `Cannot read property 'gains' of undefined` | Passed a non-controller object to `trainFromGainSchedule` | Ensure the teacher has a `.gains(e, ec)` method |
| JSON round-trip produces different output | Rare; usually a floating-point tolerance issue | Check `net.evaluate(x)` before and after `toJSON`/`fromJSON` |

If a failure is not listed here, the fastest diagnostic is usually to run the demo and check which block fails first.

---

## Closing Notes

The `caro.anfis-1.0.js` library is a from-scratch implementation of Jang's (1993) ANFIS with hybrid learning — least-squares for the consequent parameters and gradient descent for the premise parameters. It is dependency-free, supports multiple outputs sharing a single rule base, and exposes both a general-purpose `train` API and a convenience `trainToMatch` for reproducing an existing function.

The `caro.neuroFuzzyPID-1.0.js` library uses the ANFIS as a gain scheduler for a PID controller. The controller can start from a designer-chosen baseline (`Kp0, Ki0, Kd0`), train on arbitrary gain-schedule samples, or learn from an existing fuzzy-PID teacher via `trainFromGainSchedule`.

The single example in this manual walks through the full lifecycle — build, train, compare — and demonstrates the practical value of gain scheduling on a plant whose gain changes mid-run.

---

*End of document.*

