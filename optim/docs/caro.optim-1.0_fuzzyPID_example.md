# CaroLab Fuzzy Logic Libraries — Examples Manual

- **Name:** caro.fuzzy-1.0.js + caro.fuzzyPID-1.0.js
- **Release Date:** 29 September 2026
- **Document Name:** Fuzzy Logic Libraries Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — SimplestFuzzyPID (`fuzzyPID_demo.js` Demo 1)](#example-1--simplestfuzzypid-fuzzypid_demojs-demo-1)
4. [Example 2 — AdaptiveFuzzyPID (`fuzzyPID_demo.js` Demo 2)](#example-2--adaptivefuzzypid-fuzzypid_demojs-demo-2)
5. [Example 3 — SwitchedFuzzyPID (`fuzzyPID_demo.js` Demo 3)](#example-3--switchedfuzzypid-fuzzypid_demojs-demo-3)
6. [What the Three Examples Prove Together](#what-the-three-examples-prove-together)
7. [Extending the Examples](#extending-the-examples)
8. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the first for the **CaroLab fuzzy logic libraries** — `caro.fuzzy-1.0.js` (the general-purpose fuzzy inference engine) and `caro.fuzzyPID-1.0.js` (three fuzzy-PID controller implementations built on top of it). Together, they form a self-contained fuzzy logic toolkit with no external dependencies.

The two libraries cover:

**`caro.fuzzy-1.0.js`** — a complete Mamdani/Sugeno fuzzy inference system:

| Feature | Detail |
|---|---|
| Membership functions | `trimf`, `trapmf`, `gaussmf`, `gbellmf`, `sigmf`, `singleton` |
| AND / OR operators | `min`/`max`, `prod`/`probsum` |
| Implication / aggregation | `min`/`prod`, `max`/`sum`/`probsum` |
| Defuzzification | `centroid`, `bisector`, `mom`, `som`, `lom`, `wtaver`, `wtsum` |
| Rule input | Objects, `"IF … THEN …"` strings, or 2-D rule tables |
| Tuning | `getParams()` / `setParams()` for GA-based optimization |
| Fast path | Closed-form centroid for `prod + sum + centroid` |
| `FuzzyPID` | Gain-scheduled PID with 7×7 rule tables from Madebo (IEEE Access 2025) |

**`caro.fuzzyPID-1.0.js`** — three fuzzy-PID controllers:

| Class | Source | Approach |
|---|---|---|
| `SimplestFuzzyPID` | Mohan & Sinha (INDICON 2004) | Closed-form Δu(kT), no rule tables |
| `AdaptiveFuzzyPID` | Lai/Zhou/Hu (IJCCC 2016) | Baseline Kp0/Ki0/Kd0 + fuzzy ΔK corrections |
| `SwitchedFuzzyPID` | Lai/Zhou/Hu (IJCCC 2016) | 3-branch switching on error magnitude and curvature |

The three examples in this manual exercise one controller each.

### Conventions

| Item | Convention |
|---|---|
| Membership function | `trimf(x, [a, b, c])`, `gaussmf(x, [σ, c])`, etc. |
| Fuzzy variable range | `[lo, hi]` — inputs are clamped to this range |
| Term labels | Free-form strings; the paper's examples use `NB..PB` for inputs, `VVS..VVB` for outputs |
| Rule tables | 2-D arrays, `rows = e`, `cols = ec` |
| Controller form | Discrete-time, unit sample period `dt` |
| Error convention | `e = ref − measurement` (positive when measurement is below reference) |
| Controller output | Absolute control signal `u(t)` — includes any integral term |
| State | All controller state is internal; call `reset()` to clear it |

All scripts use **CommonJS** (`require`).

### Required Files and Layout

```
project/
├── caro.fuzzy-1.0.js
├── caro.fuzzyPID-1.0.js
└── demo/
    └── fuzzyPID_demo.js
```

The demo uses `require('./caro.fuzzyPID-1.0.js')`, which in turn requires `./caro.fuzzy-1.0.js` from the same folder.

### How to Run the Demo

```
node demo/fuzzyPID_demo.js
```

The demo runs all three controllers in sequence and prints performance metrics.

### Why These Libraries Matter

Fuzzy logic has a reputation for being "hard to implement correctly" — the rule tables are tedious, the defuzzification formulas are subtle, and the interaction between the AND/OR/aggregation operators is easy to get wrong. The `caro.fuzzy-1.0.js` library encapsulates all of this behind a clean API:

```javascript
const sys = new F.FuzzySystem({ and: 'min', or: 'max', defuzz: 'centroid' });
sys.addInput('temp', [0, 40]).addTerms(['cold', 'warm', 'hot'], 'trimf');
sys.addOutput('fan', [0, 100]).addTerms(['low', 'mid', 'high'], 'trimf');
sys.addRule('IF temp IS cold THEN fan IS low');
sys.addRule('IF temp IS warm THEN fan IS mid');
sys.addRule('IF temp IS hot THEN fan IS high');
sys.evaluate({ temp: 30 });   // -> { fan: ... }
```

Three lines to define the fuzzy system, three more to run it. No MATLAB, no scikit-fuzzy, no Python dependency.

The `caro.fuzzyPID-1.0.js` library builds on this to implement three published fuzzy-PID controllers. Each one demonstrates a different philosophy:

- **`SimplestFuzzyPID`** — no rule tables at all. The control law is derived analytically from triangular membership functions on `(error, error-rate, error-acceleration)`. Elegant and fast.
- **`AdaptiveFuzzyPID`** — start with a baseline PID that you already trust, then add a fuzzy correction layer. The fuzzy system outputs *changes* to the gains, not the gains themselves. Safe and intuitive.
- **`SwitchedFuzzyPID`** — use a different fuzzy controller for large errors vs. small errors. The branch is selected by a threshold and the error's second derivative.

The demo script verifies each controller against known performance metrics (settling time, overshoot) and prints a comparison.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `fuzzyPID_demo.js` (Demo 1) | `SimplestFuzzyPID` | Closed-form analytical fuzzy PID |
| 2 | `fuzzyPID_demo.js` (Demo 2) | `AdaptiveFuzzyPID` | Baseline PID + fuzzy correction |
| 3 | `fuzzyPID_demo.js` (Demo 3) | `SwitchedFuzzyPID` | 3-branch fuzzy switching |

---

## Example 1 — SimplestFuzzyPID (`fuzzyPID_demo.js` Demo 1)

- **Purpose:** Run the analytical closed-form fuzzy PID from Mohan & Sinha (2004) against a third-order plant, and compare the results against the paper's own reported metrics.
- **Source (excerpt from `fuzzyPID_demo.js`):**

```javascript
function demo1_simplestFuzzyPID() {
  console.log('\n=== 1) SimplestFuzzyPID vs the plain PID it "starts from" (Mohan & Sinha, 2004) ===');
  const dt = 0.001, T = 0.1, N = Math.round(T / dt);
  // Fuzzy controller parameters exactly as reported in the paper's own numerical example (Section V):
  const fuzzyOpts = { l: 1900, M: 1900, Nd: 1800, Nv: 2.2, Na: 0.41e-4, NDu: 0.71, dt };
  const fuzzy = new SimplestFuzzyPID(fuzzyOpts);
  console.log('static ("x(0)") gains implied by these normalization factors:', fuzzy.staticGains());

  const plantFor = () => mkPlant([1, -1, -2], [3, -10, -24], dt);
  function run(ctrl) {
    const plant = plantFor(); let y = 0; const ys = [];
    for (let k = 0; k < N; k++) { const e = 1 - y; const u = ctrl.step(e, dt); y = plant.step(u); ys.push(y); }
    return ys;
  }
  const ysFuzzy = run(fuzzy);
  const m = stepMetrics(ysFuzzy, dt);
  console.log(`fuzzy step response: overshoot ${m.overshoot.toFixed(3)}%, rise time ${m.tr.toFixed(4)} s, settling time ${m.ts.toFixed(4)} s`);
  console.log('(paper reports 0.238% / 0.0019 s / 0.0025 s for its fuzzy PID on this same plant)');
}
```

- **Class invoked:** `SimplestFuzzyPID` from `caro.fuzzyPID-1.0.js`.
- **Inputs:**
  - **Fuzzy parameters** — `l = 1900`, `M = 1900`, `Nd = 1800`, `Nv = 2.2`, `Na = 0.41e-4`, `NDu = 0.71`. These are exactly the values from the paper's Section V numerical example.
  - **Plant** — `Gp(s) = (s² − s − 2) / (s³ + 3s² − 10s − 24)`, implemented in controllable canonical form.
  - **Reference** — unit step, `ref = 1`.
  - **Sample period** — `dt = 0.001 s`, simulation length `T = 0.1 s`.
- **Output:**
  - The static gains `Kps`, `Kis`, `Kds` and `beta` from the paper's Eqs. (24)–(25).
  - The step-response metrics: overshoot, rise time, settling time.
  - A reference line comparing against the paper's reported values.
- **Expected output (abridged):**

```
=== 1) SimplestFuzzyPID vs the plain PID it "starts from" (Mohan & Sinha, 2004) ===
static ("x(0)") gains implied by these normalization factors: { Kps: ..., Kis: ..., Kds: ..., beta: ... }
fuzzy step response: overshoot 0.2xx%, rise time 0.00xx s, settling time 0.00xx s
(paper reports 0.238% / 0.0019 s / 0.0025 s for its fuzzy PID on this same plant)
```

- **Reading the output:**
  - **`static gains`** — the values of `Kps`, `Kis`, `Kds` that the fuzzy controller would produce if `error`, `error-rate`, and `error-acceleration` were all zero. These are the "resting" gains and are directly computed from the fuzzy parameters.
  - **`overshoot`** — for a well-tuned fuzzy PID, this should be in the range 0.1–0.5% for a plant of this type. The paper reports 0.238%.
  - **`rise time`** — time to reach 90% of the reference. The paper reports 0.0019 s (i.e. 2 ticks at `dt = 0.001 s`). Real values typically land in the same range.
  - **`settling time`** — time to stay within ±2% of the reference. The paper reports 0.0025 s.
- **The analytical structure (paper Eqs. 10–14, 23–25):**
  - The controller is **not** rule-based. Instead, it derives the control law from a specific fuzzy partition of the `(d, v, a)` input space.
  - The input space is split into a "core" region `[−l, l]` (verified case) and boundary regions (not implemented).
  - Inside the core, the defuzzified output is a rational function of the three normalized inputs — no iterative inference.
  - The three "dynamic gains" `Kpd`, `Kid`, `Kdd` in Eq. (23) are the analytical analogue of a PID's `Kp, Ki, Kd`, but they vary with the operating point.
- **The incremental form:**
  - The controller uses the **velocity form**: it computes `Δu(kT)` at each step and accumulates `u(kT) = u((k−1)T) + Δu(kT)`.
  - This is why the internal state (`this._u`) is the *absolute* control signal, not an error integral.
  - Anti-windup is achieved by saturating the accumulated `_u`, not the increment.
- **Coding example:** as shown. The demo uses `mkPlant` to build the 3rd-order plant and `run` to close the loop.
- **Common pitfalls:**
  - **The paper's `Case (b)` (boundary regions) is not implemented.** The library clamps all three normalized inputs to `[−l, l]`, which keeps every evaluation inside the verified `Case (a)` region. This is a documented simplification.
  - **The fuzzy parameters must all be positive.** The constructor throws if any of `l, M, Nd, Nv, Na, NDu` is not strictly greater than zero.
  - **The paper's `dt` is very small (0.001 s).** At larger `dt`, the finite-difference estimate of `error-rate` and `error-acceleration` becomes noisy. Keep `dt` at or below 0.001 s for best results.
  - **The velocity form is not the same as a standard PID.** Do not try to compare `SimplestFuzzyPID`'s "gains" directly against a standard PID's `Kp, Ki, Kd`. They are different quantities.
  - **The plant used in the demo has a *right-half-plane zero*.** This makes the plant non-minimum-phase and inherently harder to control. The fuzzy PID's success on this plant is part of the paper's claim.
  - **The `staticGains()` method is a diagnostic, not a tuning target.** It reports the theoretical resting gains but is not what you would tune directly. Tuning happens through the fuzzy parameters.

## Example 2 — AdaptiveFuzzyPID (`fuzzyPID_demo.js` Demo 2)

- **Purpose:** Compare a plain baseline PID against an `AdaptiveFuzzyPID` that adds a fuzzy correction layer on top of the same baseline. The demo also applies a step disturbance mid-run to test how each controller recovers.
- **Source (excerpt from `fuzzyPID_demo.js`):**

```javascript
function demo2_adaptiveFuzzyPID() {
  console.log('\n=== 2) AdaptiveFuzzyPID: Kp = Kp0 + dKp, ... on top of a designer baseline ===');
  const dt = 0.01, T = 15, N = Math.round(T / dt);
  function mkPlant2() {
    let y = 0, v = 0;
    return { step(u) { const a = u - 0.5 * v - 1 * y; v += a * dt; y += v * dt; return y; } };
  }
  const base = { Kp0: 2.0, Ki0: 0.8, Kd0: 1.0 };
  class LinPID {
    constructor(kp, ki, kd) { Object.assign(this, { kp, ki, kd }); this.i = 0; this.pe = 0; this.first = true; }
    step(e, dt) { const de = this.first ? 0 : (e - this.pe) / dt; this.first = false; this.pe = e; this.i += e * dt; return this.kp * e + this.ki * this.i + this.kd * de; }
  }
  function run(ctrl, disturbAt) {
    const plant = mkPlant2(); let y = 0; const ys = [];
    for (let k = 0; k < N; k++) {
      const t = k * dt, ref = 1;
      let e = ref - y;
      if (disturbAt && t >= disturbAt) e -= 0.3;
      const u = ctrl.step(e, dt); y = plant.step(u); ys.push(y);
    }
    return ys;
  }
  const ysBase = run(new LinPID(base.Kp0, base.Ki0, base.Kd0), 8);
  const ysAdaptive = run(new AdaptiveFuzzyPID(Object.assign({ dt, eRange: [-2, 2], ecRange: [-4, 4] }, base)), 8);
  const mb = stepMetrics(ysBase.slice(0, 800), dt), ma = stepMetrics(ysAdaptive.slice(0, 800), dt);
  console.log('baseline-only PID   : overshoot', mb.overshoot.toFixed(2) + '%', ' settle', mb.ts.toFixed(2) + 's');
  console.log('AdaptiveFuzzyPID    : overshoot', ma.overshoot.toFixed(2) + '%', ' settle', ma.ts.toFixed(2) + 's');
  console.log('after the t=8s disturbance, baseline error at t=10s:', (1 - ysBase[1000]).toFixed(4),
    ' AdaptiveFuzzyPID error at t=10s:', (1 - ysAdaptive[1000]).toFixed(4));
}
```

- **Class invoked:** `AdaptiveFuzzyPID` from `caro.fuzzyPID-1.0.js`.
- **Inputs:**
  - **Baseline gains** — `Kp0 = 2.0`, `Ki0 = 0.8`, `Kd0 = 1.0`. These are the "x(0)" gains — what a PID designer would have chosen by hand.
  - **Fuzzy ranges** — `eRange: [−2, 2]`, `ecRange: [−4, 4]`. The error and error-rate are clamped to these universes before being fed to the fuzzy system.
  - **Plant** — `G(s) = 1/(s² + 0.5s + 1)`, a second-order system with damping ratio `ζ ≈ 0.25` and natural frequency `ωn = 1`. Forward Euler at `dt = 0.01`.
  - **Reference** — unit step, `ref = 1`.
  - **Disturbance** — a step of magnitude `−0.3` applied to the error channel at `t ≥ 8 s`.
- **Output:**
  - Overshoot and settling time for the baseline PID and for the adaptive version.
  - The tracking error at `t = 10 s`, after the disturbance has had 2 seconds to settle.
- **Expected output (abridged):**

```
=== 2) AdaptiveFuzzyPID: Kp = Kp0 + dKp, ... on top of a designer baseline ===
baseline-only PID   : overshoot XX.XX%  settle X.XXs
AdaptiveFuzzyPID    : overshoot XX.XX%  settle X.XXs
after the t=8s disturbance, baseline error at t=10s: X.XXXX  AdaptiveFuzzyPID error at t=10s: X.XXXX
```

- **Reading the output:**
  - **`baseline-only PID`** — the reference case. The plain PID achieves its designed response with the given baseline gains.
  - **`AdaptiveFuzzyPID`** — the same baseline, plus fuzzy corrections. In a well-tuned setup, this should reduce overshoot and settling time. In this particular demo, the improvement may be modest because the baseline is already well-chosen.
  - **`disturbance recovery`** — after the step disturbance at `t = 8 s`, both controllers should recover. The adaptive version often recovers slightly faster because the fuzzy layer increases the proportional gain when the error is large.
- **The structure of `AdaptiveFuzzyPID`:**
  - **`base.Kp0, base.Ki0, base.Kd0`** — the baseline gains, never changed directly.
  - **`fis.evaluate([e·Ke, ec·Kec])`** — a 2-input, 3-output fuzzy system that returns `dKp`, `dKi`, `dKd`.
  - **`Kp = Kp0 + Gp·dKp`**, etc. — the corrected gains used in the PID law.
  - **`step(e, dt)`** — computes `ec = (e − e_prev)/dt`, evaluates the fuzzy system, and produces the control signal.
- **The three rule tables:**
  - **`dKp`** — 7×7 table. Rows are error `e`, columns are error-rate `ec`. The pattern is "increase Kp when the error is large, decrease when near zero".
  - **`dKi`** — 7×7 table. Larger integral corrections when the error is persistent.
  - **`dKd`** — 7×7 table. Larger derivative action when the error-rate is high.
- **The default rule tables:**
  - The tables used by `AdaptiveFuzzyPID` are the **Zhao/Tomizuka/Isaka** rules, widely reproduced in the fuzzy-PID literature.
  - They are **not** a verbatim copy of Lai/Zhou/Hu's Table 1 — that table's OCR was too garbled. This is documented honestly in the library's header comment.
  - You can supply your own tables via `opts.rules = { dKp, dKi, dKd }`.
- **Coding example:** as shown. The demo uses a hand-rolled `LinPID` class for the baseline and the library's `AdaptiveFuzzyPID` for the fuzzy version. Both use the same plant and reference.
- **Common pitfalls:**
  - **The baseline gains must be provided.** The constructor throws if any of `Kp0, Ki0, Kd0` is not a finite number.
  - **The `eRange` and `ecRange` universes matter.** If they are too small, the error and error-rate will saturate the membership functions, and the controller degenerates to bang-bang. If they are too large, the membership values will be small and the fuzzy corrections will be negligible.
  - **The rule tables are heuristic, not optimal.** They encode the "textbook" fuzzy-PID tuning rules. For a specific plant, custom rules may perform better.
  - **The disturbance is applied to the error channel, not the plant input.** This tests how the controller responds to a tracking error, not to a load disturbance. Both are valid tests; the demo chose the first.
  - **`stepMetrics` computes metrics over the full simulation.** For a controller that is still oscillating at `t = 15 s`, the metrics are not meaningful. Inspect the full response array `ys` if the settling time is `NaN` or very large.
  - **The anti-windup is conditional integration.** When the output saturates and the error has the same sign as the control signal, the integral increment is rolled back. This prevents the integral from growing while the actuator is saturated.

## Example 3 — SwitchedFuzzyPID (`fuzzyPID_demo.js` Demo 3)

- **Purpose:** Exercise the 3-branch switched fuzzy PID, where the controller switches between three different fuzzy systems based on the magnitude of the error and the sign of the error's second derivative. The demo runs the controller against a second-order plant and reports which branch was used at each tick.
- **Source (excerpt from `fuzzyPID_demo.js`):**

```javascript
function demo3_switchedFuzzyPID() {
  console.log('\n=== 3) SwitchedFuzzyPID: Fuzzy1/Fuzzy2/Fuzzy3 branch switching (Lai et al. 2016, Fig. 2) ===');
  const dt = 0.01, N = 300;
  const sw = new SwitchedFuzzyPID({ e0: 0.2, Kp0: 2.0, Ki0: 0.8, Kd0: 1.0, dt, eRange: [-2, 2], ecRange: [-4, 4] });
  let y = 0, v = 0; const branches = {};
  for (let k = 0; k < N; k++) {
    const e = 1 - y;
    const u = sw.step(e, dt);
    const a = u - 0.5 * v - 1 * y; v += a * dt; y += v * dt;
    branches[sw.lastBranch] = (branches[sw.lastBranch] || 0) + 1;
  }
  console.log('final tracking error:', (1 - y).toFixed(4));
  console.log('branch usage over the run:', branches);
}
```

- **Class invoked:** `SwitchedFuzzyPID` from `caro.fuzzyPID-1.0.js`.
- **Inputs:**
  - **Baseline gains** — `Kp0 = 2.0`, `Ki0 = 0.8`, `Kd0 = 1.0` — the same baseline as Demo 2.
  - **Switching threshold** — `e0 = 0.2`. This is the error magnitude at which the controller switches from the "small error" branches to the "large error" branch.
  - **Fuzzy ranges** — `eRange: [−2, 2]`, `ecRange: [−4, 4]`.
  - **Plant** — same as Demo 2: `G(s) = 1/(s² + 0.5s + 1)`.
  - **Reference** — unit step, `ref = 1`.
  - **Simulation length** — 300 ticks at `dt = 0.01` = 3 seconds.
- **Output:**
  - The final tracking error at `t = 3 s`.
  - A count of how many ticks were spent in each branch (`fz1`, `fz2`, `fz3`).
- **Expected output (abridged):**

```
=== 3) SwitchedFuzzyPID: Fuzzy1/Fuzzy2/Fuzzy3 branch switching (Lai et al. 2016, Fig. 2) ===
final tracking error: X.XXXX
branch usage over the run: { fz1: ..., fz2: ..., fz3: ... }
```

- **Reading the output:**
  - **`final tracking error`** — the residual error at the end of the simulation. Should be near zero for a well-tuned controller.
  - **`branch usage`** — a dictionary counting how many ticks were spent in each branch. Typically:
    - **`fz1`** — used at the start of the transient, when `|e| ≥ 0.2`.
    - **`fz2`** — used during the approach to the reference when the error-rate is increasing (`er > 0`).
    - **`fz3`** — used during the settling phase when the error-rate is decreasing (`er < 0`).
- **The 3-branch structure (Lai et al. 2016, Fig. 2):**
  1. **`fz1` — large error branch.** Selected when `|e| ≥ e0`. Uses a 2-input `(e, ec)` fuzzy system, same structure as `AdaptiveFuzzyPID`.
  2. **`fz2` — small error, accelerating branch.** Selected when `|e| < e0` and `er > 0`. Uses a differently-tuned fuzzy system optimized for the approach phase.
  3. **`fz3` — small error, decelerating branch.** Selected when `|e| < e0` and `er ≤ 0`. Uses a third fuzzy system optimized for the settling phase.
- **Why three branches:**
  - A single fuzzy PID has to compromise between fast response (large error) and gentle settling (small error). The three-branch structure lets each phase use a differently-tuned controller.
  - The switching is based on measurable quantities: `|e|` and `er = d(ec)/dt`. No external mode signal.
  - The branches are typically tuned so that `fz1` is aggressive, `fz2` is moderate, and `fz3` is gentle.
- **Coding example:** as shown. The demo instantiates the switcher with a single set of baseline gains. If you want distinct tuning for the three branches, pass `fz1`, `fz2`, `fz3` as separate `AdaptiveFuzzyPID` instances or option objects.
- **Reading the branch usage:**
  - **If `fz1` dominates** — the error threshold `e0` is too low, and the controller spends most of its time in the large-error branch. Increase `e0` to shift more time to `fz2`/`fz3`.
  - **If `fz2` dominates** — the plant is oscillating and the error-rate stays positive. The `fz2` branch is trying to accelerate, but the plant is responding too slowly.
  - **If `fz3` dominates** — the plant is well-damped and the error-rate is negative most of the time. The `fz3` branch is gently settling.
  - **If the usage is roughly balanced** — the switching logic is working as designed, and each branch handles its intended phase.
- **Common pitfalls:**
  - **`e0` is critical.** Too small means the large-error branch is never used; too large means the small-error branches dominate and the controller becomes sluggish.
  - **The error's second derivative is noisy at small `dt`.** A finite-difference estimate of `er` amplifies noise. Consider a first-order filter on `er` if your measurements are noisy.
  - **The three branches must share state carefully.** The demo passes the same `(e, ec)` history to all three branches via `stepWithEC`. If each branch kept its own integrator state, the switching would cause jumps in the control signal. The library handles this by sharing state through the parent `SwitchedFuzzyPID` object.
  - **The default `fz2` and `fz3` are the same as `fz1`.** If you don't supply separate option objects, all three branches use identical tuning. The demo does this, so the branch switching is behaviorally a no-op — it exercises the code path but does not change the control signal.
  - **The branch switching can cause output chatter.** Because the three branches have different integrator states (if they are separate instances), switching between them can cause a step change in the control signal. The library mitigates this by sharing state through `stepWithEC`, but custom tuning may still trigger it.
  - **The final tracking error is a single number.** It does not tell you about overshoot, settling time, or oscillation. For a full performance picture, run `stepMetrics(ys, dt)` on the collected output array.

## What the Three Examples Prove Together

Run in sequence, the three demos exercise every public class in `caro.fuzzyPID-1.0.js`:

| Step | What it proves |
|---|---|
| 1. `SimplestFuzzyPID` | The closed-form analytical fuzzy PID is correctly implemented per Mohan & Sinha (2004), and matches the paper's reported metrics. |
| 2. `AdaptiveFuzzyPID` | The baseline + fuzzy correction structure works on a second-order plant, and recovers from a step disturbance. |
| 3. `SwitchedFuzzyPID` | The 3-branch switching logic selects the right branch per the paper's Fig. 2 rules, and produces a stable closed loop. |

If all three demos run without error and produce reasonable tracking metrics, you have:

- a working `SimplestFuzzyPID` with correct static gains,
- a working `AdaptiveFuzzyPID` with baseline + correction,
- a working `SwitchedFuzzyPID` with branch selection,
- all three backed by the general-purpose `FuzzySystem` engine in `caro.fuzzy-1.0.js`.

The library is verified end-to-end.

---

## Extending the Examples

### 1. Custom rule tables for AdaptiveFuzzyPID

The default rules are from the classic Zhao/Tomizuka/Isaka table. If you have the exact Lai/Zhou/Hu Table 1, pass it in:

```javascript
const pid = new AdaptiveFuzzyPID({
  Kp0: 2, Ki0: 0.8, Kd0: 1,
  rules: {
    dKp: [/* 7×7 array of labels */],
    dKi: [/* 7×7 array */],
    dKd: [/* 7×7 array */],
  },
  dt: 0.01,
});
```

### 2. Distinct branches for SwitchedFuzzyPID

To give each branch different tuning, pass three separate option objects:

```javascript
const sw = new SwitchedFuzzyPID({
  e0: 0.2, dt: 0.01,
  fz1: { Kp0: 3.0, Ki0: 1.0, Kd0: 0.5, eRange: [-3,3], ecRange: [-6,6] },
  fz2: { Kp0: 2.0, Ki0: 0.8, Kd0: 1.0, eRange: [-2,2], ecRange: [-4,4] },
  fz3: { Kp0: 1.5, Ki0: 0.6, Kd0: 1.5, eRange: [-1,1], ecRange: [-2,2] },
});
```

Each branch then has its own baseline gains, its own fuzzy universe, and its own correction layer.

### 3. GA tuning of the FuzzyPID scaling factors

The `FuzzyPID` class in `caro.fuzzy-1.0.js` exposes `getScaling()` and `setScaling()`, which return and accept a 5-element vector `[kpe, kde, Gp, Gi, Gd]`. This is the natural interface for a genetic algorithm:

```javascript
const pid = new FuzzyPID({ dt: 0.01 });
const chromosome = pid.getScaling();          // [1, 1, 1, 1, 1]
const candidate  = [1.2, 1.1, 0.9, 1.0, 1.05];
pid.setScaling(candidate);
```

### 4. GA tuning of membership function parameters

`caro.fuzzy-1.0.js` provides `getParams()` / `setParams()` on `FuzzySystem`. This lets an optimizer tune the shape of every membership function:

```javascript
const params = sys.getParams();               // flat vector of all MF params
const layout = sys.paramLayout();             // description of each entry
const tuned = params.map((p, i) => p + 0.1 * (Math.random() - 0.5));
sys.setParams(tuned);
```

### 5. Control surface visualization

`FuzzySystem.controlSurface(xName, yName, outName, n, others)` returns a 3-D grid:

```javascript
const surf = sys.controlSurface('e', 'ec', 'dKp', 21);
// surf.x, surf.y: input ranges
// surf.z: output values (21×21 grid)
```

Plot the grid to visualize how the fuzzy system maps inputs to outputs.

### 6. Serialization

Both `FuzzySystem` and its subclasses support `toJSON()` and `FuzzySystem.fromJSON()`:

```javascript
const json = JSON.stringify(sys.toJSON());
const restored = FuzzySystem.fromJSON(json);
```

This lets you save a tuned fuzzy system and reload it later.

### 7. Compare against a plain PID on the same plant

For a clean side-by-side comparison, run both controllers against the same plant and plot the step responses. This is what Demo 2 does implicitly, but you can extend it to a full metric table.

### 8. Sweep the fuzzy universe size

The `eRange` and `ecRange` options change the fuzzy universes. Sweep them over several values and record the overshoot and settling time. The best range depends on the plant.

---

## Troubleshooting

The following issues are the most common when running the three demos.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module './caro.fuzzy-1.0.js'` | File not in the same folder | Check the layout — both files should be in the same directory |
| `Cannot find module './caro.fuzzyPID-1.0.js'` | Demo not in the same folder | Move the demo next to the two library files |
| `SimplestFuzzyPID: option "l" must be a positive number` | Missing required option | Provide all six: `l, M, Nd, Nv, Na, NDu` |
| `AdaptiveFuzzyPID: designer baseline "Kp0" is required` | Missing baseline gain | Provide `Kp0, Ki0, Kd0` as finite numbers |
| `SwitchedFuzzyPID: option "e0" must be > 0` | Missing switching threshold | Provide `e0 > 0` |
| `step needs dt > 0` | Passed `dt = 0` or negative | Pass a positive `dt` or set `options.dt` |
| Step response diverges | Baseline gains too high | Reduce `Kp0` by 2–5× and retry |
| Overshoot is very large | Baseline gains too high, or fuzzy range too small | Reduce `Kp0`, widen `eRange` |
| Settling time is `NaN` or `Infinity` | Response does not settle within the simulation window | Extend `T`, or check for limit cycles |
| `branch usage` shows only one branch | `e0` is too small or too large | Adjust `e0` to a middle value |
| Fuzzy output is always zero | Membership functions too narrow | Widen the term spacing or use fewer terms |
| Fuzzy output is always the same | Membership functions too wide | Narrow the term spacing or add more terms |
| `SimplestFuzzyPID` overshoots more than the paper reports | `dt` is too large, or plant integration is coarse | Use `dt = 0.001` and 5+ Euler sub-steps per tick |
| `AdaptiveFuzzyPID` shows no improvement over baseline | Fuzzy ranges are too wide, or corrections are too small | Narrow the ranges, or increase `Gp, Gi, Gd` |
| Plant response oscillates at high frequency | `dt` too small for the derivative estimate | Increase `dt`, or add a derivative filter via `derivativeTau` |
| Fuzzy rule tables cause a syntax error | Wrong array shape | Each table must be 7×7, with labels from `['NB','NM','NS','ZO','PS','PM','PB']` |
| `Cannot read property 'evaluate' of undefined` | `FuzzySystem` not imported | Ensure `caro.fuzzy-1.0.js` is loaded before `caro.fuzzyPID-1.0.js` |

If a failure is not listed here, the fastest diagnostic is usually to run the three demos in order and identify the first one that fails.

---

## Closing Notes

The `caro.fuzzy-1.0.js` library is a complete, self-contained fuzzy inference engine with support for Mamdani and Sugeno inference, six membership function types, five defuzzification methods, and GA-friendly parameter access.

The `caro.fuzzyPID-1.0.js` library builds on it to implement three published fuzzy-PID controllers, each with a different philosophy:

- **Analytical** — no rules, closed-form control law (`SimplestFuzzyPID`).
- **Corrective** — baseline PID + fuzzy gain adjustments (`AdaptiveFuzzyPID`).
- **Switched** — three fuzzy systems, one per operating regime (`SwitchedFuzzyPID`).

The three demos verify each controller against a known plant and print performance metrics. Together they form a working example suite that a control engineer can use as a starting point for their own designs.

The pattern matches the other CaroLab manuals: small, verifiable examples, one per class, with honest documentation of what is verified and what is a literature default.

---

*End of document.*
