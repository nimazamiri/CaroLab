# CaroLab Neuro-Fuzzy PID Library

- **Name:** neuroFuzzyPID-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for ANFIS-Scheduled PID Control](#a-primary-library-for-anfis-scheduled-pid-control)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
   - [Debugging Programs](#debugging-programs)
3. [CaroLab NeuroFuzzyPID Library — Functions List](#carolab-neurofuzzypid-library--functions-list)
4. [Detail Description](#detail-description)
   - [Construction & Initialization](#construction--initialization)
   - [Gain Scheduling & Control](#gain-scheduling--control)
   - [Training](#training)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for ANFIS-Scheduled PID Control

`neuroFuzzyPID.js` is a dependency-free, UMD-wrapped library built around a single **`NeuroFuzzyPID`** class: a PID controller whose gain-scheduling surface — `Kp, Ki, Kd = ANFIS(e, edot)` — is a **trainable `ANFIS` network** (from `anfis.js`) instead of a fixed, hand-written fuzzy rule table. The controller itself follows the same `u = Kp·e + Ki·∫e dt + Kd·edot` structure as the other PID controllers in this suite; what differs is that the gain surface is learned rather than designed.

This is the neuro-fuzzy-PID idea from Hong et al. (2012) — an ANFIS front end feeding a PID (their Fig. 3 / Eqs. 1–7) — implemented here as the more common **"neuro-fuzzy gain scheduler"** variant: the ANFIS directly outputs the three gains rather than a setpoint correction, which plugs straight into the same `step`/`gains`/anti-windup pattern used by `fuzzyPID.js`'s controllers.

> **Note on relation to other libraries in this suite:** `neuroFuzzyPID.js` requires only `anfis.js` — it is independent of `fuzzy.js` and `fuzzyPID.js`. Its `static trainFromGainSchedule()` method, however, is specifically designed to take an existing gain-scheduling controller (such as an `AdaptiveFuzzyPID`/`SimplestFuzzyPID` from `fuzzyPID.js`) as a **"teacher"** to imitate, letting a neuro-fuzzy controller be trained to reproduce an already-tuned fuzzy PID's behavior.

The library covers three broad areas:

| Area | Examples |
|---|---|
| Construction | `new NeuroFuzzyPID({ eRange, ecRange, eTerms, ecTerms, anfis, Kp0, Ki0, Kd0 })`, `setBiasGains` |
| Gain-scheduled control | `gains`, `step`, `stepWithEC`, `reset` |
| Training | `train`, `NeuroFuzzyPID.trainFromGainSchedule` |

The library has no external dependencies beyond `anfis.js`, is UMD-wrapped (CommonJS `module.exports`, requiring `./anfis.js`, or a `NeuroFuzzyPIDLib` global built from `root.ANFISLib`), and runs unmodified in a browser `<script>` tag (after `anfis.js`) or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/anfis.js"></script>
<script type="text/javascript" src="js/neuroFuzzyPID.js"></script>
<script>
  const { NeuroFuzzyPID } = NeuroFuzzyPIDLib;
  const pid = new NeuroFuzzyPID({ eRange: [-3, 3], ecRange: [-3, 3], dt: 0.01 });
  pid.train([{ e: 1, ec: 0, Kp: 4, Ki: 0.5, Kd: 1 } /* , ... */], { epochs: 200 });
  const u = pid.step(error);
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const { NeuroFuzzyPID } = require('./neuroFuzzyPID.js'); // requires ./anfis.js too

const pid = new NeuroFuzzyPID({ eRange: [-3, 3], ecRange: [-3, 3], dt: 0.01 });
pid.train([{ e: 1, ec: 0, Kp: 4, Ki: 0.5, Kd: 1 } /* , ... */], { epochs: 200 });

const u = pid.step(error);
console.log('Control signal:', u);
```

Then run it by node.js:

```
node program1.js
```

Learning to imitate an existing fuzzy PID (by sampling its gain schedule):

```javascript
const { NeuroFuzzyPID } = require('./neuroFuzzyPID.js');
const { AdaptiveFuzzyPID } = require('./fuzzyPID.js');

const teacher = new AdaptiveFuzzyPID({ Kp0: 1, Ki0: 0.5, Kd0: 0.03 });
const { student } = NeuroFuzzyPID.trainFromGainSchedule(teacher, { epochs: 150 });

const u = student.step(error);
```

> **Note on usage:** `NeuroFuzzyPID` wraps an internal `ANFIS` (`pid.anfis`) with 2 inputs (`e`, `ec`/`edot`) and 3 named outputs (`Kp`, `Ki`, `Kd`). It can be built fresh (optionally seeded to behave like a fixed PID at given gains via `Kp0`/`Ki0`/`Kd0` before any training happens, using `setBiasGains`), supplied a pre-built/pre-trained `ANFIS` via `options.anfis`, or produced already-trained by `NeuroFuzzyPID.trainFromGainSchedule()`. Once built, `step(e, dt)` behaves exactly like the other PID controllers in this suite — call once per sample, get back the saturated control signal, with `.last` holding the full result and `.reset()` clearing the integral/derivative state (not the learned ANFIS parameters).

### Debugging Programs

- The constructor performs no eager validation of its own beyond what `ANFIS`'s constructor enforces when `options.anfis` is not supplied (see `anfis-1.0_functions_list.md`'s Debugging Programs section for `ANFIS`'s own errors, e.g. a missing `ranges`) — `eRange`/`ecRange`/`eTerms`/`ecTerms` all have defaults (`[-3, 3]` and `5` terms each) and are otherwise passed straight through.
- `step`/`stepWithEC` throw `NeuroFuzzyPID.step needs dt > 0 (pass it or set options.dt)` / `NeuroFuzzyPID.stepWithEC needs dt > 0 (pass it or set options.dt)` if no valid sample time is available from either the call or `options.dt`.
- An **untrained** `NeuroFuzzyPID` (no `Kp0`/`Ki0`/`Kd0` given at construction, and no training run yet) behaves like a PID with **all gains at zero** — every consequent parameter starts at zero inside `ANFIS`'s constructor — rather than throwing; pass `Kp0`/`Ki0`/`Kd0` (via `setBiasGains`, called automatically if any is present in the constructor options) if you want a sensible fallback behavior before training completes.
- `train`/`trainFromGainSchedule` inherit `ANFIS.train`'s numerical behavior: the least-squares consequent solve is ridge-regularized (see `anfis-1.0_functions_list.md`) rather than throwing on a small/collinear sample set, and premise widths are floored at `1e-6` rather than collapsing to zero.
- `gains(e, ec)` accepts whatever `this.anfis.evaluate([e, ec])` returns — if `options.anfis` was supplied without `outputNames: ['Kp','Ki','Kd']`, `evaluate` returns a plain array and `gains()` maps its first three entries positionally (`out[0] → Kp`, `out[1] → Ki`, `out[2] → Kd`); supply `outputNames` yourself if you want `evaluate()` to also work correctly outside this class.
- `train`'s sample objects accept **either** `ec` **or** `edot` as the error-rate key (`s.ec !== undefined ? s.ec : s.edot`) and **either** individual `Kp`/`Ki`/`Kd` keys **or** a `target: [Kp, Ki, Kd]` array — passing neither silently trains toward `undefined`/`NaN` targets rather than throwing, so ensure every sample supplies one form consistently.

---

## CaroLab NeuroFuzzyPID Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `new NeuroFuzzyPID` | PID controller whose Kp/Ki/Kd gain surface is a trainable ANFIS on (e, edot) |
| 2 | `setBiasGains` | Initializes every rule's consequent bias to fixed gains (untrained baseline behavior) |
| 3 | `reset` | Clears the controller's integral/derivative-history state |
| 4 | `gains` | Scheduled Kp/Ki/Kd for a given error/error-rate, via the internal ANFIS |
| 5 | `step` | One controller update, computing the error-rate from the previous call internally |
| 6 | `stepWithEC` | One controller update with a pre-computed error-rate |
| 7 | `train` | Trains the internal ANFIS on `{e, ec/edot, Kp, Ki, Kd}` (or `target`) samples |
| 8 | `NeuroFuzzyPID.trainFromGainSchedule` | Static — samples an existing gain-scheduling controller on a grid and trains a (new or existing) NeuroFuzzyPID to imitate it |

---

## Detail Description

### Construction & Initialization

- **Function:** `new NeuroFuzzyPID(options)`
  **Description:** Constructs the controller, building a 2-input `(e, ec)` → 3-output `(Kp, Ki, Kd)` `ANFIS` network internally (unless one is supplied). If any of `Kp0`/`Ki0`/`Kd0` is given, immediately calls `setBiasGains` so the **untrained** controller already behaves like a fixed PID at those gains rather than outputting all zeros.
  **Syntax:** `pid = new NeuroFuzzyPID(options);`
  **Input Arguments:** `options.eRange`, `options.ecRange`: physical universes for `(error, error-rate)` fed to the ANFIS (default `[-3, 3]` each); `options.eTerms`, `options.ecTerms`: number of Gaussian terms per input (default `5` each); `options.anfis`: a caller-supplied `ANFIS` (2 inputs, `outputNames: ['Kp','Ki','Kd']`) instead of building one from the range/term options; `options.Kp0`, `options.Ki0`, `options.Kd0`: optional — if given, every rule's consequent bias is initialized to these (each defaulting to `0` if the others are given but it isn't), so training then *refines* an already-sensible starting point; `options.dt`, `options.outLimits`, `options.integralLimit`, `options.derivativeTau`: as in a normal PID
  **Output Arguments:** `pid`: `NeuroFuzzyPID` instance, with `pid.anfis` exposing the underlying `ANFIS`

- **Function:** `setBiasGains`
  **Description:** Sets every rule's consequent **bias** term (the "at `x = 0`" part of each rule's linear consequent) to fixed gains, leaving every linear coefficient at `0`. This makes an untrained (or freshly re-biased) controller behave like a flat, fixed-gain PID at exactly `{Kp0, Ki0, Kd0}` everywhere in the input space, until training reshapes the surface.
  **Syntax:** `pid.setBiasGains({ Kp0, Ki0, Kd0 });` *(chainable)*
  **Input Arguments:** `{ Kp0, Ki0, Kd0 }`: target gains (each default `0`)
  **Output Arguments:** `pid`: the same `NeuroFuzzyPID` (for chaining)

---

### Gain Scheduling & Control

- **Function:** `reset`
  **Description:** Clears the controller's integral accumulator, previous-error, derivative-filter state, and `.last` result. Does **not** reset the learned `ANFIS` parameters.
  **Syntax:** `pid.reset();` *(chainable)*
  **Output Arguments:** `pid`: the same `NeuroFuzzyPID` (for chaining)

- **Function:** `gains`
  **Description:** Evaluates the internal `ANFIS` at a given `(e, ec)` and returns the three scheduled gains, without touching controller state.
  **Syntax:** `g = pid.gains(e, ec);`
  **Input Arguments:** `e`: error; `ec`: error rate
  **Output Arguments:** `g`: `{ Kp, Ki, Kd }`

- **Function:** `step`
  **Description:** One controller update: computes the error-rate `ec` from the previous call (with optional first-order derivative filtering via `derivativeTau`), schedules gains via `gains()`, integrates with a clamp and conditional-integration anti-windup, and saturates the output to `outLimits`.
  **Syntax:** `u = pid.step(e, dt);`
  **Input Arguments:** `e`: error (`ref − measurement`); `dt`: sample time (falls back to `options.dt`)
  **Output Arguments:** `u`: the saturated control signal; also stored on `pid.last` as `{ u, e, ec, integral, gains }`
  **Errors:** `NeuroFuzzyPID.step needs dt > 0 (pass it or set options.dt)`

- **Function:** `stepWithEC`
  **Description:** Like `step`, but takes a pre-computed error-rate directly instead of differencing against the previous call — e.g. to share one `e`/`ec` history with another controller.
  **Syntax:** `u = pid.stepWithEC(e, ec, dt);`
  **Input Arguments:** `e`: error; `ec`: pre-computed error-rate; `dt`: sample time (falls back to `options.dt`)
  **Output Arguments:** `u`: the saturated control signal; also stored on `pid.last`
  **Errors:** `NeuroFuzzyPID.stepWithEC needs dt > 0 (pass it or set options.dt)`

---

### Training

- **Function:** `train`
  **Description:** Trains the internal `ANFIS` on samples describing the desired gain surface, via `ANFIS.train`'s hybrid-learning loop (least-squares consequents + gradient-descent premises). Each sample's error-rate may be given as `ec` or `edot`, and its targets either as individual `Kp`/`Ki`/`Kd` keys or a `target: [Kp, Ki, Kd]` array.
  **Syntax:** `result = pid.train(samples, opts);`
  **Input Arguments:** `samples`: array of `{ e, ec|edot, Kp, Ki, Kd }` or `{ e, ec|edot, target: [Kp, Ki, Kd] }`; `opts`: passed straight through to `ANFIS.train` (`epochs`, `lr`, `lrDecay`, `onEpoch`)
  **Output Arguments:** `result`: `ANFIS.train`'s result, `{ history }` (array of per-epoch RMSE)

- **Function:** `NeuroFuzzyPID.trainFromGainSchedule`
  **Description:** Static. Samples an existing gain-scheduling **teacher** controller (anything exposing a `.gains(e, ec)` method — e.g. an `AdaptiveFuzzyPID`/`SimplestFuzzyPID` from `fuzzyPID.js`) on a regular `gridE × gridEC` grid, then trains a `NeuroFuzzyPID` (a new one by default, or a caller-supplied `student` to continue training) to reproduce it — the "train the neuro-fuzzy net to behave like our previous fuzzy PID controller" workflow.
  **Syntax:** `{ student, data, history } = NeuroFuzzyPID.trainFromGainSchedule(teacher, o);`
  **Input Arguments:** `teacher`: object with `gains(e, ec) -> {Kp, Ki, Kd}`; `o.eRange`, `o.ecRange`: sampling ranges (default `[-3, 3]` each); `o.gridE`, `o.gridEC`: grid resolution per axis (default `15` each); `o.student`: an existing `NeuroFuzzyPID` to keep training instead of constructing a new one; `o.trainOpts`: passed straight to `ANFIS.train` (default `{ epochs: o.epochs || 150, lr: o.lr }`); other `o` keys are forwarded to `new NeuroFuzzyPID(...)` when no `student` is given
  **Output Arguments:** `{ student, data, history }` — `student`: the trained (or continued-training) `NeuroFuzzyPID`; `data`: the sampled `{x: [e, ec], y: [Kp, Ki, Kd]}` training set; `history`: per-epoch RMSE array

---

### Internal Helpers

These are implementation details, not part of the public API, but documented here for maintainers extending the library.

| Function | Description |
|---|---|
| `NeuroFuzzyPID#_core(e, ec, dt)` | Shared backing implementation for `step`/`stepWithEC`: gain scheduling via `gains()`, integral accumulation with a clamp, conditional-integration anti-windup, and output saturation |

---
