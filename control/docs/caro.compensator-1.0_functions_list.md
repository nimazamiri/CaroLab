# CaroLab Control System Library

- **Name:** caro.compensator-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Classical Control System Design](#a-primary-library-for-classical-control-system-design)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
3. [CaroLab Compensator Library — Functions List](#carolab-compensator-library--functions-list)
4. [Detail Description](#detail-description)
   - [Model Construction & Conversion](#model-construction--conversion)
   - [TransferFunction — Instance Members](#transferfunction--instance-members)
   - [StateSpace — Instance Members](#statespace--instance-members)
   - [Interconnections](#interconnections)
   - [Time-Domain Responses](#time-domain-responses)
   - [Frequency-Domain Plots](#frequency-domain-plots)
   - [Stability Analysis](#stability-analysis)
   - [State-Space Analysis](#state-space-analysis)
   - [PID Tuning](#pid-tuning)
   - [Frequency-Response Compensator Design](#frequency-response-compensator-design)
   - [Library Statics & Utilities](#library-statics--utilities)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Classical Control System Design

`caro.compensator-1.0.js` (module name `Compensator.js`, also referred to as `caro.control.js`) is a dependency-free, UMD-wrapped JavaScript library for classical control system analysis and design. It is built around a **`Compensator`** instance (constructed once with global options) plus two lightweight model classes, **`TransferFunction`** (`{ num, den }`, polynomials given highest power first) and **`StateSpace`** (`{ A, B, C, D }`). Most analysis and design operations hang off a `Compensator` instance and accept either model type — or a plain number, or a `[num, den]` pair — coercing internally via `_tf`/`_ss`.

Conventions used throughout the library:

- Polynomials are arrays, highest power first: `[1, 3, 2]` ≡ `s² + 3s + 2`.
- Transfer functions are `TransferFunction { num, den }` instances.
- State-space models are `StateSpace { A, B, C, D }` instances (`toArray()` → `[A, B, C, D]`).
- Feedback is **negative unity feedback** unless stated otherwise (see `closeLoop`).
- Plot-producing functions (`bodePlot`, `rootLocusPlot`, `nyquistPlot`, `nicholsPlot`) return **plain data objects**, so results can be handed to any charting library.

The library covers six broad areas:

| Area | Examples |
|---|---|
| Model construction & conversion | `tf`, `ss`, `tf2ss`, `ss2tf` |
| Interconnections | `closeLoop`, `cascade`, `parallel` |
| Time-domain analysis | `step`, `impulse`, `responseAnalysis` |
| Frequency-domain analysis | `bodePlot`, `nyquistPlot`, `nicholsPlot`, `rootLocusPlot`, `stabilityAnalysis` |
| State-space analysis | `controllability`, `observability` |
| Compensator design | `pid`, `pid2tf`, `controller` (Lead / Lag / Lead-Lag / Parallel), `comp2tf` |

The library has no external dependencies, is UMD-wrapped (CommonJS `module.exports`, AMD `define`, or a `Compensator` global), and runs unmodified in a browser `<script>` tag or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/caro.compensator-1.0.js"></script>
<script>
  const ctrl = Compensator();
  const G = ctrl.tf([1], [1, 3, 2]);           // G(s) = 1 / (s^2 + 3s + 2)
  const margins = ctrl.stabilityAnalysis(G);
  console.log('Classification:', margins.classification);
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const Compensator = require('./caro.compensator-1.0.js');

const ctrl = Compensator();
const G = ctrl.tf([1], [1, 3, 2]);

const step = ctrl.step(G);
console.log('Final value:', step.y[step.y.length - 1]);
```

Then run it by node.js:

```
node program1.js
```

> **Note on usage:** `Compensator` is a **factory function**, not a class meant to be instantiated with several independent configurations per program — call it once (`const ctrl = Compensator(options)`) to get an object exposing `tf`, `ss`, `step`, `bodePlot`, `pid`, `controller`, etc. Every analysis/design method then takes the **system model itself** as its first argument (a `TransferFunction`, a `StateSpace`, a plain number, or a `[num, den]` pair) — there is no separate "current system" state on the `Compensator` instance the way `Sample`/`Matrix`/`Signal` hold their data. `options` accepts `{ points, freqPoints, tolerance }` (defaults `1000`, `500`, `0.02`) controlling default time-simulation sample count, default frequency-sweep sample count, and the settling-time/steady-state tolerance band used by `responseAnalysis`.
>
> The two model classes are also reachable directly as `Compensator.TransferFunction` and `Compensator.StateSpace` (e.g. for `instanceof` checks), and a grab-bag of the library's internal numeric/polynomial toolkit is exposed read-only as `Compensator.utils` for advanced use.

---

## CaroLab Compensator Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `tf` | Builds a `TransferFunction` from numerator/denominator coefficient arrays |
| 2 | `ss` | Builds a `StateSpace` model from `A, B, C, D` |
| 3 | `tf2ss` | Converts a transfer function to state space (controllable / observable / diagonal form) |
| 4 | `ss2tf` | Converts a state-space model to transfer-function coefficients for a given input/output pair |
| 5 | `TransferFunction.order` | Denominator degree (getter) |
| 6 | `TransferFunction.relativeDegree` | `deg(den) − deg(num)` |
| 7 | `TransferFunction.isProper` | Whether relative degree ≥ 0 |
| 8 | `TransferFunction.poles` | Roots of the denominator |
| 9 | `TransferFunction.zeros` | Roots of the numerator |
| 10 | `TransferFunction.lowAsymptote` | Low-frequency Bode asymptote `{ type, gain }` |
| 11 | `TransferFunction.dcGain` | Zero-frequency (DC) gain |
| 12 | `TransferFunction.evaluate` | Evaluates `G(s)` at a real or complex `s` |
| 13 | `TransferFunction.toString` | Formats as `"(num) / (den)"` |
| 14 | `StateSpace.order` | Number of states (getter) |
| 15 | `StateSpace.toArray` | Returns `[A, B, C, D]` |
| 16 | `StateSpace.eigenvalues` | Eigenvalues of `A` |
| 17 | `StateSpace.poles` | Alias of `eigenvalues` |
| 18 | `StateSpace.characteristicEquation` | Characteristic polynomial, its roots, and a factored-form expression string |
| 19 | `closeLoop` | Closes a negative (or positive) unity/general feedback loop: `T = CG / (1 ± CGH)` |
| 20 | `cascade` | Series connection of two systems |
| 21 | `parallel` | Parallel (summed) connection of two systems |
| 22 | `step` | Simulates the unit-step response |
| 23 | `impulse` | Simulates the unit-impulse response |
| 24 | `responseAnalysis` | Time-domain performance metrics for a step, impulse, or ramp input |
| 25 | `bodePlot` | Bode magnitude/phase data, with gain/phase margins |
| 26 | `nyquistPlot` | Nyquist real/imaginary trace data |
| 27 | `nicholsPlot` | Nichols-chart magnitude/phase data |
| 28 | `rootLocusPlot` | Root-locus branches over a gain sweep, with asymptotes |
| 29 | `stabilityAnalysis` | Full stability report: pole classification, Routh table, margins |
| 30 | `controllability` | Controllability matrix, rank, and verdict |
| 31 | `observability` | Observability matrix, rank, and verdict |
| 32 | `pid` | Tunes a PID controller (`'general'` loop-shaping or `'ziegler_nichols'`) |
| 33 | `pid2tf` | Converts `[kp, ki, kd]` to a `TransferFunction` (optional derivative filter) |
| 34 | `controller` | Frequency-response compensator design: Lead, Lag, Lead-Lag, or Parallel |
| 35 | `comp2tf` | Converts PID array or compensator-design coefficients to a `TransferFunction` |
| 36 | `Compensator.version` | Static library version string |
| 37 | `Compensator.TransferFunction` | Static reference to the `TransferFunction` class |
| 38 | `Compensator.StateSpace` | Static reference to the `StateSpace` class |
| 39 | `Compensator.utils` | Static grab-bag of internal numeric/polynomial helpers |

*(Low-level polynomial/matrix/complex-number arithmetic used internally throughout the library — `cadd`, `pmul`, `mmul`, `charpoly`, `expm`, etc. — is listed separately under [Internal Helpers](#internal-helpers); the subset reachable publicly via `Compensator.utils` is cross-referenced there too.)*

---

## Detail Description

### Model Construction & Conversion

- **Function:** `tf`
  **Description:** Builds a `TransferFunction` from numerator and denominator coefficient arrays (highest power first). Trims leading zero coefficients and normalizes so the denominator's leading coefficient is `1`.
  **Syntax:** `G = ctrl.tf(num, den);`
  **Input Arguments:** `num`, `den`: arrays of finite numbers (or a single number, treated as a length-1 array)
  **Output Arguments:** `G`: `TransferFunction` instance
  **Coding Example:**
  ```javascript
  const G = ctrl.tf([1], [1, 3, 2]); // G(s) = 1 / (s^2 + 3s + 2)
  ```

- **Function:** `ss`
  **Description:** Builds a `StateSpace` model from state matrices `A, B, C, D`. `B` and `C` may be given as flat arrays (auto-promoted to a column/row matrix respectively); `D` defaults to a zero matrix of the correct shape if omitted.
  **Syntax:** `sys = ctrl.ss(A, B, C, D);`
  **Input Arguments:** `A`: `n×n` array; `B`: `n×m` array or length-`n` flat array; `C`: `p×n` array or length-`n` flat array; `D`: `p×m` array (optional)
  **Output Arguments:** `sys`: `StateSpace` instance, with `sys.A`, `sys.B`, `sys.C`, `sys.D`

- **Function:** `tf2ss`
  **Description:** Converts a `TransferFunction` (or `num, den` pair) to a `StateSpace` realization. Supports controllable-canonical form (default), observable-canonical form, and a diagonal (modal) form built from a partial-fraction expansion.
  **Syntax:** `sys = ctrl.tf2ss(num, den, form);` or `sys = ctrl.tf2ss(tf, form);`
  **Input Arguments:** `num`, `den` (or a `TransferFunction`); `form`: `'controllable'` (default), `'observable'`, or `'diagonal'`
  **Output Arguments:** `sys`: `StateSpace` instance
  **Errors:** requires a proper transfer function (`deg(num) ≤ deg(den)`); a static gain (`den` has degree 0) has no states and throws

- **Function:** `ss2tf`
  **Description:** Converts a `StateSpace` model to transfer-function `[num, den]` coefficients for a chosen input/output channel pair, via the characteristic-polynomial (Faddeev–LeVerrier) method.
  **Syntax:** `[num, den] = ctrl.ss2tf(sys, input, output);`
  **Input Arguments:** `sys`: `StateSpace` instance; `input`: 1-based input index (default `1`); `output`: 1-based output index (default `1`)
  **Output Arguments:** `[num, den]`: pair of coefficient arrays

---

### TransferFunction — Instance Members

- **Function:** `order`
  **Description:** Getter — the denominator's polynomial degree.
  **Syntax:** `n = G.order;`
  **Output Arguments:** `n`: integer

- **Function:** `relativeDegree`
  **Description:** `deg(den) − deg(num)`.
  **Syntax:** `rd = G.relativeDegree();`
  **Output Arguments:** `rd`: integer

- **Function:** `isProper`
  **Description:** Whether the transfer function is proper (`relativeDegree() ≥ 0`).
  **Syntax:** `p = G.isProper();`
  **Output Arguments:** `p`: boolean

- **Function:** `poles`
  **Description:** Roots of the denominator polynomial, via the Aberth–Ehrlich method.
  **Syntax:** `p = G.poles();`
  **Output Arguments:** `p`: array of `{re, im}` complex roots

- **Function:** `zeros`
  **Description:** Roots of the numerator polynomial; returns `[]` if the numerator is identically zero.
  **Syntax:** `z = G.zeros();`
  **Output Arguments:** `z`: array of `{re, im}` complex roots

- **Function:** `lowAsymptote`
  **Description:** Describes the low-frequency Bode asymptote `G(s) ~ gain / s^type` — `type` is the net free-integrator/differentiator count, `gain` the resulting coefficient.
  **Syntax:** `{ type, gain } = G.lowAsymptote();`
  **Output Arguments:** `{ type, gain }`

- **Function:** `dcGain`
  **Description:** Zero-frequency (DC) gain, derived from `lowAsymptote()`: the finite gain when `type === 0`, `0` when `type < 0`, or `±Infinity` when `type > 0` (sign from the asymptotic gain).
  **Syntax:** `k = G.dcGain();`
  **Output Arguments:** `k`: float value (or `±Infinity`, or `0`)

- **Function:** `evaluate`
  **Description:** Evaluates `G(s)` at a real or complex point.
  **Syntax:** `v = G.evaluate(s);`
  **Input Arguments:** `s`: number or `{re, im}`
  **Output Arguments:** `v`: `{re, im}` complex value

- **Function:** `toString`
  **Description:** Formats the transfer function as `"(num) / (den)"`, using the shared polynomial-to-string formatter.
  **Syntax:** `str = G.toString();`
  **Output Arguments:** `str`: string

---

### StateSpace — Instance Members

- **Function:** `order`
  **Description:** Getter — the number of states (`A.length`).
  **Syntax:** `n = sys.order;`
  **Output Arguments:** `n`: integer

- **Function:** `toArray`
  **Description:** Returns the four state matrices as a plain array.
  **Syntax:** `[A, B, C, D] = sys.toArray();`
  **Output Arguments:** `[A, B, C, D]`

- **Function:** `eigenvalues`
  **Description:** Eigenvalues of the state matrix `A`, computed via its characteristic polynomial's roots.
  **Syntax:** `vals = sys.eigenvalues();`
  **Output Arguments:** `vals`: array of `{re, im}` complex values

- **Function:** `poles`
  **Description:** Alias of `eigenvalues()` — the system's poles.
  **Syntax:** `p = sys.poles();`
  **Output Arguments:** `p`: array of `{re, im}` complex values

- **Function:** `characteristicEquation`
  **Description:** Builds the characteristic polynomial of `A`, its roots, and a human-readable factored expression (e.g. `"(s + 1)(s + 2)"`). The returned object also has its own `toString()`, so it can be used directly as a string.
  **Syntax:** `eq = sys.characteristicEquation(variable);`
  **Input Arguments:** `variable`: symbol to use in the expression (default `'s'`)
  **Output Arguments:** `eq`: `{ expression, polynomial, roots, polynomialString, toString() }`

---

### Interconnections

- **Function:** `closeLoop`
  **Description:** Closes a feedback loop: `T = C·G / (1 + C·G·H)` for negative feedback (the default), or with the sign flipped for positive feedback. `closeLoop(G, C)` and `closeLoop(C, G)` are equivalent (multiplication commutes). Omitting `C` or `H` treats them as unity (`1`).
  **Syntax:** `T = ctrl.closeLoop(G, C, H, opts);`
  **Input Arguments:** `G`: forward-path system; `C`: controller (optional, default unity); `H`: feedback-path system (optional, default unity); `opts.positiveFeedback`: boolean (default `false`)
  **Output Arguments:** `T`: `TransferFunction` instance (the closed-loop system)

- **Function:** `cascade`
  **Description:** Series connection `sys2(sys1(u))`. If both inputs are `StateSpace` instances, builds a combined state-space realization (block-diagonal `A`, coupled `B`/`C`); otherwise multiplies the two systems as transfer functions.
  **Syntax:** `S = ctrl.cascade(sys1, sys2);`
  **Input Arguments:** `sys1`, `sys2`: `TransferFunction` or `StateSpace` instances (or coercible)
  **Output Arguments:** `S`: `StateSpace` instance (if both inputs were `StateSpace`) or `TransferFunction` instance

- **Function:** `parallel`
  **Description:** Parallel (summed) connection `sys1 + sys2`. If both inputs are `StateSpace` instances, builds a block-diagonal-`A` realization with side-by-side `B`/`C`; otherwise adds the two systems as transfer functions (common-denominator sum).
  **Syntax:** `S = ctrl.parallel(sys1, sys2);`
  **Input Arguments:** `sys1`, `sys2`: `TransferFunction` or `StateSpace` instances (or coercible)
  **Output Arguments:** `S`: `StateSpace` instance (if both inputs were `StateSpace`) or `TransferFunction` instance

---

### Time-Domain Responses

- **Function:** `step`
  **Description:** Simulates the unit-step response, internally converting the system to state space and integrating with a zero-order-hold discretization (via matrix exponential) over an automatically chosen time grid.
  **Syntax:** `result = ctrl.step(sys, opts);`
  **Input Arguments:** `sys`: system model; `opts.input`, `opts.output`: 1-based channel indices (default `1`); `opts.n`: sample count override; `opts.tEnd`: simulation end time override
  **Output Arguments:** `result`: `{ type: 'step', t, y, dt, tEnd }`

- **Function:** `impulse`
  **Description:** Simulates the unit-impulse response, same simulation machinery as `step` but with an impulsive initial-state kick (`x₀ = B`) instead of a held input.
  **Syntax:** `result = ctrl.impulse(sys, opts);`
  **Input Arguments:** `sys`: system model; `opts` as in `step`
  **Output Arguments:** `result`: `{ type: 'impulse', t, y, dt, tEnd }`

- **Function:** `responseAnalysis`
  **Description:** Computes standard time-domain performance metrics for a step, impulse, or ramp input. For `'step'`: delay time, rise time (10–90%), peak time/value, 2%-band settling time, percent overshoot, steady-state value and error. For `'impulse'`: peak time/value, settling time, and area (= DC gain). For `'ramp'`: steady-state tracking error (numerically integrates the step response to synthesize the ramp response). Returns an early `{ stable: false, message }` if the system is not asymptotically stable.
  **Syntax:** `metrics = ctrl.responseAnalysis(sys, ut, opts);`
  **Input Arguments:** `sys`: system model; `ut`: `'step'` (default), `'impulse'`, or `'ramp'`; `opts.tolerance`: settling-time band (default from `Compensator` options, `0.02`); other `opts` as in `step`
  **Output Arguments:** `metrics`: object with the metrics above, plus `.array`/`.arrayLabels` convenience parallel arrays
  **Errors:** `responseAnalysis: ut must be 'step', 'impulse' or 'ramp'`

---

### Frequency-Domain Plots

Each accepts a `TransferFunction`-coercible system and an `opts` object controlling the frequency sweep: `opts.n`/`freqPoints` (sample count), `opts.wmin`/`wmax` (explicit sweep bounds), `opts.extraDecades` (padding beyond the auto-detected pole/zero range).

- **Function:** `bodePlot`
  **Description:** Computes magnitude (linear and dB) and phase (continuous, degrees) over a logarithmically-spaced frequency sweep automatically centered on the system's poles/zeros. Also computes gain and phase margins by default.
  **Syntax:** `data = ctrl.bodePlot(sys, opts);`
  **Input Arguments:** `sys`: system model; `opts.margins`: set `false` to skip margin computation
  **Output Arguments:** `data`: `{ type: 'bode', w, magnitude, magnitudeDb, phase, margins? }`

- **Function:** `nyquistPlot`
  **Description:** Computes the Nyquist trace — real and imaginary parts of `G(jω)` over the frequency sweep, plus the negative-frequency mirror and the critical point `(-1, 0)`.
  **Syntax:** `data = ctrl.nyquistPlot(sys, opts);`
  **Output Arguments:** `data`: `{ type: 'nyquist', w, real, imag, realNeg, imagNeg, criticalPoint }`

- **Function:** `nicholsPlot`
  **Description:** Computes Nichols-chart data — magnitude (dB) plotted against phase (degrees) over the frequency sweep.
  **Syntax:** `data = ctrl.nicholsPlot(sys, opts);`
  **Output Arguments:** `data`: `{ type: 'nichols', w, magnitudeDb, phase }`

- **Function:** `rootLocusPlot`
  **Description:** Traces the root locus of `1 + k·L(s) = 0` for open-loop `L = sys` as `k` sweeps from `0` to an automatically (or explicitly) chosen maximum, continuing each branch from the previous gain's roots for smooth tracking. Also reports the asymptote centroid and angles when the relative degree is positive.
  **Syntax:** `data = ctrl.rootLocusPlot(sys, opts);`
  **Input Arguments:** `sys`: open-loop system; `opts.kmax`: maximum gain (auto-estimated if omitted); `opts.n`: number of gain steps (default `400`)
  **Output Arguments:** `data`: `{ type: 'rootlocus', k, roots, branches, poles, zeros, asymptotes }` — `branches`: array of `{re: [], im: []}` per root branch; `asymptotes`: `{ centroid, anglesDeg }` or `null`

---

### Stability Analysis

- **Function:** `stabilityAnalysis`
  **Description:** Produces a full stability report for a system treated as the open-loop transfer function `L(s)`: classifies poles (asymptotically stable / marginally stable / unstable, including a check for repeated imaginary-axis poles), builds the Routh array (with the all-zero-row and zero-pivot special cases handled), computes gain/phase margins, and — where the unity-feedback closed loop itself is well-posed — reports whether that closed loop is stable.
  **Syntax:** `report = ctrl.stabilityAnalysis(sys);`
  **Input Arguments:** `sys`: system model
  **Output Arguments:** `report`: `{ stable, classification, poles, zeros, rhpPoleCount, imaginaryAxisPoles, dominantPole, routh: { table, firstColumn, signChanges, notes }, openLoopMargins, summary }` — `summary` is a one-line human-readable description

---

### State-Space Analysis

- **Function:** `controllability`
  **Description:** Builds the controllability matrix `[B, AB, A²B, ...]` and its numerical rank (via full-pivoting Gaussian elimination), classifying the system as fully controllable or reporting the count of uncontrollable states.
  **Syntax:** `report = ctrl.controllability(sys);`
  **Input Arguments:** `sys`: `StateSpace` instance (or coercible)
  **Output Arguments:** `report`: `{ matrix, rank, states, controllable, uncontrollableStates }`

- **Function:** `observability`
  **Description:** Builds the observability matrix `[C; CA; CA²; ...]` and its numerical rank, classifying the system as fully observable or reporting the count of unobservable states.
  **Syntax:** `report = ctrl.observability(sys);`
  **Input Arguments:** `sys`: `StateSpace` instance (or coercible)
  **Output Arguments:** `report`: `{ matrix, rank, states, observable, unobservableStates }`

---

### PID Tuning

- **Function:** `pid`
  **Description:** Tunes a PID controller for a plant `G(s)` via one of two methods. `'general'` (loop-shaping): places the gain crossover at a target frequency with a target phase margin (`Ti = ratio·Td` constraint), searching candidate crossover frequencies until a stabilizing, proper closed loop is found. `'ziegler_nichols'`: uses the classical ultimate-gain (closed-loop) rules if the plant has a `-180°` phase crossing, otherwise falls back to the reaction-curve (open-loop, steepest-tangent) rules. Returns a plain `[kp, ki, kd]` array (parallel form `C(s) = kp + ki/s + kd·s`) carrying a non-enumerable `.info` object with the method's internal details (crossover frequency, achieved margin, ultimate gain/period, reaction-curve parameters, etc.).
  **Syntax:** `[kp, ki, kd] = ctrl.pid(Gs, method, opts);`
  **Input Arguments:** `Gs`: plant model; `method`: `'general'` (default) or `'ziegler_nichols'` (alias `'zn'`); `opts` (general): `phaseMargin` (default `60`), `ratio` = `Ti/Td` (default `4`), `crossover` (explicit target, Hz); `opts` (Ziegler–Nichols): none required
  **Output Arguments:** `[kp, ki, kd]`: array with non-enumerable `.info`
  **Errors:** `pid: unknown method '...'`; general — `pid(general): no stabilising PID found; try opts.crossover / opts.phaseMargin.`; Ziegler–Nichols — throws if the plant is open-loop unstable with no `-180°` crossover, or if no positive step-response slope / apparent dead time is found (reaction-curve case)

- **Function:** `pid2tf`
  **Description:** Converts a `[kp, ki, kd]` array to a `TransferFunction`. If `opts.N` is given (and `kd ≠ 0`), adds a first-order derivative filter `kd·N·s / (s + N)` instead of an ideal (unfiltered) derivative term.
  **Syntax:** `C = ctrl.pid2tf(pidArray, opts);`
  **Input Arguments:** `pidArray`: `[kp, ki, kd]`; `opts.N`: derivative filter pole frequency (optional)
  **Output Arguments:** `C`: `TransferFunction` instance

---

### Frequency-Response Compensator Design

- **Function:** `controller`
  **Description:** Designs a frequency-response (Bode-shaping) compensator for a plant `G(s)`. `'Lead'` adds phase near the target crossover to reach a target phase margin (`C = K(1 + Ts) / (1 + αTs)`), iterating with extra safety margin if the first attempt undershoots. `'Lag'` lifts gain at low frequency without disturbing the phase near crossover (`C = K(1 + Ts) / (1 + βTs)`). `'Lead-Lag'` combines both (a lead stage for phase margin, a lag stage — `λ` set from `opts.Kss` or `opts.beta`, default `10` — for steady-state gain). `'Parallel'` re-expresses the same Lead-Lag compensator as a partial-fraction sum `C = K_∞ + Σ rᵢ/(s − pᵢ)` (requires real, distinct compensator poles). `opts.Kss` (desired static error constant) can be given instead of `opts.K` to solve for the gain automatically from the plant's low-frequency asymptote.
  **Syntax:** `design = ctrl.controller(Gs, method, opts);`
  **Input Arguments:** `Gs`: plant model; `method`: `'Lead'`, `'Lag'`, `'Lead-Lag'`, or `'Parallel'`; `opts.phaseMargin` (default `45`), `opts.safety` (default `5`), `opts.K` (default `1`) or `opts.Kss`, `opts.beta` (Lead-Lag/Parallel low-frequency gain lift, default `10`)
  **Output Arguments:** `design`: method-specific object always including `num`/`den` (feedable to `comp2tf`/`tf`), `achieved` margins, and `warnings`; `'Lead'`/`'Lag'` also give `{alpha or beta, T, zero, pole, ...}`; `'Lead-Lag'` gives nested `{lead, lag}`; `'Parallel'` gives `{Kinf, branches: [{gain, pole}, ...], leadLag}`
  **Errors:** `controller: unknown method '...'`; `controller: plant has a differentiating low-frequency behaviour; Kss undefined.`; `controller(Lead): plant has no gain crossover at this gain; adjust K/Kss.`; `controller(Lead): could not locate the new crossover frequency.`; `controller(Lag): no frequency with |KG|>1 and enough phase; a lag network cannot reach the target margin.`; `controller(Parallel): compensator has complex poles.`

- **Function:** `comp2tf`
  **Description:** Converts either a `[kp, ki, kd]` PID array (via `pid2tf`) or a `controller(...)`-shaped design object (including the `'parallel'` partial-fraction form) into a single `TransferFunction`.
  **Syntax:** `C = ctrl.comp2tf(coeffs);`
  **Input Arguments:** `coeffs`: `[kp, ki, kd]` array, a `{num, den}`-bearing design object, or a `{type: 'parallel', ...}` object
  **Output Arguments:** `C`: `TransferFunction` instance
  **Errors:** `comp2tf: unrecognised coefficient object`

---

### Library Statics & Utilities

- **Function:** `Compensator.version`
  **Description:** Static string giving the library's version.
  **Syntax:** `v = Compensator.version;`
  **Output Arguments:** `v`: string (`'0.1'`)

- **Function:** `Compensator.TransferFunction`
  **Description:** Static reference to the `TransferFunction` class itself — useful for `instanceof` checks or constructing without going through a `Compensator` instance.
  **Syntax:** `Compensator.TransferFunction;`

- **Function:** `Compensator.StateSpace`
  **Description:** Static reference to the `StateSpace` class itself.
  **Syntax:** `Compensator.StateSpace;`

- **Function:** `Compensator.utils`
  **Description:** Static object exposing a subset of the library's internal numeric/polynomial toolkit for advanced use: `proots` (polynomial roots, Aberth–Ehrlich), `pmul`/`padd` (polynomial multiply/add), `pval`/`pvalC` (real/complex polynomial evaluation), `pdivmod` (polynomial division with remainder), `pstr` (polynomial-to-string formatting), `charpoly` (characteristic polynomial, Faddeev–LeVerrier), `expm` (matrix exponential), `mmul` (matrix multiply), `mrank` (numerical matrix rank), `partialFractions` (partial-fraction expansion; requires distinct poles), `routhTable` (Routh array construction), `computeMargins` (gain/phase margin computation), `makeFR` (frequency-response evaluator factory: `.eval`, `.mag`, `.magDb`, `.phase`).
  **Syntax:** `const { proots, charpoly, computeMargins, ... } = Compensator.utils;`
  **Output Arguments:** object of named functions (see description)

---

### Internal Helpers

These are implementation details, not part of the public API (aside from the subset re-exported via `Compensator.utils`, cross-referenced below), but documented here for maintainers extending the library.

| Function | Description |
|---|---|
| `cadd`, `csub`, `cmul`, `cdiv`, `cabs` | Complex-number arithmetic on `{re, im}` objects |
| `fmt(x)` | Formats a number to 6 significant figures for display strings, normalizing `-0` to `'0'` |
| `ptrim(p, tol)` | Strips leading near-zero coefficients from a polynomial |
| `padd(a, b)` *(public via `Compensator.utils`)* | Adds two polynomials of possibly different degree |
| `pscale(a, k)` | Scales every coefficient of a polynomial by `k` |
| `pmul(a, b)` *(public via `Compensator.utils`)* | Multiplies two polynomials (convolution) |
| `pval(p, x)` *(public via `Compensator.utils`)* | Evaluates a polynomial at a real `x` (Horner's method) |
| `pvalC(p, z)` *(public via `Compensator.utils`)* | Evaluates a polynomial at a complex `z` |
| `pder(p)` | Derivative of a polynomial |
| `pdivmod(a, b)` *(public via `Compensator.utils`)* | Polynomial long division, returning `{ q, r }` |
| `pfromRoots(roots)` | Reconstructs a real polynomial from a list of complex roots |
| `pstr(p, v)` *(public via `Compensator.utils`)* | Formats a polynomial as a human-readable string in variable `v` (default `'s'`) |
| `proots(p, init, sort)` *(public via `Compensator.utils`)* | Polynomial root-finder (Aberth–Ehrlich simultaneous iteration), with optional initial guesses (for locus continuation) and optional sorting |
| `mzeros`, `meye`, `mT`, `madd`, `mscale`, `mmul` *(mmul public)*, `mvec`, `mclone`, `isMatrix` | Basic dense-matrix arithmetic helpers (zeros/identity/transpose/add/scale/multiply/matrix-vector multiply/clone/type-check) |
| `blockDiag(A, B)` | Block-diagonal composition of two matrices, used by `cascade`/`parallel` on `StateSpace` inputs |
| `hstack(A, B)` | Horizontal concatenation of two matrices |
| `charpoly(A)` *(public via `Compensator.utils`)* | Characteristic polynomial of `A` via Faddeev–LeVerrier |
| `expm(A)` *(public via `Compensator.utils`)* | Matrix exponential via scaling-and-squaring with a truncated Taylor series |
| `mrank(M)` *(public via `Compensator.utils`)* | Numerical rank via Gaussian elimination with full pivoting |
| `partialFractions(num, den)` *(public via `Compensator.utils`)* | Partial-fraction expansion `N/D = direct + Σ rᵢ/(s − pᵢ)`; throws `Repeated poles detected: this operation requires distinct poles.` |
| `logspace(a, b, n)` | `n` logarithmically-spaced points from `10^a` to `10^b` |
| `tf2ssCanonical(tf, form)` / `tf2ssDiagonal(tf)` | Backing implementations for `tf2ss`'s controllable/observable and diagonal forms |
| `ss2tfCoeffs(sys, inIdx, outIdx)` | Backing implementation for `ss2tf` |
| `autoTimeGrid(poles, opts)` | Chooses a simulation end time / sample count from a pole list's time constants and oscillation periods |
| `zohMatrices(ss, dt, inIdx)` | Zero-order-hold discretization of a state-space model for one input channel, via `expm` |
| `simulateStep(ss, tEnd, n, inIdx, outIdx)` / `simulateImpulse(...)` | Backing time-stepping simulators for `step`/`impulse` |
| `makeFR(tf)` *(public via `Compensator.utils`)* | Builds a frequency-response evaluator `{ eval, mag, magDb, phase }` for a transfer function |
| `freqRange(tf, opts)` | Auto-selects a `[lo, hi]` angular-frequency sweep range from a system's poles/zeros |
| `findCrossings(fn, ws, target)` | Bisection-refined level-crossing finder over a sampled function |
| `phaseCrossings(fr, ws, targetDeg)` | Finds all frequencies where phase crosses a target value modulo `360°` |
| `computeMargins(tf)` *(public via `Compensator.utils`)* | Backing implementation for gain/phase margin computation used by `bodePlot`/`stabilityAnalysis`/PID tuning |
| `routhTable(den)` *(public via `Compensator.utils`)* | Builds the Routh array, handling all-zero rows (auxiliary-polynomial substitution) and zero-pivot rows (epsilon substitution) |
| `tfMul(a, b)`, `tfAdd(a, b)`, `tfScale(a, k)` | Transfer-function multiply/add/scale, used internally by `cascade`/`parallel`/`controller` |
| `isStablePoles(poles, tol)` | Checks that every pole has real part `< -tol` |
| `Compensator#_tf(sys)` / `Compensator#_ss(sys)` | Coerce any accepted system representation (`TransferFunction`, `StateSpace`, number, `[num, den]`) to the requested model type |
| `Compensator#_poles(sys)` | Returns eigenvalues (if `StateSpace`) or transfer-function poles, without a full type conversion |
| `Compensator#_freq(sys, opts)` | Shared setup for the frequency-domain plot methods: coerces to `TransferFunction`, builds the frequency sweep and response evaluator |
| `Compensator#_resp(kind, sys, opts)` | Shared backing implementation for `step`/`impulse` |
| `Compensator#_pidGeneral` / `Compensator#_pidZN` | Backing implementations for the two `pid()` methods |
| `Compensator#_leadOnce`, `_designLead`, `_designLag`, `_designLeadLag`, `_achieved` | Backing implementations for `controller()`'s Lead/Lag/Lead-Lag design and achieved-margin reporting |

---
